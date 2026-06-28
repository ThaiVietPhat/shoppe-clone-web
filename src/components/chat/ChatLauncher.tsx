'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  MessageCircle,
  X,
  ChevronLeft,
  Sparkles,
  Store,
  Send,
  Loader2,
  MessagesSquare,
} from 'lucide-react';
import { api } from '@/lib/api';
import { ChatRoom, ChatMessage, ChatRecommendResponse, RecommendedProductResponse } from '@/types/api';
import { pageFrom, PagedResponse } from '@/lib/page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useChatSubscription } from '@/hooks/use-chat';
import { useAuthStore } from '@/stores/auth.store';
import { formatRelative, formatPrice, formatPriceRange, cn } from '@/lib/utils';

type View =
  | { kind: 'list' }
  | { kind: 'ai' }
  | { kind: 'shop'; roomId: string; shopName?: string };

export function ChatLauncher() {
  const { user, isHydrated } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>({ kind: 'list' });

  // Danh sách phòng chat shop — chia sẻ cache với trang /chat (cùng queryKey).
  const { data: rooms, isLoading: roomsLoading } = useQuery({
    queryKey: ['chat-rooms'],
    queryFn: async () => {
      const { data } = await api.get<{ data: PagedResponse<ChatRoom> }>('/api/chat/rooms?page=0&size=20');
      return pageFrom(data.data).content;
    },
    enabled: isHydrated && !!user,
  });

  // Chỉ hiện khi đã đăng nhập (và đã hydrate xong để tránh nháy).
  if (!isHydrated || !user) return null;

  const totalUnread = rooms?.reduce((sum, r) => sum + r.unreadCount, 0) ?? 0;

  return (
    <>
      {/* Nút nổi */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Trò chuyện"
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-black/40 hover:bg-primary/90 transition-colors"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        {!open && totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-semibold text-white">
            {totalUnread > 99 ? '99+' : totalUnread}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-24 right-5 z-50 flex h-[70vh] max-h-[560px] w-[calc(100vw-2.5rem)] max-w-[380px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-card shadow-2xl shadow-black/50">
          {view.kind === 'list' && (
            <ConversationList
              rooms={rooms}
              loading={roomsLoading}
              onSelectAi={() => setView({ kind: 'ai' })}
              onSelectShop={(roomId, shopName) => setView({ kind: 'shop', roomId, shopName })}
            />
          )}
          {view.kind === 'ai' && <AiConversation onBack={() => setView({ kind: 'list' })} />}
          {view.kind === 'shop' && (
            <ShopConversation
              roomId={view.roomId}
              shopName={view.shopName}
              onBack={() => setView({ kind: 'list' })}
            />
          )}
        </div>
      )}
    </>
  );
}

/* ---------- Danh sách hội thoại ---------- */

