'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Store, Send, MessagesSquare, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { ChatRoom, ChatMessage } from '@/types/api';
import { pageFrom, PagedResponse } from '@/lib/page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { useChatSubscription } from '@/hooks/use-chat';
import { useAuthStore } from '@/stores/auth.store';
import { formatRelative, cn } from '@/lib/utils';

function ChatContent() {
  const router = useRouter();
  const params = useSearchParams();
  const activeRoomId = params.get('roomId');

  const { data: rooms, isLoading: roomsLoading } = useQuery({
    queryKey: ['chat-rooms'],
    queryFn: async () => {
      const { data } = await api.get<{ data: ChatRoom[] }>('/api/chat/rooms?page=0&size=20');
      return data.data;
    },
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="text-lg font-semibold text-foreground mb-4">Tin nhắn</h1>
      <div className="grid md:grid-cols-[280px_1fr] gap-4 h-[70vh]">
        {/* Room list */}
        <div className="rounded-xl border border-white/8 bg-card overflow-y-auto">
          {roomsLoading ? (
            <div className="p-3 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full bg-white/5" />)}</div>
          ) : !rooms || rooms.length === 0 ? (
            <EmptyState icon={MessagesSquare} title="Chưa có cuộc trò chuyện" />
          ) : (
            <div className="divide-y divide-white/6">
              {rooms.map((r) => (
                <button key={r.id} onClick={() => router.push(`/chat?roomId=${r.id}`)}
                  className={cn('flex w-full items-center gap-3 p-3 text-left transition-colors',
                    activeRoomId === r.id ? 'bg-primary/10' : 'hover:bg-white/3')}>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <Store className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-1">{r.shopName}</p>
                    {r.lastMessageContent && <p className="text-xs text-muted-foreground line-clamp-1">{r.lastMessageContent}</p>}
                  </div>
                  {r.unreadCount > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">{r.unreadCount}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Active room */}
        <div className="rounded-xl border border-white/8 bg-card overflow-hidden flex flex-col">
          {activeRoomId ? (
            <ChatRoomView key={activeRoomId} roomId={activeRoomId} shopName={rooms?.find((r) => r.id === activeRoomId)?.shopName} />
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">Chọn một cuộc trò chuyện</div>
          )}
        </div>
      </div>
    </div>
  );
}

function ChatRoomView({ roomId, shopName }: { roomId: string; shopName?: string }) {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: history, isLoading } = useQuery({
    queryKey: ['chat-messages', roomId],
    queryFn: async () => {
      const { data } = await api.get<{ data: PagedResponse<ChatMessage> }>(`/api/chat/rooms/${roomId}/messages?page=0&size=50`);
      return [...pageFrom(data.data).content].reverse();
    },
  });

  useEffect(() => { if (history) setMessages(history); }, [history]);

  useEffect(() => {
    api.post(`/api/chat/rooms/${roomId}/read`).then(() => {
      qc.invalidateQueries({ queryKey: ['chat-rooms'] });
    }).catch(() => {});
  }, [roomId, qc]);

  useChatSubscription(roomId, (msg) => {
    setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
  });

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function handleSend() {
    const content = input.trim();
    if (!content) return;
    setSending(true);
    try {
      const { data } = await api.post<{ data: ChatMessage }>(`/api/chat/rooms/${roomId}/messages`, { content });
      setInput('');
      setMessages((prev) => prev.some((m) => m.id === data.data.id) ? prev : [...prev, data.data]);
    } catch {
      /* noop */
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <div className="px-4 py-3 border-b border-white/8 text-sm font-medium flex items-center gap-2">
        <Store className="h-4 w-4 text-muted-foreground" /> {shopName ?? 'Cuộc trò chuyện'}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-2/3 bg-white/5" />)}</div>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">Bắt đầu cuộc trò chuyện</p>
        ) : (
          messages.map((m) => {
            const mine = user?.id === m.senderId;
            return (
              <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                <div className={cn('max-w-[75%] rounded-2xl px-3.5 py-2',
                  mine ? 'bg-primary text-primary-foreground' : 'bg-white/8 text-foreground')}>
                  <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>
                  <p className={cn('text-[10px] mt-0.5', mine ? 'text-primary-foreground/70' : 'text-muted-foreground')}>{formatRelative(m.createdAt)}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-white/8 p-3 flex gap-2">
        <Input value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="Nhập tin nhắn..." className="bg-white/5 border-white/10" />
        <Button className="bg-primary shrink-0" disabled={sending || !input.trim()} onClick={handleSend}>
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-5xl px-4 py-10 text-sm text-muted-foreground">Đang tải…</div>}>
      <ChatContent />
    </Suspense>
  );
}
