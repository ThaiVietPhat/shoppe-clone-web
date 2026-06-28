# 02 — API Conventions

---

## Response Wrapper

Mọi response đều bọc trong `ApiResponse<T>`:

```json
{
  "code": 200,
  "message": "Success",
  "data": { ... }
}
```

TypeScript type:
```ts
interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}
```

---

## HTTP Status Codes

| Status | Ý nghĩa | Xử lý phía client |
|---|---|---|
| `200` | Thành công | Dùng `data` |
| `400` | Validation thất bại / business rule vi phạm | Hiển thị `message` |
| `401` | Chưa auth hoặc token hết hạn | Auto-refresh, nếu fail → login |
| `403` | Không có quyền (sai role/ownership) | Hiển thị "Không có quyền truy cập" |
| `404` | Resource không tồn tại | Hiển thị 404 page |
| `409` | Conflict (idempotency key trùng với request khác nhau) | Thông báo và để user thử lại |
| `429` | Rate limit | Thông báo và disable form tạm thời |
| `500` / `503` | Lỗi server | Thông báo "Lỗi hệ thống, thử lại sau" |

---

## Error Response

```json
{
  "code": 400,
  "message": "Product is not available for purchase",
  "data": null
}
```

Một số endpoint trả lỗi chi tiết theo field:
```json
{
  "code": 400,
  "message": "Validation failed",
  "data": {
    "email": "Email is required",
    "password": "Password must be at least 8 characters"
  }
}
```

```ts
try {
  await api.post('/api/auth/register', payload);
} catch (err) {
  if (axios.isAxiosError(err)) {
    const { code, message, data } = err.response!.data;
    if (typeof data === 'object' && data !== null) {
      // validation errors theo field
      setFieldErrors(data);
    } else {
      setGlobalError(message);
    }
  }
}
```

---

## Pagination

Các list endpoint trả:
```json
{
  "code": 200,
  "data": {
    "items": [ ... ],
    "page": 0,
    "size": 20,
    "totalElements": 150,
    "totalPages": 8,
    "last": false
  }
}
```

Query params chuẩn:
```
?page=0&size=20&sort=createdAt,desc
```

TypeScript type (khớp `PagedResponse` của backend — dùng field **`items`**, KHÔNG phải `content`):
```ts
interface PagedResponse<T> {
  items: T[];          // ⚠️ backend trả `items`, không phải `content`
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}
```

> FE chuẩn hoá `items → content` qua helper `pageFrom()` (`src/lib/page.ts`) để code render dùng `.content` cho tiện. Khi đọc trực tiếp response thô thì luôn là `items`.

---

## Idempotency Key

Một số endpoint **bắt buộc** gửi `Idempotency-Key` header để chống tạo trùng khi retry:

- `POST /api/orders` (place order)

```ts
import { v4 as uuidv4 } from 'uuid';

// Tạo key một lần cho mỗi lần user bấm "Đặt hàng"
// Giữ key này để retry nếu request fail
const idempotencyKey = uuidv4();

await api.post('/api/orders', payload, {
  headers: { 'Idempotency-Key': idempotencyKey }
});
```

Nếu retry cùng key và cùng payload → backend trả kết quả cũ (cached).
Nếu retry cùng key nhưng khác payload → `409 Conflict`.

---

## Media URLs

Media trả về dạng:
```json
{
  "mediaId": "uuid",
  "url": "https://r2.example.com/object-key",
  "contentType": "image/jpeg",
  "size": 204800
}
```

Dùng `url` trực tiếp trong `<img src>`. Trong môi trường local, URL có thể là:
```
http://localhost:8080/api/media/images/{mediaId}
```

Xem [10-environment.md](10-environment.md) để biết cách cấu hình.

---

## Headers bắt buộc cho mọi request

| Header | Value | Khi nào |
|---|---|---|
| `Authorization` | `Bearer <access-token>` | Mọi authenticated request |
| `X-XSRF-TOKEN` | Value từ cookie `XSRF-TOKEN` | Mọi POST/PUT/PATCH/DELETE |
| `Content-Type` | `application/json` | Khi gửi JSON body |
| `Idempotency-Key` | UUID v4 | `POST /api/orders` |

---

## Axios config đầy đủ

```ts
// lib/api.ts
import axios from 'axios';

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

function getCsrfToken(): string {
  return document.cookie
    .split('; ')
    .find(r => r.startsWith('XSRF-TOKEN='))
    ?.split('=')[1] ?? '';
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  const csrf = getCsrfToken();
  if (csrf && ['post','put','patch','delete'].includes(config.method ?? '')) {
    config.headers['X-XSRF-TOKEN'] = csrf;
  }
  return config;
});

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

## Degraded Mode

Một số endpoint có thể trả thêm field `degraded: true` khi Elasticsearch hoặc AI provider không khả dụng. Frontend nên hiển thị indicator nhỏ (không crash):

```json
{
  "code": 200,
  "data": {
    "products": [ ... ],
    "degraded": true
  }
}
```

```tsx
{data.degraded && (
  <Banner variant="warning">
    Kết quả tìm kiếm có thể không đầy đủ. Hệ thống đang trong chế độ dự phòng.
  </Banner>
)}
```
