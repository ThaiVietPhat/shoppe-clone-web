# 09 — Chat (REST + STOMP Realtime)

> Bản này đã được đối chiếu lại trực tiếp với `ChatController`/`ChatRoomResponse`/`ChatMessageResponse` thật trong backend. Bản cũ trước đây dùng field tưởng tượng (`roomId`, `messageId`, `senderType`, `read`, object `shop: {...}` lồng, `lastMessage: {...}` lồng) và khiến FE từng có 2 bug thật: điều hướng `/chat?roomId=undefined` (đọc field `roomId` không tồn tại thay vì `id`) và danh sách phòng chat luôn trống (gọi `pageFrom()` cho response thực ra là mảng phẳng, không phân trang).

Chat có 2 layer:
- **REST** — tạo/lấy danh sách phòng, lấy lịch sử tin nhắn, gửi tin nhắn (không realtime)
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

Idempotent — nếu buyer đã có phòng với shop này thì trả về phòng cũ (không tạo trùng).

Response (`ChatRoomResponse`):
```json
{
  "code": 200,
  "data": {
    "id": "uuid",
    "buyerId": "uuid",
    "shopId": "uuid",
    "shopName": "Tech Store VN",
    "buyerLastReadAt": "2025-06-20T09:00:00Z",
    "sellerLastReadAt": null,
    "lastMessageContent": null,
    "lastMessageSenderId": null,
    "lastMessageAt": null,
    "unreadCount": 0,
    "createdAt": "2025-06-20T08:00:00Z"
  }
}
```

Field khoá chính là **`id`**, không phải `roomId`. `shopName`/`shopId` là field phẳng, không có object lồng `shop: {...}`.

### Danh sách phòng chat

```http
GET /api/chat/rooms?page=0&size=20
Authorization: Bearer <token>
```

⚠️ **`page`/`size` không có tác dụng** — `ChatController.listRooms` không nhận `Pageable`, Spring âm thầm bỏ qua 2 param này. `data` là **mảng phẳng**, không phải `{items, page, size, totalElements, ...}`:

```json
{
  "code": 200,
  "data": [
    {
      "id": "uuid",
      "buyerId": "uuid",
      "shopId": "uuid",
      "shopName": "Tech Store VN",
      "buyerLastReadAt": "2025-06-20T09:00:00Z",
      "sellerLastReadAt": "2025-06-20T09:04:00Z",
      "lastMessageContent": "Cho hỏi laptop còn hàng không?",
      "lastMessageSenderId": "uuid",
      "lastMessageAt": "2025-06-20T09:00:00Z",
      "unreadCount": 2,
      "createdAt": "2025-06-19T10:00:00Z"
    }
  ]
}
```

FE đọc thẳng `data.data` như `ChatRoom[]` — **đừng gọi `pageFrom(data.data)`** cho endpoint này, vì mảng không có field `.items` nên `content` sẽ luôn rỗng dù backend trả đủ dữ liệu.

### Lịch sử tin nhắn — endpoint này MỚI thật sự phân trang

```http
GET /api/chat/rooms/{roomId}/messages?page=0&size=50
Authorization: Bearer <token>
```

Response (`PagedResponse<ChatMessageResponse>` thật — dùng `pageFrom()` bình thường cho endpoint này):
```json
{
  "code": 200,
  "data": {
    "items": [
      {
        "id": "uuid",
        "roomId": "uuid",
        "senderId": "uuid",
        "content": "Cho hỏi laptop còn hàng không?",
        "createdAt": "2025-06-20T09:00:00Z"
      },
      {
        "id": "uuid",
        "roomId": "uuid",
        "senderId": "uuid",
        "content": "Dạ còn hàng ạ, anh muốn đặt không?",
        "createdAt": "2025-06-20T09:05:00Z"
      }
    ],
    "page": 0,
    "size": 50,
    "totalElements": 25,
    "totalPages": 1,
    "last": true
  }
}
```

`ChatMessageResponse` field thật: `{ id, roomId, senderId, content, createdAt }`. **Không có `senderType`** — xác định "tin của mình" bằng so sánh `senderId === user.id`.

**Hiển thị:** mảng trả về mới → cũ. Reverse trước khi render (cũ → mới, tin mới nhất ở dưới cùng).

### Gửi tin nhắn qua REST

```http
POST /api/chat/rooms/{roomId}/messages
Authorization: Bearer <token>
X-XSRF-TOKEN: <csrf>

{
  "content": "Cho hỏi laptop còn hàng không?"
}
```

