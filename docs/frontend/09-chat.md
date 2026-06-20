# 09 — Chat (REST + STOMP Realtime)

Chat có 2 layer:
- **REST** — lấy lịch sử phòng/tin nhắn, gửi tin nhắn (không realtime)
- **STOMP/WebSocket** — nhận tin nhắn realtime

---

## REST API

### Tạo hoặc lấy phòng chat với seller

```http
POST /api/chat/rooms
Authorization: Bearer <token>
X-XSRF-TOKEN: <csrf>

{
  "shopId": "uuid"
}
```

Nếu đã có phòng với seller này → trả phòng cũ (idempotent).

Response:
```json
{
  "code": 200,
  "data": {
    "roomId": "uuid",
    "shop": {
      "shopId": "uuid",
      "shopName": "Tech Store VN",
      "logoUrl": "https://..."
    },
    "lastMessage": null,
    "unreadCount": 0,
    "createdAt": "2025-06-20T08:00:00Z"
  }
}
```

### Danh sách phòng chat

```http
GET /api/chat/rooms?page=0&size=20
Authorization: Bearer <token>
```

Response:
```json
{
  "code": 200,
  "data": {
    "content": [
      {
        "roomId": "uuid",
        "shop": {
          "shopId": "uuid",
          "shopName": "Tech Store VN",
          "logoUrl": "https://..."
        },
        "lastMessage": {
          "content": "Cho hỏi laptop còn hàng không?",
          "senderType": "BUYER",
          "sentAt": "2025-06-20T09:00:00Z"
        },
        "unreadCount": 2
      }
    ]
  }
}
```

### Lịch sử tin nhắn

```http
GET /api/chat/rooms/{roomId}/messages?page=0&size=50
Authorization: Bearer <token>
```

Response (tin nhắn từ mới → cũ, page 0 = tin nhắn mới nhất):
```json
{
  "code": 200,
  "data": {
    "content": [
      {
        "messageId": "uuid",
        "roomId": "uuid",
        "senderId": "uuid",
        "senderType": "BUYER",
        "content": "Cho hỏi laptop còn hàng không?",
        "sentAt": "2025-06-20T09:00:00Z",
        "read": true
      },
      {
        "messageId": "uuid",
        "roomId": "uuid",
        "senderId": "uuid",
        "senderType": "SELLER",
        "content": "Dạ còn hàng ạ, anh muốn đặt không?",
        "sentAt": "2025-06-20T09:05:00Z",
        "read": false
      }
    ],
    "page": 0,
    "totalElements": 25,
    "totalPages": 1
  }
}
```

**Hiển thị:** Reverse order — render từ cũ đến mới (flip `content` array).

### Gửi tin nhắn qua REST

```http
POST /api/chat/rooms/{roomId}/messages
Authorization: Bearer <token>
X-XSRF-TOKEN: <csrf>

{
  "content": "Cho hỏi laptop còn hàng không?"
}
```

Response: message object như trên.

> Dùng REST để gửi. STOMP chỉ dùng để nhận realtime.

### Đánh dấu đã đọc

```http
POST /api/chat/rooms/{roomId}/read
Authorization: Bearer <token>
X-XSRF-TOKEN: <csrf>
```

---

## STOMP Realtime Setup

### Cài đặt thư viện

```bash
npm install @stomp/stompjs
```

### Kết nối và subscribe

```ts
import { Client } from '@stomp/stompjs';

let stompClient: Client | null = null;

function connectChat(roomId: string, onMessage: (msg: ChatMessage) => void) {
  const accessToken = getAccessToken();

  stompClient = new Client({
    brokerURL: `${WS_BASE_URL}/ws`,
    // BẮT BUỘC: gửi access token qua CONNECT header
    connectHeaders: {
      Authorization: `Bearer ${accessToken}`,
    },
    reconnectDelay: 5000,

    onConnect: () => {
      // Subscribe phòng chat
      stompClient!.subscribe(
        `/topic/chat/rooms/${roomId}`,
        (frame) => {
          const message: ChatMessage = JSON.parse(frame.body);
          onMessage(message);
        }
      );
    },

    onStompError: (frame) => {
      console.error('STOMP error:', frame);
    },

    onDisconnect: () => {
      console.log('Disconnected from chat');
    },
  });

  stompClient.activate();
}

function disconnectChat() {
  stompClient?.deactivate();
  stompClient = null;
}
```

