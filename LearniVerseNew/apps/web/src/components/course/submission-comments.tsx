"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import type { Id } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";
import { format } from "date-fns";
import { MessageSquare, CornerDownRight, Pencil, Trash2, Send } from "lucide-react";

type SubmissionCommentsProps = {
  submissionId: Id<"submissions">;
};

export function SubmissionComments({ submissionId }: SubmissionCommentsProps) {
  const comments = useQuery(api.submissionComments.list, { submissionId });
  const addComment = useMutation(api.submissionComments.add);
  const editComment = useMutation(api.submissionComments.edit);
  const removeComment = useMutation(api.submissionComments.remove);
  const currentUser = useQuery(api.users.current);

  const [newBody, setNewBody] = useState("");
  const [replyingTo, setReplyingTo] = useState<Id<"submissionComments"> | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [editingId, setEditingId] = useState<Id<"submissionComments"> | null>(null);
  const [editBody, setEditBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const topLevel = (comments ?? []).filter((c) => !c.parentCommentId);
  const replies = (comments ?? []).filter((c) => !!c.parentCommentId);

  async function handleAdd(parentId?: Id<"submissionComments">) {
    const body = parentId ? replyBody : newBody;
    if (!body.trim()) return;
    setSubmitting(true);
    try {
      await addComment({ submissionId, body: body.trim(), parentCommentId: parentId });
      if (parentId) {
        setReplyBody("");
        setReplyingTo(null);
      } else {
        setNewBody("");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEdit(commentId: Id<"submissionComments">) {
    if (!editBody.trim()) return;
    await editComment({ commentId, body: editBody.trim() });
    setEditingId(null);
    setEditBody("");
  }

  return (
    <div className="mt-6 space-y-4">
      <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
        <MessageSquare className="h-3.5 w-3.5" />
        Feedback Thread ({comments?.length ?? 0})
      </h4>

      {/* Top-level comments */}
      {topLevel.length === 0 && !submitting && (
        <p className="text-xs text-slate-400 italic">No comments yet.</p>
      )}

      {topLevel.map((comment) => {
        const threadReplies = replies.filter(
          (r) => String(r.parentCommentId) === String(comment._id),
        );
        const isOwn = comment.authorId === currentUser?._id;

        return (
          <div key={comment._id} className="space-y-2">
            {/* Comment */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-black text-slate-700">
                      {comment.author?.fullName ?? comment.author?.email ?? "Unknown"}
                    </span>
                    <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[9px] font-black uppercase text-slate-500">
                      {comment.author?.role}
                    </span>
                    {comment.lineRef && (
                      <span className="rounded-full bg-[#7c4dff]/10 px-1.5 py-0.5 text-[9px] font-black text-[#7c4dff]">
                        {comment.lineRef}
                      </span>
                    )}
                    {comment.isEdited && (
                      <span className="text-[9px] text-slate-400 italic">edited</span>
                    )}
                  </div>

                  {editingId === comment._id ? (
                    <div className="flex gap-2">
                      <textarea
                        rows={2}
                        className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-slate-950 resize-none"
                        value={editBody}
                        onChange={(e) => setEditBody(e.target.value)}
                      />
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => void handleEdit(comment._id)}
                          className="rounded-xl bg-slate-950 px-3 py-1.5 text-[10px] font-bold text-white hover:bg-slate-800 transition"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="rounded-xl border border-slate-200 px-3 py-1.5 text-[10px] font-bold text-slate-500 hover:bg-slate-100 transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs leading-relaxed text-slate-700">{comment.body}</p>
                  )}

                  <p className="mt-1.5 text-[9px] text-slate-400">
                    {format(comment.createdAt, "MMM d, p")}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => {
                      setReplyingTo(comment._id);
                      setReplyBody("");
                    }}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
                    title="Reply"
                  >
                    <CornerDownRight className="h-3 w-3" />
                  </button>
                  {isOwn && (
                    <>
                      <button
                        onClick={() => {
                          setEditingId(comment._id);
                          setEditBody(comment.body);
                        }}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
                        title="Edit"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => void removeComment({ commentId: comment._id })}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-100 hover:text-rose-600 transition"
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Replies */}
            {threadReplies.length > 0 && (
              <div className="ml-6 space-y-2">
                {threadReplies.map((reply) => (
                  <div
                    key={reply._id}
                    className="rounded-xl border border-slate-100 bg-white p-3"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-black text-slate-700">
                        {reply.author?.fullName ?? reply.author?.email}
                      </span>
                      <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[9px] font-black uppercase text-slate-500">
                        {reply.author?.role}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed text-slate-600">{reply.body}</p>
                    <p className="mt-1 text-[9px] text-slate-400">
                      {format(reply.createdAt, "MMM d, p")}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Reply input */}
            {replyingTo === comment._id && (
              <div className="ml-6 flex gap-2">
                <textarea
                  rows={2}
                  autoFocus
                  placeholder="Write a reply…"
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-slate-950 resize-none"
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                />
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => void handleAdd(comment._id)}
                    disabled={submitting || !replyBody.trim()}
                    className="rounded-xl bg-slate-950 px-3 py-1.5 text-[10px] font-bold text-white hover:bg-slate-800 transition disabled:opacity-50"
                  >
                    <Send className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => setReplyingTo(null)}
                    className="rounded-xl border border-slate-200 px-3 py-1.5 text-[10px] font-bold text-slate-500 hover:bg-slate-100 transition"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* New top-level comment */}
      <div className="flex gap-2 pt-2">
        <textarea
          rows={2}
          placeholder="Leave feedback or ask a question…"
          className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-slate-950 focus:bg-white resize-none transition"
          value={newBody}
          onChange={(e) => setNewBody(e.target.value)}
        />
        <button
          onClick={() => void handleAdd()}
          disabled={submitting || !newBody.trim()}
          className="self-end rounded-xl bg-slate-950 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition disabled:opacity-50"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
