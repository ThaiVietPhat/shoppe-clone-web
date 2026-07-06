# AGENTS.md — Shopee Clone Frontend

> ⚠️ **File này là bản fork cũ của `CLAUDE.md`, không được cập nhật song song.** Các phần API field/endpoint ở đây (đặc biệt mục Chat — `roomId`, `senderType`, object `shop`/`lastMessage` lồng) đã lỗi thời và từng gây bug thật (xem `CLAUDE.md` mục Chat + `docs/frontend/09-chat.md` để biết chi tiết field thật đã đối chiếu với backend). **Luôn ưu tiên đọc `CLAUDE.md` ở root — coi file này là tham khảo cấu trúc project, không phải nguồn field/endpoint đáng tin.**

## Project Overview

Shopee clone frontend — Next.js app phục vụ 3 loại user: **Buyer**, **Seller**, **Admin** trong cùng một codebase. Backend là Spring Boot modular monolith chạy tại `http://localhost:8080` (local) hoặc Railway (prod). Frontend deploy trên Vercel.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| State (server) | TanStack Query v5 |
| State (client) | Zustand |
| HTTP | Axios |
| Forms | React Hook Form + Zod |
| WebSocket | @stomp/stompjs |
| Icons | Lucide React |
| Date | date-fns |
| UUID | uuid |

---

## Project Structure

```
src/
├── app/
│   ├── (buyer)/
│   │   ├── page.tsx                          # Homepage
│   │   ├── search/page.tsx
│   │   ├── products/[productId]/page.tsx
│   │   ├── shops/[shopId]/page.tsx
│   │   ├── cart/page.tsx
│   │   ├── checkout/page.tsx
│   │   ├── payment/return/page.tsx
│   │   ├── orders/page.tsx
│   │   └── orders/[orderId]/page.tsx
│   ├── (seller)/
│   │   └── seller/
│   │       ├── dashboard/page.tsx
│   │       ├── products/page.tsx
│   │       ├── products/new/page.tsx
│   │       ├── products/[productId]/edit/page.tsx
│   │       └── orders/page.tsx
│   ├── (admin)/
│   │   └── admin/...
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── verify/page.tsx           # POST /api/auth/verify với ?token=
│   │   └── oauth2/callback/page.tsx
│   ├── chat/page.tsx
│   ├── notifications/page.tsx
│   └── layout.tsx                    # Root layout — Providers
├── components/
│   ├── ui/                           # shadcn primitives
│   ├── layout/                       # Header, Footer, Sidebar
│   ├── product/                      # ProductCard, ProductGrid, VariantSelector
│   ├── cart/                         # CartItem, CartSummary
│   ├── order/                        # OrderCard, OrderTimeline, OrderStatus
│   ├── chat/                         # ChatRoom, MessageBubble
│   └── shared/                       # Pagination, ImageUpload, PriceDisplay
├── lib/
│   ├── api.ts                        # Axios instance + interceptors
│   ├── queryClient.ts
│   └── utils.ts                      # cn(), formatPrice(), formatDate()
├── hooks/
│   ├── use-auth.ts
│   ├── use-cart.ts
│   └── use-chat.ts
├── stores/
│   └── auth.store.ts                 # Zustand: accessToken (memory), user, shopId
├── types/
│   └── api.ts                        # ApiResponse<T>, Page<T>, all DTOs
└── middleware.ts                     # Route protection theo role
```

---

## Environment

```env
# .env.local — local
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
NEXT_PUBLIC_WS_BASE_URL=ws://localhost:8080
```

Production (Vercel dashboard → Settings → Environment Variables):
```
NEXT_PUBLIC_API_BASE_URL=https://your-backend.railway.app
NEXT_PUBLIC_WS_BASE_URL=wss://your-backend.railway.app
```

Backend cần cấu hình:
- `CORS_ALLOWED_ORIGINS` chứa Vercel URL
- `AUTH_COOKIE_SAME_SITE=None` + `AUTH_COOKIE_SECURE=true` (cross-domain)
- `FRONTEND_VERIFICATION_URL=https://your-fe.vercel.app/verify`
- `FRONTEND_OAUTH2_REDIRECT_URI=https://your-fe.vercel.app/oauth2/callback`
- `VNPAY_RETURN_URL=https://your-fe.vercel.app/payment/return`

