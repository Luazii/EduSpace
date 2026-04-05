import { v } from "convex/values";
import { mutation, query, type QueryCtx } from "./_generated/server";

async function getCurrentUser(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthorized");
  return await ctx.db
    .query("users")
    .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
    .first();
}

export const listConversations = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const conversations = await ctx.db
      .query("conversations")
      .collect();

    // Filter by participant in-memory (or use an index if needed, but for MVP collecting is okay for small scales)
    const userConversations = conversations.filter(c => c.participantIds.includes(user._id));

    return await Promise.all(
      userConversations.map(async (conv) => {
        const otherParticipantId = conv.participantIds.find(id => id !== user._id);
        const otherParticipant = otherParticipantId ? await ctx.db.get(otherParticipantId) : null;
        const lastMessage = await ctx.db
          .query("messages")
          .withIndex("by_conversation", (q) => q.eq("conversationId", conv._id))
          .order("desc")
          .first();

        return {
          ...conv,
          otherParticipant,
          lastMessage,
        };
      })
    );
  },
});

export const getMessages = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const conversation = await ctx.db.get(args.conversationId);

    if (!conversation || !conversation.participantIds.includes(user?._id as any)) {
      throw new Error("Unauthorized");
    }

    return await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .order("asc")
      .collect();
  },
});

export const sendMessage = mutation({
  args: { 
    conversationId: v.optional(v.id("conversations")),
    recipientId: v.optional(v.id("users")),
    body: v.string() 
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    let conversationId = args.conversationId;

    if (!conversationId && args.recipientId) {
      // Try to find existing conversation
      const existing = await ctx.db
        .query("conversations")
        .collect();
      
      const found = existing.find(c => 
        c.participantIds.includes(user._id) && 
        c.participantIds.includes(args.recipientId as any)
      );

      if (found) {
        conversationId = found._id;
      } else {
        conversationId = await ctx.db.insert("conversations", {
          participantIds: [user._id, args.recipientId],
          updatedAt: Date.now(),
        });
      }
    }

    if (!conversationId) throw new Error("Conversation ID or Recipient required");

    const messageId = await ctx.db.insert("messages", {
      conversationId,
      senderId: user._id,
      body: args.body,
      createdAt: Date.now(),
    });

    await ctx.db.patch(conversationId, { updatedAt: Date.now() });

    return messageId;
  },
});
