import { v } from "convex/values";
import { mutation, query, type QueryCtx, type MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

async function getCurrentUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Must be signed in.");
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
    .first();
  if (!user) throw new Error("No user record found.");
  return user;
}

async function requireWarehouseAdmin(ctx: QueryCtx | MutationCtx) {
  const user = await getCurrentUser(ctx);
  if (user.role !== "warehouse_admin" && user.role !== "admin") {
    throw new Error("Unauthorized: Warehouse access required.");
  }
  return user;
}

// ── Items ─────────────────────────────────────────────────────────────────

export const listItems = query({
  args: { includeInactive: v.optional(v.boolean()) },
  handler: async (ctx) => {
    await requireWarehouseAdmin(ctx);
    const items = await ctx.db.query("inventoryItems").collect();
    return items
      .filter((item) => item.isActive)
      .map((item) => ({
        ...item,
        isLowStock: item.quantityOnHand <= (item.reorderLevel ?? 0),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const createItem = mutation({
  args: {
    name: v.string(),
    category: v.optional(v.string()),
    sku: v.optional(v.string()),
    unit: v.optional(v.string()),
    reorderLevel: v.optional(v.number()),
    initialQuantity: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireWarehouseAdmin(ctx);
    const now = Date.now();
    const initialQuantity = args.initialQuantity ?? 0;

    const itemId = await ctx.db.insert("inventoryItems", {
      name: args.name.trim(),
      category: args.category?.trim() || undefined,
      sku: args.sku?.trim() || undefined,
      unit: args.unit?.trim() || undefined,
      quantityOnHand: initialQuantity,
      reorderLevel: args.reorderLevel,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    if (initialQuantity > 0) {
      await ctx.db.insert("inventoryTransactions", {
        itemId,
        type: "receive",
        quantityDelta: initialQuantity,
        performedByUserId: user._id,
        note: "Initial stock",
        createdAt: now,
      });
    }

    return itemId;
  },
});

export const updateItem = mutation({
  args: {
    itemId: v.id("inventoryItems"),
    name: v.optional(v.string()),
    category: v.optional(v.string()),
    sku: v.optional(v.string()),
    unit: v.optional(v.string()),
    reorderLevel: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireWarehouseAdmin(ctx);
    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error("Item not found.");

    await ctx.db.patch(args.itemId, {
      name: args.name?.trim(),
      category: args.category?.trim(),
      sku: args.sku?.trim(),
      unit: args.unit?.trim(),
      reorderLevel: args.reorderLevel,
      isActive: args.isActive,
      updatedAt: Date.now(),
    });

    return args.itemId;
  },
});

// ── Stock movements ──────────────────────────────────────────────────────

export const receiveStock = mutation({
  args: {
    itemId: v.id("inventoryItems"),
    quantity: v.number(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireWarehouseAdmin(ctx);
    if (args.quantity <= 0) throw new Error("Quantity must be positive.");

    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error("Item not found.");

    const now = Date.now();
    await ctx.db.patch(args.itemId, {
      quantityOnHand: item.quantityOnHand + args.quantity,
      updatedAt: now,
    });

    await ctx.db.insert("inventoryTransactions", {
      itemId: args.itemId,
      type: "receive",
      quantityDelta: args.quantity,
      performedByUserId: user._id,
      note: args.note?.trim() || undefined,
      createdAt: now,
    });
  },
});

export const issueItem = mutation({
  args: {
    itemId: v.id("inventoryItems"),
    quantity: v.number(),
    issuedToLabel: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireWarehouseAdmin(ctx);
    if (args.quantity <= 0) throw new Error("Quantity must be positive.");

    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error("Item not found.");
    if (item.quantityOnHand < args.quantity) {
      throw new Error(`Not enough stock — only ${item.quantityOnHand} on hand.`);
    }

    const now = Date.now();
    await ctx.db.patch(args.itemId, {
      quantityOnHand: item.quantityOnHand - args.quantity,
      updatedAt: now,
    });

    await ctx.db.insert("inventoryTransactions", {
      itemId: args.itemId,
      type: "issue",
      quantityDelta: -args.quantity,
      issuedToLabel: args.issuedToLabel?.trim() || undefined,
      performedByUserId: user._id,
      note: args.note?.trim() || undefined,
      createdAt: now,
    });
  },
});

export const adjustStock = mutation({
  args: {
    itemId: v.id("inventoryItems"),
    newQuantity: v.number(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireWarehouseAdmin(ctx);
    if (args.newQuantity < 0) throw new Error("Quantity cannot be negative.");

    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error("Item not found.");

    const delta = args.newQuantity - item.quantityOnHand;
    const now = Date.now();

    await ctx.db.patch(args.itemId, {
      quantityOnHand: args.newQuantity,
      updatedAt: now,
    });

    if (delta !== 0) {
      await ctx.db.insert("inventoryTransactions", {
        itemId: args.itemId,
        type: "adjust",
        quantityDelta: delta,
        performedByUserId: user._id,
        note: args.note?.trim() || "Stocktake adjustment",
        createdAt: now,
      });
    }
  },
});

// ── History ───────────────────────────────────────────────────────────────

export const listTransactions = query({
  args: { itemId: v.optional(v.id("inventoryItems")) },
  handler: async (ctx, args) => {
    await requireWarehouseAdmin(ctx);

    const transactions = args.itemId
      ? await ctx.db
          .query("inventoryTransactions")
          .withIndex("by_item", (q) => q.eq("itemId", args.itemId as Id<"inventoryItems">))
          .collect()
      : await ctx.db.query("inventoryTransactions").collect();

    const sorted = transactions.sort((a, b) => b.createdAt - a.createdAt).slice(0, 50);

    return Promise.all(
      sorted.map(async (txn) => {
        const item = await ctx.db.get(txn.itemId);
        const performer = await ctx.db.get(txn.performedByUserId);
        return {
          ...txn,
          itemName: item?.name ?? "Unknown item",
          performedByName: performer?.fullName ?? performer?.email ?? "Unknown",
        };
      }),
    );
  },
});