---

## API Conventions

### Response wrapper

```ts
interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}
```

### HTTP Status Codes

| Status | Xử lý |
|---|---|
| `200` | Dùng `data` |
| `400` | Hiển thị `message` hoặc field errors từ `data` |
| `401` | Auto-refresh, nếu fail → redirect login |
| `403` | Hiển thị "Không có quyền" |
| `404` | Hiển thị 404 |
| `409` | Conflict idempotency — thông báo, để user thử lại |
| `429` | Rate limit — hiển thị message, disable form tạm thời |
| `500/503` | "Lỗi hệ thống, thử lại sau" |

### Pagination query params chuẩn
```
?page=0&size=20&sort=createdAt,desc
```

---

## Axios Setup — `src/lib/api.ts`

```ts
let accessToken: string | null = null;

export function setAccessToken(token: string | null) { accessToken = token; }
export function getAccessToken() { return accessToken; }

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080',
  withCredentials: true,          // BẮT BUỘC — refresh token cookie
  headers: { 'Content-Type': 'application/json' },
  xsrfCookieName: 'XSRF-TOKEN',  // Axios tự đọc cookie và gắn header X-XSRF-TOKEN
  xsrfHeaderName: 'X-XSRF-TOKEN',
});

// Gắn access token vào mọi request
api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

// Auto refresh khi 401
let isRefreshing = false;
let queue: Array<(token: string) => void> = [];

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      if (isRefreshing) {
        return new Promise((resolve) => {
          queue.push((token) => {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(api(original));
          });
        });
      }
      isRefreshing = true;
      try {
        const { data } = await api.post('/api/auth/refresh');
        const newToken = data.data.accessToken;
        setAccessToken(newToken);
        queue.forEach(cb => cb(newToken));
        queue = [];
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        setAccessToken(null);
        queue = [];
        window.location.href = '/login';
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(err);
  }
);
```

---

## Auth Flow

### Token Storage

| Token | Lưu ở đâu | TTL |
|---|---|---|
| Access Token (JWT) | Zustand store (memory) — KHÔNG localStorage | 10 phút |
| Refresh Token | HttpOnly cookie `__Secure-refresh_token` (backend set tự động) | 7 ngày |

### CSRF — gọi khi app load

```ts
await api.get('/api/auth/csrf');
// Backend set cookie XSRF-TOKEN — Axios tự xử lý (xsrfCookieName config)
```

### Đăng nhập

```http
POST /api/auth/login
{ "email": "...", "password": "..." }
```

Response `data.data`:
```ts
{
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: 600;
  user: {
    id: string;
    email: string;
    fullName: string;
    role: "BUYER" | "SELLER" | "ADMIN";
    emailVerified: boolean;
    avatarUrl: string | null;
    shopId: string | null;
    shopName: string | null;
  }
}
```

Sau login: lưu `accessToken` vào Zustand (memory), lưu `user` vào Zustand.

### Đăng xuất

```http
POST /api/auth/logout       # logout session hiện tại
POST /api/auth/logout-all   # logout tất cả thiết bị
```

Clear Zustand → redirect `/login`.

### Email Verify — Route `/verify?token=xxx`

```ts
const token = new URLSearchParams(location.search).get('token');
await api.post('/api/auth/verify', { token });
router.push('/login');
```

### OAuth2 Callback — Route `/oauth2/callback?token=xxx`

```ts
const token = new URLSearchParams(location.search).get('token');
setAccessToken(token);
const { data } = await api.get('/api/users/me');
setCurrentUser(data.data);
router.push('/');
```

Redirect sang OAuth: `window.location.href = \`${API_BASE_URL}/oauth2/authorization/google\``

### User hiện tại

```http
GET /api/users/me
Authorization: Bearer <token>
```

---

## Route Protection — `middleware.ts`