function ConversationList({
  rooms,
  loading,
  onSelectAi,
  onSelectShop,
}: {
  rooms: ChatRoom[] | undefined;
  loading: boolean;
  onSelectAi: () => void;
  onSelectShop: (roomId: string, shopName?: string) => void;
}) {
  return (
    <>
      <div className="flex items-center gap-2 border-b border-white/8 px-4 py-3">
        <MessagesSquare className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Tin nhắn</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Trợ lý AI — luôn có */}
        <button
          onClick={onSelectAi}
          className="flex w-full items-center gap-3 border-b border-white/6 p-3 text-left transition-colors hover:bg-white/3"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">Trợ lý AI</p>
            <p className="line-clamp-1 text-xs text-muted-foreground">
              Gợi ý sản phẩm theo nhu cầu của bạn
            </p>
          </div>
        </button>

        {/* Chat với shop */}
        {loading ? (
          <div className="space-y-2 p-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full bg-white/5" />
            ))}
          </div>
        ) : rooms && rooms.length > 0 ? (
          <div className="divide-y divide-white/6">
            {rooms.map((r) => (
              <button
                key={r.roomId}
                onClick={() => onSelectShop(r.roomId, r.shop.shopName)}
                className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-white/3"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/8 text-muted-foreground">
                  <Store className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-medium text-foreground">{r.shop.shopName}</p>
                  {r.lastMessage && (
                    <p className="line-clamp-1 text-xs text-muted-foreground">{r.lastMessage.content}</p>
                  )}
                </div>
                {r.unreadCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">
                    {r.unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        ) : (
          <p className="px-4 py-6 text-center text-xs text-muted-foreground">
            Chưa có cuộc trò chuyện với shop nào.
          </p>
        )}
      </div>
    </>
  );
}

/* ---------- Header dùng chung cho view con ---------- */

function ConversationHeader({
  icon,
  title,
  onBack,
}: {
  icon: React.ReactNode;
  title: string;
  onBack: () => void;
}) {
  return (
    <div className="flex items-center gap-2 border-b border-white/8 px-3 py-3">
      <button
        onClick={onBack}
        aria-label="Quay lại"
        className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      {icon}
      <span className="text-sm font-medium text-foreground">{title}</span>
    </div>
  );
}

/* ---------- Chat với Trợ lý AI ---------- */

interface AiMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  items?: RecommendedProductResponse[];
  degraded?: boolean;
}

function AiConversation({ onBack }: { onBack: () => void }) {
  const [messages, setMessages] = useState<AiMessage[]>([
    {
      id: 'greeting',
      role: 'assistant',
      text: 'Xin chào! Mình là trợ lý mua sắm AI. Bạn đang tìm sản phẩm gì? (vd: "chuột gaming dưới 500k")',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function handleSend() {
    const message = input.trim();
    if (!message || loading) return;

    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'user', text: message }]);
    setInput('');
    setLoading(true);
    try {
      const { data } = await api.post<{ data: ChatRecommendResponse }>('/api/recommendations/chat', {
        message,
      });
      const res = data.data;
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          text:
            res.generatedText?.trim() ||
            (res.items.length > 0
              ? 'Đây là vài gợi ý phù hợp với bạn:'
              : 'Mình chưa tìm thấy sản phẩm phù hợp. Bạn thử mô tả khác xem nhé.'),
          items: res.items,
          degraded: res.degraded,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: 'Xin lỗi, mình chưa xử lý được yêu cầu này. Bạn thử lại sau nhé.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <ConversationHeader
        icon={<Sparkles className="h-4 w-4 text-primary" />}
        title="Trợ lý AI"
        onBack={onBack}
      />

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {messages.map((m) => (
          <div key={m.id} className={cn('flex flex-col', m.role === 'user' ? 'items-end' : 'items-start')}>
            <div
              className={cn(
                'max-w-[85%] rounded-2xl px-3.5 py-2',
                m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-white/8 text-foreground'
              )}
            >
              <p className="whitespace-pre-wrap break-words text-sm">{m.text}</p>
            </div>

            {/* Sản phẩm gợi ý */}
            {m.items && m.items.length > 0 && (
              <div className="mt-2 w-full space-y-2">
                {m.items.map((it) => (
                  <AiProductRow key={it.product.productId} product={it.product} />
                ))}
              </div>
            )}

            {m.degraded && (
              <p className="mt-1 text-[10px] text-muted-foreground/70">
                * Gợi ý ở chế độ dự phòng (AI tạm thời không khả dụng).
              </p>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Đang tìm sản phẩm phù hợp…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 border-t border-white/8 p-3">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Hỏi trợ lý AI…"
          maxLength={500}
          className="bg-white/5 border-white/10"
        />
        <Button className="shrink-0 bg-primary" disabled={loading || !input.trim()} onClick={handleSend}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </>
  );
}

function AiProductRow({ product }: { product: RecommendedProductResponse['product'] }) {
  const hasRange = product.priceMin !== product.priceMax;
  return (
    <Link
      href={`/products/${product.productId}`}
      className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/3 p-2 transition-colors hover:border-primary/30"
    >
      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-white/5">
        {product.coverImage?.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.coverImage.url} alt={product.name} className="h-full w-full object-cover" />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-xs font-medium leading-snug text-foreground">{product.name}</p>
        <p className="mt-0.5 text-xs font-bold text-primary">
          {hasRange ? formatPriceRange(product.priceMin, product.priceMax) : formatPrice(product.priceMin)}
        </p>
      </div>
    </Link>
  );
}

/* ---------- Chat với shop ---------- */

function ShopConversation({
  roomId,
  shopName,
  onBack,
}: {
  roomId: string;
  shopName?: string;
  onBack: () => void;
}) {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: history, isLoading } = useQuery({
    queryKey: ['chat-messages', roomId],
    queryFn: async () => {
      const { data } = await api.get<{ data: PagedResponse<ChatMessage> }>(
        `/api/chat/rooms/${roomId}/messages?page=0&size=50`
      );
      return [...pageFrom(data.data).content].reverse();
    },
  });

  useEffect(() => {
    if (history) setMessages(history);
  }, [history]);

  useEffect(() => {
    api
      .post(`/api/chat/rooms/${roomId}/read`)
      .then(() => qc.invalidateQueries({ queryKey: ['chat-rooms'] }))
      .catch(() => {});
  }, [roomId, qc]);

  useChatSubscription(roomId, (msg) => {
    setMessages((prev) => (prev.some((m) => m.messageId === msg.messageId) ? prev : [...prev, msg]));
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    const content = input.trim();
    if (!content || sending) return;
    setSending(true);
    try {
      const { data } = await api.post<{ data: ChatMessage }>(`/api/chat/rooms/${roomId}/messages`, {
        content,
      });
      setInput('');
      setMessages((prev) =>
        prev.some((m) => m.messageId === data.data.messageId) ? prev : [...prev, data.data]
      );
    } catch {
      /* noop */
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <ConversationHeader
        icon={<Store className="h-4 w-4 text-muted-foreground" />}
        title={shopName ?? 'Cuộc trò chuyện'}
        onBack={onBack}
      />

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-2/3 bg-white/5" />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Bắt đầu cuộc trò chuyện</p>
        ) : (
          messages.map((m) => {
            const mine = user?.id === m.senderId;
            return (
              <div key={m.messageId} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[75%] rounded-2xl px-3.5 py-2',
                    mine ? 'bg-primary text-primary-foreground' : 'bg-white/8 text-foreground'
                  )}
                >
                  <p className="whitespace-pre-wrap break-words text-sm">{m.content}</p>
                  <p
                    className={cn(
                      'mt-0.5 text-[10px]',
                      mine ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    )}
                  >
                    {formatRelative(m.sentAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 border-t border-white/8 p-3">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Nhập tin nhắn…"
          className="bg-white/5 border-white/10"
        />
        <Button className="shrink-0 bg-primary" disabled={sending || !input.trim()} onClick={handleSend}>
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </>
  );
}
