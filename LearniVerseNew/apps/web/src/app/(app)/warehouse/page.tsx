"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useState } from "react";
import {
  Package, Plus, ArrowDownToLine, ArrowUpFromLine, History,
  Shield, AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";

type Tab = "inventory" | "history";
type ModalKind = "add" | "receive" | "issue" | null;

export default function WarehousePage() {
  const user = useQuery(api.users.current);
  const isWarehouseAdmin = user?.role === "warehouse_admin" || user?.role === "admin";

  // These queries hard-throw for the wrong role, so they must stay skipped
  // until we know the user is actually allowed to run them.
  const items = useQuery(api.warehouse.listItems, isWarehouseAdmin ? {} : "skip");
  const transactions = useQuery(api.warehouse.listTransactions, isWarehouseAdmin ? {} : "skip");

  const createItem = useMutation(api.warehouse.createItem);
  const receiveStock = useMutation(api.warehouse.receiveStock);
  const issueItem = useMutation(api.warehouse.issueItem);

  const [tab, setTab] = useState<Tab>("inventory");
  const [modal, setModal] = useState<ModalKind>(null);
  const [activeItemId, setActiveItemId] = useState<Id<"inventoryItems"> | null>(null);
  const [saving, setSaving] = useState(false);

  const [addForm, setAddForm] = useState({ name: "", category: "", sku: "", unit: "", reorderLevel: "", initialQuantity: "" });
  const [moveForm, setMoveForm] = useState({ quantity: "", note: "", issuedToLabel: "" });

  // Loading state — items/transactions are only ever undefined-while-loading
  // for a warehouse admin; for everyone else they're intentionally skipped.
  if (user === undefined || (isWarehouseAdmin && (items === undefined || transactions === undefined))) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-600 border-t-transparent" />
      </div>
    );
  }

  if (!isWarehouseAdmin) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-6 py-14">
        <Shield className="h-16 w-16 text-slate-300 mb-4" />
        <h2 className="text-2xl font-black text-slate-950">Access Restricted</h2>
        <p className="mt-2 text-sm text-slate-500">This portal is for warehouse administrators only.</p>
      </main>
    );
  }

  const activeItem = (items ?? []).find((i) => i._id === activeItemId);

  const closeModal = () => {
    setModal(null);
    setActiveItemId(null);
    setAddForm({ name: "", category: "", sku: "", unit: "", reorderLevel: "", initialQuantity: "" });
    setMoveForm({ quantity: "", note: "", issuedToLabel: "" });
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name.trim()) return;
    setSaving(true);
    try {
      await createItem({
        name: addForm.name.trim(),
        category: addForm.category.trim() || undefined,
        sku: addForm.sku.trim() || undefined,
        unit: addForm.unit.trim() || undefined,
        reorderLevel: addForm.reorderLevel ? Number(addForm.reorderLevel) : undefined,
        initialQuantity: addForm.initialQuantity ? Number(addForm.initialQuantity) : undefined,
      });
      closeModal();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add item.");
    } finally {
      setSaving(false);
    }
  };

  const handleReceive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeItemId || !moveForm.quantity) return;
    setSaving(true);
    try {
      await receiveStock({ itemId: activeItemId, quantity: Number(moveForm.quantity), note: moveForm.note.trim() || undefined });
      closeModal();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to receive stock.");
    } finally {
      setSaving(false);
    }
  };

  const handleIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeItemId || !moveForm.quantity) return;
    setSaving(true);
    try {
      await issueItem({
        itemId: activeItemId,
        quantity: Number(moveForm.quantity),
        issuedToLabel: moveForm.issuedToLabel.trim() || undefined,
        note: moveForm.note.trim() || undefined,
      });
      closeModal();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to issue stock.");
    } finally {
      setSaving(false);
    }
  };

  const lowStockCount = (items ?? []).filter((i) => i.isLowStock).length;

  const tabs: { key: Tab; label: string; icon: React.ElementType; badge?: number }[] = [
    { key: "inventory", label: "Inventory", icon: Package, badge: lowStockCount || undefined },
    { key: "history", label: "History", icon: History },
  ];

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-10 sm:px-10">
      <header className="mb-8 border-b border-slate-100 pb-8">
        <div className="flex items-center gap-3 mb-4">
          <span className="rounded-full bg-amber-600 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white">Warehouse</span>
        </div>
        <h1 className="text-4xl font-black tracking-tight text-slate-950">Inventory & Supplies</h1>
        <p className="mt-2 text-sm text-slate-500">Track stock levels, receive new deliveries, and issue supplies out.</p>
      </header>

      <div className="mb-8 flex flex-wrap gap-1 rounded-2xl bg-slate-100 p-1">
        {tabs.map(({ key, label, icon: Icon, badge }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${tab === key ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
            {!!badge && (
              <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[9px] font-black text-white">{badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* Inventory */}
      {tab === "inventory" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-950 flex items-center gap-2">
              <Package className="h-5 w-5 text-amber-600" /> Stock on Hand
            </h2>
            <button
              onClick={() => setModal("add")}
              className="flex items-center gap-1.5 rounded-2xl bg-slate-950 px-4 py-2 text-xs font-black text-white hover:bg-slate-800"
            >
              <Plus className="h-3.5 w-3.5" /> Add Item
            </button>
          </div>

          {(items ?? []).length === 0 ? (
            <div className="flex flex-col items-center rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 p-16 text-center">
              <Package className="mb-4 h-12 w-12 text-slate-300" />
              <p className="font-bold text-slate-500">No inventory items yet.</p>
            </div>
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden">
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 bg-slate-50 px-6 py-3 text-xs font-bold uppercase tracking-widest text-slate-500">
                <span>Item</span>
                <span>Category</span>
                <span>On Hand</span>
                <span>Actions</span>
              </div>
              {(items ?? []).map((item) => (
                <div key={item._id} className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center border-t border-slate-100 px-6 py-3.5">
                  <div>
                    <p className="text-sm font-bold text-slate-800">{item.name}</p>
                    {item.sku && <p className="text-[10px] text-slate-400">{item.sku}</p>}
                  </div>
                  <span className="text-xs text-slate-500">{item.category ?? "—"}</span>
                  <span className={`flex items-center gap-1.5 text-sm font-black ${item.isLowStock ? "text-rose-600" : "text-slate-800"}`}>
                    {item.isLowStock && <AlertTriangle className="h-3.5 w-3.5" />}
                    {item.quantityOnHand} {item.unit ?? ""}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setActiveItemId(item._id); setModal("receive"); }}
                      title="Receive stock"
                      className="rounded-xl bg-emerald-50 p-2 text-emerald-700 hover:bg-emerald-100"
                    >
                      <ArrowDownToLine className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => { setActiveItemId(item._id); setModal("issue"); }}
                      title="Issue stock"
                      className="rounded-xl bg-sky-50 p-2 text-sky-700 hover:bg-sky-100"
                    >
                      <ArrowUpFromLine className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* History */}
      {tab === "history" && (
        <div className="space-y-4">
          <h2 className="text-xl font-black text-slate-950 flex items-center gap-2">
            <History className="h-5 w-5 text-slate-600" /> Recent Activity
          </h2>
          {(transactions ?? []).length === 0 ? (
            <p className="text-sm text-slate-500 italic">No stock movements yet.</p>
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden">
              <div className="grid grid-cols-[auto_1fr_auto_1fr] gap-4 bg-slate-50 px-6 py-3 text-xs font-bold uppercase tracking-widest text-slate-500">
                <span>Type</span>
                <span>Item</span>
                <span>Qty</span>
                <span>Details</span>
              </div>
              {(transactions ?? []).map((txn) => (
                <div key={txn._id} className="grid grid-cols-[auto_1fr_auto_1fr] gap-4 items-center border-t border-slate-100 px-6 py-3">
                  <span className={`text-[10px] font-black uppercase ${txn.type === "receive" ? "text-emerald-600" : txn.type === "issue" ? "text-sky-600" : "text-slate-500"}`}>
                    {txn.type}
                  </span>
                  <span className="text-sm font-bold text-slate-800">{txn.itemName}</span>
                  <span className={`text-sm font-black ${txn.quantityDelta > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {txn.quantityDelta > 0 ? "+" : ""}{txn.quantityDelta}
                  </span>
                  <span className="text-xs text-slate-500">
                    {txn.issuedToLabel ? `→ ${txn.issuedToLabel} · ` : ""}
                    {txn.performedByName} · {format(txn.createdAt, "MMM d, p")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add item modal */}
      {modal === "add" && (
        <Modal title="Add Inventory Item" onClose={closeModal}>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Name *</label>
              <input autoFocus value={addForm.name} onChange={(e) => setAddForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Grade 8 Maths Textbook" className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:border-amber-500 focus:outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600">Category</label>
                <input value={addForm.category} onChange={(e) => setAddForm((p) => ({ ...p, category: e.target.value }))} placeholder="e.g. Textbook" className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:border-amber-500 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600">SKU</label>
                <input value={addForm.sku} onChange={(e) => setAddForm((p) => ({ ...p, sku: e.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:border-amber-500 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600">Unit</label>
                <input value={addForm.unit} onChange={(e) => setAddForm((p) => ({ ...p, unit: e.target.value }))} placeholder="e.g. pcs" className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:border-amber-500 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600">Reorder Level</label>
                <input type="number" value={addForm.reorderLevel} onChange={(e) => setAddForm((p) => ({ ...p, reorderLevel: e.target.value }))} placeholder="e.g. 10" className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:border-amber-500 focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Initial Quantity</label>
              <input type="number" value={addForm.initialQuantity} onChange={(e) => setAddForm((p) => ({ ...p, initialQuantity: e.target.value }))} placeholder="e.g. 50" className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:border-amber-500 focus:outline-none" />
            </div>
            <button type="submit" disabled={saving || !addForm.name.trim()} className="w-full rounded-2xl bg-slate-950 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-50">
              {saving ? "Adding…" : "Add Item"}
            </button>
          </form>
        </Modal>
      )}

      {/* Receive stock modal */}
      {modal === "receive" && activeItem && (
        <Modal title={`Receive Stock — ${activeItem.name}`} onClose={closeModal}>
          <form onSubmit={handleReceive} className="space-y-4">
            <p className="text-xs text-slate-500">Currently {activeItem.quantityOnHand} {activeItem.unit ?? ""} on hand.</p>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Quantity Received *</label>
              <input autoFocus type="number" min={1} value={moveForm.quantity} onChange={(e) => setMoveForm((p) => ({ ...p, quantity: e.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Note</label>
              <input value={moveForm.note} onChange={(e) => setMoveForm((p) => ({ ...p, note: e.target.value }))} placeholder="e.g. PO #1234 delivery" className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none" />
            </div>
            <button type="submit" disabled={saving || !moveForm.quantity} className="w-full rounded-2xl bg-emerald-600 py-3 text-sm font-black text-white transition hover:bg-emerald-700 disabled:opacity-50">
              {saving ? "Saving…" : "Receive Stock"}
            </button>
          </form>
        </Modal>
      )}

      {/* Issue stock modal */}
      {modal === "issue" && activeItem && (
        <Modal title={`Issue Stock — ${activeItem.name}`} onClose={closeModal}>
          <form onSubmit={handleIssue} className="space-y-4">
            <p className="text-xs text-slate-500">Currently {activeItem.quantityOnHand} {activeItem.unit ?? ""} on hand.</p>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Quantity to Issue *</label>
              <input autoFocus type="number" min={1} max={activeItem.quantityOnHand} value={moveForm.quantity} onChange={(e) => setMoveForm((p) => ({ ...p, quantity: e.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Issued To</label>
              <input value={moveForm.issuedToLabel} onChange={(e) => setMoveForm((p) => ({ ...p, issuedToLabel: e.target.value }))} placeholder="e.g. Grade 10A / Coach John" className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Note</label>
              <input value={moveForm.note} onChange={(e) => setMoveForm((p) => ({ ...p, note: e.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none" />
            </div>
            <button type="submit" disabled={saving || !moveForm.quantity} className="w-full rounded-2xl bg-sky-600 py-3 text-sm font-black text-white transition hover:bg-sky-700 disabled:opacity-50">
              {saving ? "Saving…" : "Issue Stock"}
            </button>
          </form>
        </Modal>
      )}
    </main>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-6" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-4 text-lg font-black text-slate-950">{title}</h3>
        {children}
      </div>
    </div>
  );
}