```
/seller/* → yêu cầu role SELLER
/admin/*  → yêu cầu role ADMIN
/cart, /checkout, /orders/* → yêu cầu đã login (bất kỳ role)
/login, /register → redirect về / nếu đã login
```

---

## Catalog

### Shared Types

```ts
interface ProductCardResponse {
  productId: string;
  name: string;
  slug: string | null;
  coverImage: MediaInfo | null;
  priceMin: number;
  priceMax: number;
  shop: ShopSummary;
  rating: number | null;
  soldCount: number;
  status: 'ACTIVE' | 'INACTIVE' | 'DRAFT' | 'DELETED';
  checkoutEligible: boolean;
  categoryPath: string | null;
}

interface MediaInfo { mediaId: string; url: string; contentType: string; }
interface ShopSummary { shopId: string; shopName: string; logoUrl: string | null; }
```

### Endpoints (public — không cần auth)

```http
GET /api/products/homepage?page=0&size=20
GET /api/categories                                   # category tree, cached 30 phút server
GET /api/categories/{categoryId}/products?page=0&size=20
GET /api/products/{productId}                         # detail + variants
GET /api/search/products?q=...&categoryId=...&minPrice=...&maxPrice=...&brand=...&sort=relevance
GET /api/search/products/semantic?q=...               # AI semantic search
GET /api/recommendations/home?page=0&size=20          # optional auth
POST /api/recommendations/chat                        # { "query": "..." }
GET /api/shops/{shopId}
GET /api/shops/{shopId}/products?page=0&size=20
```

Search `sort` values: `relevance` | `price,asc` | `price,desc` | `soldCount,desc` | `rating,desc`

### Product Detail — Variant Selector

- Group `variants[].options` theo `name` để render matrix chọn variant
- Disable "Thêm vào giỏ" nếu `variant.checkoutEligible === false`
- Badge: `IN_STOCK` (xanh) | `LOW_STOCK` (cam) | `OUT_OF_STOCK` (đỏ)

### Degraded Mode

Response có `degraded: true` khi Elasticsearch/AI không khả dụng. Hiển thị banner nhỏ, không crash.

---

## Cart (cần auth BUYER)

```http
GET    /api/cart
POST   /api/cart/items                  # { "variantId", "quantity" } — cộng dồn, không replace
PUT    /api/cart/items/{variantId}      # { "quantity" } — quantity=0 thì xóa
DELETE /api/cart/items/{variantId}
POST   /api/cart/items/select           # { "variantIds": [...], "selected": true/false }
POST   /api/cart/items/select-all       # { "selected": true/false }
```

**Quan trọng:** Chỉ `selected: true` items mới được checkout. Frontend phải reflect đúng trạng thái `selected` của từng item.

---

## Địa chỉ giao hàng

```http
GET  /api/users/me/addresses
POST /api/users/me/addresses
# { "recipientName", "phone", "street", "ward", "district", "province", "isDefault" }
```

---

## Checkout & Order

### Preview — không tạo order, không giữ kho

```http
POST /api/orders/preview
{ "addressId": "uuid" }
```

Backend dùng selected items trong cart. Response có `valid: boolean` và `invalidItems[]`.

`invalidReason` values: `PRODUCT_INACTIVE` | `VARIANT_INACTIVE` | `PRICE_CHANGED` | `INSUFFICIENT_STOCK` | `ADDRESS_INVALID`

Khi `valid: false` → disable nút "Đặt hàng", hiển thị lý do từng item.

### Place Order — Idempotency Key BẮT BUỘC

```http
POST /api/orders
Idempotency-Key: <uuid-v4>    ← TẠO MỘT LẦN, GIỮ LẠI ĐỂ RETRY
{ "addressId": "uuid", "paymentMethod": "VNPAY" }  // hoặc "COD"
```

```ts
// Tạo một lần, giữ lại để retry — KHÔNG tạo mới khi retry
const [idempotencyKey] = useState(() => uuidv4());

await api.post('/api/orders', payload, {
  headers: { 'Idempotency-Key': idempotencyKey }
});
```