Response: `ChatMessageResponse` như trên.

> Dùng REST để gửi. STOMP chỉ dùng để nhận realtime.

### Đánh dấu đã đọc

```http
POST /api/chat/rooms/{roomId}/read
Authorization: Bearer <token>
X-XSRF-TOKEN: <csrf>
```

Response: `ChatRoomResponse` đã cập nhật (`buyerLastReadAt`/`sellerLastReadAt` mới). Nhớ `invalidateQueries({queryKey:['chat-rooms']})` sau khi gọi để badge `unreadCount` ở danh sách phòng cập nhật ngay.

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
  stompClient = new Client({
    brokerURL: `${WS_BASE_URL}/ws`,
    // BẮT BUỘC: gửi access token qua CONNECT header
    connectHeaders: {
      Authorization: `Bearer ${getAccessToken()}`,
    },
    reconnectDelay: 5000,

    onConnect: () => {
      stompClient!.subscribe(`/topic/chat/rooms/${roomId}`, (frame) => {
        const message: ChatMessage = JSON.parse(frame.body); // shape = ChatMessageResponse
        onMessage(message);
      });
    },

    onStompError: (frame) => {
      console.error('STOMP error:', frame);
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
- Access token gửi trong `connectHeaders`, không phải cookie hay URL param
- Room membership được backend enforce cho cả REST, SUBSCRIBE, và SEND — subscribe nhầm room không thuộc về mình sẽ bị từ chối
- Mỗi lần vào trang chat → `activate()`, rời trang → `deactivate()`

### Gửi tin nhắn qua STOMP

Không dùng STOMP để gửi — dùng REST POST thay thế. STOMP chỉ nhận.

### Message format nhận từ STOMP

```ts
interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  content: string;
  createdAt: string; // ISO 8601
}
```

---

## Reconnect & Token Expiry

Access token 10 phút. STOMP connection sống lâu hơn → cần handle reconnect với token mới:

```ts
stompClient = new Client({
  brokerURL: `${WS_BASE_URL}/ws`,

  // Gọi mỗi khi cần reconnect — lấy token mới
  beforeConnect: () => {
    stompClient!.connectHeaders = {
      Authorization: `Bearer ${getAccessToken() ?? ''}`,
    };
  },

  reconnectDelay: 5000,
});
```

---

## React Query pattern thật (khớp code hiện tại)

```tsx
const qc = useQueryClient();

// Danh sách phòng — KHÔNG dùng pageFrom, response là mảng phẳng
const { data: rooms } = useQuery({
  queryKey: ['chat-rooms'],
  queryFn: async () => {
    const { data } = await api.get<{ data: ChatRoom[] }>('/api/chat/rooms?page=0&size=20');
    return data.data;
  },
});

// Tạo phòng rồi điều hướng — dùng data.data.id, invalidate cache rooms
async function handleChat(shopId: string) {
  const { data } = await api.post('/api/chat/rooms', { shopId });
  qc.invalidateQueries({ queryKey: ['chat-rooms'] });
  router.push(`/chat?roomId=${data.data.id}`); // ĐÚNG: .id, KHÔNG phải .roomId
}

// Lịch sử tin nhắn — CÓ phân trang, dùng pageFrom bình thường
const { data: history } = useQuery({
  queryKey: ['chat-messages', roomId],
  queryFn: async () => {
    const { data } = await api.get<{ data: PagedResponse<ChatMessage> }>(
      `/api/chat/rooms/${roomId}/messages?page=0&size=50`
    );
    return [...pageFrom(data.data).content].reverse(); // mới→cũ trả về, reverse thành cũ→mới
  },
});
```

---

## WS_BASE_URL config

```ts
// .env.local
NEXT_PUBLIC_WS_BASE_URL=ws://localhost:8080

// Production (Vercel)
NEXT_PUBLIC_WS_BASE_URL=wss://your-backend.railway.app
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
- [ ] Danh sách phòng (`GET /api/chat/rooms`) đọc thẳng như mảng, KHÔNG `pageFrom()`
- [ ] Lịch sử tin nhắn (`GET .../messages`) CÓ phân trang, dùng `pageFrom()` rồi reverse
- [ ] Dùng field `id` của phòng/tin nhắn, không phải `roomId`/`messageId`
- [ ] Xác định "tin của mình" bằng `senderId === user.id`, không có field `senderType`
- [ ] Invalidate `['chat-rooms']` sau khi tạo phòng mới hoặc đánh dấu đã đọc