**Lưu ý quan trọng:**
- `brokerURL` dùng `ws://` (local) hoặc `wss://` (production), không phải `http://`
- Access token phải gửi trong `connectHeaders` — không phải cookie hay URL param
- Mỗi lần vào trang chat → `activate()`, rời trang → `deactivate()`

### Gửi tin nhắn qua STOMP

Không dùng STOMP để gửi — dùng REST POST thay thế. STOMP chỉ nhận.

### Message format nhận từ STOMP

```ts
interface ChatMessage {
  messageId: string;
  roomId: string;
  senderId: string;
  senderType: 'BUYER' | 'SELLER';
  content: string;
  sentAt: string; // ISO 8601
  read: boolean;
}
```

---

## Reconnect & Token Expiry

Access token 10 phút. STOMP connection sống lâu hơn → cần handle reconnect với token mới:

```ts
stompClient = new Client({
  brokerURL: `${WS_BASE_URL}/ws`,

  // Gọi mỗi khi cần reconnect — lấy token mới
  beforeConnect: async () => {
    // Refresh token nếu cần
    const token = await getOrRefreshAccessToken();
    stompClient!.connectHeaders = {
      Authorization: `Bearer ${token}`,
    };
  },

  reconnectDelay: 5000,
  // ...
});
```

---

## React component pattern

```tsx
function ChatRoom({ roomId }: { roomId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');

  // Load lịch sử
  useEffect(() => {
    api.get(`/api/chat/rooms/${roomId}/messages`)
      .then(({ data }) => {
        setMessages([...data.data.content].reverse()); // cũ → mới
      });
  }, [roomId]);

  // STOMP realtime
  useEffect(() => {
    connectChat(roomId, (newMsg) => {
      setMessages(prev => [...prev, newMsg]);
      // Đánh dấu đã đọc nếu không phải tin của mình
      if (newMsg.senderId !== currentUserId) {
        api.post(`/api/chat/rooms/${roomId}/read`);
      }
    });

    return () => disconnectChat();
  }, [roomId]);

  async function sendMessage() {
    if (!input.trim()) return;
    const { data } = await api.post(`/api/chat/rooms/${roomId}/messages`, {
      content: input,
    });
    setMessages(prev => [...prev, data.data]);
    setInput('');
  }

  return (
    <div>
      <div className="messages">
        {messages.map(msg => (
          <div key={msg.messageId} className={msg.senderType === 'BUYER' ? 'sent' : 'received'}>
            {msg.content}
          </div>
        ))}
      </div>
      <input value={input} onChange={e => setInput(e.target.value)} />
      <button onClick={sendMessage}>Gửi</button>
    </div>
  );
}
```

---

## WS_BASE_URL config

```ts
// Local
const WS_BASE_URL = 'ws://localhost:8080';

// Production
const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL;
// env: VITE_WS_BASE_URL=wss://your-backend.railway.app
```

---

## Checklist

- [ ] `@stomp/stompjs` installed
- [ ] `brokerURL` dùng `ws://` hoặc `wss://`, không phải `http://`
- [ ] Gửi `Authorization: Bearer <token>` trong `connectHeaders`
- [ ] Gửi tin nhắn qua REST POST, không qua STOMP
- [ ] Subscribe chỉ đúng roomId user đang xem
- [ ] Deactivate khi unmount component (cleanup)
- [ ] Handle reconnect với token mới khi token hết hạn
- [ ] Load lịch sử qua REST, reverse array trước khi render
- [ ] Đánh dấu đọc khi vào phòng và khi nhận tin nhắn mới