Response `data`: `{ checkoutSessionId, orderIds, paymentMethod, grandTotal, expiresAt, paymentUrl? }`

Sau khi nhận:
- `COD`: redirect `/orders/{orderIds[0]}`
- `VNPAY`: `window.location.href = data.paymentUrl`

---

## Payment

### VNPay Flow

```
POST /api/orders → paymentUrl
→ window.location.href = paymentUrl       (redirect sang VNPay)
→ VNPay redirect về /payment/return?vnp_*=...
→ GET /api/payments/vnpay/return?<toàn bộ query string>   (forward, không tự parse)
→ Poll /api/payments/status/{checkoutSessionId} mỗi 3 giây nếu PENDING
```

### Polling Status

```http
GET /api/payments/status/{checkoutSessionId}
```

`status`: `PENDING` | `SUCCEEDED` | `FAILED` | `EXPIRED` | `REQUIRES_RECONCILIATION`
`nextAction`: `WAIT` | `REDIRECT_TO_ORDER` | `RETRY_PAYMENT` | `CONTACT_SUPPORT`

Poll mỗi 3 giây, timeout 15 phút.

### Thử lại thanh toán

```http
POST /api/payments/initiate
{ "checkoutSessionId": "uuid", "paymentMethod": "VNPAY" }
```

---

## Orders

### Order Status Flow

```
PENDING_PAYMENT → CONFIRMED → READY_TO_SHIP → SHIPPED → DELIVERED → COMPLETED
                                                                    ↑ buyer có thể review
CANCELLED (từ bất kỳ bước nào trước SHIPPED)
```

### Buyer Endpoints

```http
GET  /api/buyer/orders?page=0&size=20&status=ALL
GET  /api/buyer/orders/{orderId}
POST /api/buyer/orders/{orderId}/cancel    # { "reason": "..." }
```

`status` filter: `ALL` | `PENDING_PAYMENT` | `CONFIRMED` | `READY_TO_SHIP` | `SHIPPED` | `DELIVERED` | `COMPLETED` | `CANCELLED`

Order detail trả: `canCancel: boolean`, `canReview: boolean`, `timeline[]`, `items[].reviewed: boolean`

Hiển thị nút "Huỷ đơn" chỉ khi `canCancel: true`. Hiển thị nút "Đánh giá" theo từng item khi `reviewed === false` và order status `COMPLETED`.

### Seller Endpoints

```http
GET  /api/seller/orders?page=0&size=20&status=ALL
GET  /api/seller/orders/{orderId}          # có thêm canShip, canDeliver
POST /api/seller/orders/{orderId}/ship     # { "trackingNumber": "GHN123456" } — optional
POST /api/seller/orders/{orderId}/deliver
GET  /api/seller/dashboard
```

---

## Seller

### Shop

```http
GET   /api/shops/me
PATCH /api/shops/me
# { "shopName", "description", "logoMediaId", "bannerMediaId" }
```

### Media Upload — multipart

```ts
const formData = new FormData();
formData.append('file', file);
formData.append('purpose', 'PRODUCT_IMAGE'); // PRODUCT_IMAGE | SHOP_LOGO | SHOP_BANNER | AVATAR

// KHÔNG tự set Content-Type — để Axios tự thêm boundary
const { data } = await api.post('/api/media/images', formData);
// data.data: { mediaId, url, contentType, size }
```

Giới hạn: `image/jpeg`, `image/png`, `image/webp`, tối đa 10MB.

### Product CRUD

```http
GET   /api/seller/products?page=0&size=20&status=ALL   # ALL|DRAFT|ACTIVE|INACTIVE
POST  /api/products
# { "name", "description", "brand", "categoryId", "attributes": [{name,value}], "mediaIds", "coverMediaId" }
PATCH /api/products/{productId}
POST  /api/products/{productId}/variants
# { "sku", "price", "options": [{ "name", "value" }] }
PATCH /api/products/{productId}/variants/{variantId}
POST  /api/inventories                                  # { "variantId", "initialStock" }
PATCH /api/inventories/variants/{variantId}/stock       # { "quantity", "note" }
GET   /api/inventories/variants/{variantId}/movements   # lịch sử biến động kho
POST  /api/products/{productId}/publish
POST  /api/products/{productId}/unpublish
```

