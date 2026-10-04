// app/dashboard/chat/page.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Send, Loader2, MessageSquare } from 'lucide-react';

type Senior = { id: string; first_name: string; last_name: string };
type Message = { id: string; sender_id: string; receiver_id: string; content: string; created_at: string };

export default function ChatPage() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [seniors, setSeniors] = useState<Senior[]>([]);
  const[selectedSenior, setSelectedSenior] = useState<Senior | null>(null);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const[isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Initialize and fetch contacts
  useEffect(() => {
    const initChat = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      // Find out who is logging in
      const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
      
      if (profile?.role === 'CAREGIVER') {
        // Fetch assigned seniors
        const { data: relations } = await supabase.from('caregiver_senior').select('senior_id').eq('caregiver_id', user.id);
        if (relations && relations.length > 0) {
          const seniorIds = relations.map(r => r.senior_id);
          const { data: users } = await supabase.from('users').select('id, first_name, last_name').in('id', seniorIds);
          if (users) setSeniors(users); // We reuse the 'seniors' state for contacts
        }
      } else if (profile?.role === 'SENIOR') {
        // Fetch assigned caregivers
        const { data: relations } = await supabase.from('caregiver_senior').select('caregiver_id').eq('senior_id', user.id);
        if (relations && relations.length > 0) {
          const caregiverIds = relations.map(r => r.caregiver_id);
          const { data: users } = await supabase.from('users').select('id, first_name, last_name').in('id', caregiverIds);
          if (users) setSeniors(users); // We reuse the 'seniors' state for contacts
        }
      }
      setIsLoading(false);
    };
    initChat();
  },[]);


  // Auto-scroll to bottom of chat
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, []);

  // 2. Fetch messages when a senior is selected & Subscribe to real-time
  useEffect(() => {
    if (!selectedSenior || !currentUserId) return;

    let active = true;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${selectedSenior.id}),and(sender_id.eq.${selectedSenior.id},receiver_id.eq.${currentUserId})`)
        .order('created_at', { ascending: true });

      if (!active) return;
      if (data) {
        // Merge the fetched history with messages that may already have arrived
        // through realtime while this query was in flight. Replacing state here
        // can otherwise erase a just-received realtime message.
        setMessages((current) => {
          const byId = new Map<string, Message>();
          for (const message of data as Message[]) byId.set(message.id, message);
          for (const message of current) byId.set(message.id, message);
          return Array.from(byId.values()).sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
          );
        });
      }
      scrollToBottom();
    };

    // Subscribe first. Once Supabase confirms the realtime channel is ready,
    // fetch the full conversation. This closes the small window where a message
    // could be committed after an initial fetch but before the subscription was live.
    const channel = supabase
      .channel(`chat-${currentUserId}-${selectedSenior.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMsg = payload.new as Message;
          if (
            (newMsg.sender_id === currentUserId && newMsg.receiver_id === selectedSenior.id) ||
            (newMsg.sender_id === selectedSenior.id && newMsg.receiver_id === currentUserId)
          ) {
            setMessages((prev) =>
              prev.some((message) => message.id === newMsg.id)
                ? prev
                : [...prev, newMsg],
            );
            scrollToBottom();
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          void fetchMessages();
        }
      });

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [selectedSenior, currentUserId, scrollToBottom]);

  // 3. Send a message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedSenior || !currentUserId) return;

    setIsSending(true);
    const { error } = await supabase.from('messages').insert({
      sender_id: currentUserId,
      receiver_id: selectedSenior.id,
      content: newMessage.trim(),
    });

    if (!error) {
      setNewMessage('');
    }
    setIsSending(false);
  };

  if (isLoading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-[#462775]" /></div>;

  return (
    <div className="h-[calc(100vh-120px)] bg-white rounded-2xl shadow-sm border border-slate-200 flex overflow-hidden">
      
      {/* Left Sidebar - Contacts */}
      <div className="w-1/3 border-r border-slate-200 flex flex-col bg-slate-50">
        <div className="p-4 border-b border-slate-200 bg-white">
          <h2 className="font-bold text-slate-900">Messages</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {seniors.length === 0 ? (
            <p className="text-sm text-slate-500 text-center p-4">No seniors assigned yet.</p>
          ) : (
            seniors.map((senior) => (
              <button
                key={senior.id}
                onClick={() => setSelectedSenior(senior)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left ${
                  selectedSenior?.id === senior.id 
                    ? 'bg-[#462775] text-white shadow-md' 
                    : 'hover:bg-slate-200 text-slate-700'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  selectedSenior?.id === senior.id ? 'bg-white/20' : 'bg-white text-slate-400'
                }`}>
                  {senior.first_name[0]}
                </div>
                <span className="font-medium">{senior.first_name} {senior.last_name}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right Side - Chat Window */}
      <div className="w-2/3 flex flex-col bg-white">
        {!selectedSenior ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <MessageSquare className="h-16 w-16 mb-4 opacity-20" />
            <p>Select a senior to start chatting</p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-slate-200 flex items-center gap-3 bg-white shadow-sm z-10">
              <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-[#462775] font-bold">
                {selectedSenior.first_name[0]}
              </div>
              <div>
                <h3 className="font-bold text-slate-900">{selectedSenior.first_name} {selectedSenior.last_name}</h3>
                <span className="text-xs text-emerald-500 font-medium flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span> Online
                </span>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
              {messages.length === 0 ? (
                <div className="text-center text-slate-400 text-sm mt-10">
                  This is the beginning of your conversation with {selectedSenior.first_name}.
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.sender_id === currentUserId;
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] p-3 rounded-2xl text-sm ${
                        isMe 
                          ? 'bg-[#462775] text-white rounded-br-none shadow-md' 
                          : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-sm'
                      }`}>
                        {msg.content}
                        <div className={`text-[10px] mt-1 text-right ${isMe ? 'text-purple-200' : 'text-slate-400'}`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-slate-200">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={`Message ${selectedSenior.first_name}...`}
                  className="flex-1 bg-slate-100 border-transparent focus:bg-white focus:border-[#462775] focus:ring-2 focus:ring-[#462775] rounded-xl px-4 py-3 text-sm transition-all"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || isSending}
                  className="bg-[#462775] text-white p-3 rounded-xl hover:bg-[#3a2060] transition-colors disabled:opacity-50 flex items-center justify-center w-12 h-12"
                >
                  {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5 ml-1" />}
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
