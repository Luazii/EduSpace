"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { 
  Send, 
  Search, 
  MoreVertical, 
  User, 
  MessageSquare,
  ArrowLeft,
  Loader2,
  Paperclip
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";

export default function MessagingPage() {
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [messageText, setMessageText] = useState("");
  const conversations = useQuery(api.messages.listConversations);
  const messages = useQuery(api.messages.getMessages, { 
    conversationId: selectedConversation?._id 
  });
  const sendMessage = useMutation(api.messages.sendMessage);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedConversation) return;

    await sendMessage({
      conversationId: selectedConversation._id,
      body: messageText
    });
    setMessageText("");
  };

  if (conversations === undefined) {
    return (
      <div className="flex h-[calc(100vh-80px)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
      </div>
    );
  }

  return (
    <main className="mx-auto flex h-[calc(100vh-100px)] w-full max-w-7xl flex-row gap-6 px-6 py-6 sm:px-10">
      {/* Sidebar: Conversation List */}
      <aside className={`flex w-full flex-col overflow-hidden rounded-4xl border border-slate-200 bg-white shadow-sm md:w-80 lg:w-96 ${selectedConversation ? "hidden md:flex" : "flex"}`}>
        <header className="border-b border-slate-100 px-6 py-6 font-bold text-slate-950">
          <div className="flex items-center justify-between">
            <h2 className="text-xl">Messages</h2>
            <button className="rounded-xl p-2 hover:bg-slate-50 transition">
              <MessageSquare className="h-5 w-5 text-slate-500" />
            </button>
          </div>
          <div className="relative mt-6">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search conversations..." 
              className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 py-3 pl-11 pr-4 text-sm focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-500/10"
            />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
          {conversations.map((conv) => (
            <button 
              key={conv._id}
              onClick={() => setSelectedConversation(conv)}
              className={`flex w-full items-center gap-4 px-6 py-5 transition hover:bg-slate-50/50 ${selectedConversation?._id === conv._id ? "bg-sky-50/30 ring-inset ring-l-4 ring-sky-600" : ""}`}
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-lg font-bold text-slate-600">
                {conv.otherParticipant?.fullName?.[0] || conv.otherParticipant?.email[0].toUpperCase() || "?"}
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-slate-950 truncate">{conv.otherParticipant?.fullName || "Private Channel"}</p>
                  {conv.lastMessage && (
                    <span className="text-[10px] whitespace-nowrap text-slate-400">
                      {format(conv.lastMessage.createdAt, "HH:mm")}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-500 truncate line-clamp-1">
                  {conv.lastMessage?.body || "Start a conversation..."}
                </p>
              </div>
            </button>
          ))}
          {conversations.length === 0 && (
            <div className="px-6 py-12 text-center">
              <MessageSquare className="mx-auto h-8 w-8 text-slate-200 mb-3" />
              <p className="text-sm font-medium text-slate-500">No conversations found.</p>
            </div>
          )}
        </div>
      </aside>

      {/* Main Chat Area */}
      <section className={`flex-1 flex-col overflow-hidden rounded-4xl border border-slate-200 bg-white shadow-sm ${selectedConversation ? "flex" : "hidden md:flex"}`}>
        {selectedConversation ? (
          <>
            <header className="flex h-20 items-center justify-between border-b border-slate-100 px-8">
              <div className="flex items-center gap-4">
                <button className="md:hidden" onClick={() => setSelectedConversation(null)}>
                  <ArrowLeft className="h-5 w-5 text-slate-500" />
                </button>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-50 text-sky-600">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-950 truncate max-w-[200px] lg:max-w-none">
                    {selectedConversation.otherParticipant?.fullName || "Private Channel"}
                  </h3>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Online</span>
                  </div>
                </div>
              </div>
              <button className="rounded-xl p-2 hover:bg-slate-50 transition text-slate-400 grayscale hover:grayscale-0">
                <MoreVertical className="h-5 w-5" />
              </button>
            </header>

            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto bg-slate-50/20 p-8 space-y-6"
            >
              {messages?.map((msg) => (
                <div 
                  key={msg._id}
                  className={`flex ${msg.senderId === selectedConversation.participantIds.find((id: any) => id !== selectedConversation.otherParticipant?._id) ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[80%] rounded-3xl px-6 py-4 shadow-sm ${msg.senderId === selectedConversation.participantIds.find((id: any) => id !== selectedConversation.otherParticipant?._id) ? "bg-sky-600 text-white rounded-br-none" : "bg-white text-slate-900 border border-slate-100 rounded-bl-none"}`}>
                    <p className="text-sm leading-relaxed">{msg.body}</p>
                    <p className={`mt-2 text-[10px] font-medium ${msg.senderId === selectedConversation.otherParticipant?._id ? "text-slate-400" : "text-sky-100"}`}>
                      {format(msg.createdAt, "PPP p")}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <footer className="border-t border-slate-100 p-6">
              <form onSubmit={handleSend} className="flex items-center gap-4">
                <button type="button" className="rounded-xl p-3 text-slate-400 hover:bg-slate-50 transition">
                  <Paperclip className="h-5 w-5" />
                </button>
                <input 
                  type="text" 
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type a message..." 
                  className="flex-1 rounded-2xl border border-slate-100 bg-slate-50/50 py-4 px-6 text-sm focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-500/10"
                />
                <button 
                  type="submit"
                  disabled={!messageText.trim()}
                  className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-600 text-white shadow-lg shadow-sky-600/20 transition hover:bg-sky-700 disabled:opacity-50 disabled:grayscale"
                >
                  <Send className="h-5 w-5" />
                </button>
              </form>
            </footer>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center p-12 text-center opacity-60">
            <div className="flex h-20 w-20 items-center justify-center rounded-4xl bg-slate-50 text-slate-300 mb-6 border-2 border-dashed border-slate-200">
              <MessageSquare className="h-10 w-10" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">No Conversation Selected</h3>
            <p className="mt-2 text-sm text-slate-500 max-w-sm">
              Select a participant from the sidebar to start a real-time academic discussion.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