Inventory movement `type` values: `STOCK_UPDATE` | `RESERVE` | `CONFIRM` | `RELEASE`

### Thứ tự tạo Product — BẮT BUỘC đúng thứ tự

```
1. Upload ảnh → nhận mediaIds
2. POST /api/products → productId (DRAFT)
3. POST /api/products/{id}/variants → variantIds (mỗi variant một request)
4. POST /api/inventories (mỗi variant)
5. POST /api/products/{id}/publish
```

Điều kiện publish: ít nhất 1 variant active + inventory với stock ≥ 0 + cover image.

---

## Review

```http
POST  /api/reviews
# { "orderItemId": "uuid", "rating": 1-5, "comment": "..." }
# Chỉ khi order COMPLETED, mỗi orderItemId 1 lần

GET   /api/products/{productId}/reviews?page=0&size=10&rating=5

PATCH /api/reviews/{reviewId}
# { "rating": 4, "comment": "..." }
```

Lỗi: `400 ORDER_ITEM_NOT_COMPLETED` | `400 ALREADY_REVIEWED`

---

## Notification

```http
GET  /api/notifications?page=0&size=20&unreadOnly=false
GET  /api/notifications/unread-count     # poll mỗi 60 giây cho badge
POST /api/notifications/{notificationId}/read
POST /api/notifications/read-all
```

`type` values: `ORDER_CONFIRMED` | `ORDER_SHIPPED` | `ORDER_DELIVERED` | `ORDER_COMPLETED` | `ORDER_CANCELLED` | `REVIEW_REMINDER`

`metadata` chứa `orderId` (và `trackingNumber` nếu có) để navigate.

---

## Chat

### REST API

```http
POST /api/chat/rooms                               # { "shopId": "uuid" } — idempotent
GET  /api/chat/rooms?page=0&size=20
GET  /api/chat/rooms/{roomId}/messages?page=0&size=50
# Response: mới → cũ. Reverse array trước khi render.
POST /api/chat/rooms/{roomId}/messages             # { "content": "..." } — gửi qua REST
POST /api/chat/rooms/{roomId}/read
```

### STOMP Realtime — chỉ dùng để NHẬN

```ts
const stompClient = new Client({
  brokerURL: `${process.env.NEXT_PUBLIC_WS_BASE_URL}/ws`,  // ws:// hoặc wss://, KHÔNG http://
  connectHeaders: { Authorization: `Bearer ${accessToken}` }, // token trong header, không cookie
  reconnectDelay: 5000,
  beforeConnect: async () => {
    // Refresh token trước khi reconnect
    const token = await getOrRefreshAccessToken();
    stompClient.connectHeaders = { Authorization: `Bearer ${token}` };
  },
  onConnect: () => {
    stompClient.subscribe(`/topic/chat/rooms/${roomId}`, (frame) => {
      const message: ChatMessage = JSON.parse(frame.body);
      onMessage(message);
    });
  },
});

stompClient.activate();
// Deactivate khi unmount: stompClient.deactivate()
```

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

## Nguyên tắc code

- TypeScript strict mode — không dùng `any`
- `cn()` utility từ shadcn cho conditional classNames
- Giá tiền format VND: `new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price)`
- Date format: `date-fns` với locale `vi`
- Tất cả API call đi qua `src/lib/api.ts`, không dùng fetch trực tiếp
- Access token lưu **trong memory** (Zustand), KHÔNG localStorage/sessionStorage
- Không viết comment giải thích WHAT, chỉ viết khi WHY không hiển nhiên
- Không thêm error handling cho case không thể xảy ra
- Không thêm feature chưa được yêu cầu

---

## Demo Accounts

| Role | Email | Password |
|---|---|---|
| Buyer | `demo-buyer@shopee.local` | `password` |
| Seller | `demo-seller@shopee.local` | `password` |

Swagger UI: `http://localhost:8080/swagger-ui.html`
