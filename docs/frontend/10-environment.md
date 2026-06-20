# 10 — Environment & Configuration

---

## Env Vars cho Frontend

### Vite (React)

```env
# .env.local
VITE_API_BASE_URL=http://localhost:8080
VITE_WS_BASE_URL=ws://localhost:8080
```

### Next.js

```env
# .env.local
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
NEXT_PUBLIC_WS_BASE_URL=ws://localhost:8080
```

### Production (Vercel)

Thêm vào Vercel dashboard → Settings → Environment Variables:

```
VITE_API_BASE_URL=https://your-backend.railway.app
VITE_WS_BASE_URL=wss://your-backend.railway.app
```

---

## Backend cần cấu hình (Railway / Local)

Backend phải biết frontend origin để cấu hình CORS, OAuth2 redirect và email verification links. Các env var quan trọng phía backend:

| Backend Env Var | Value ví dụ | Mục đích |
|---|---|---|
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173,https://your-fe.vercel.app` | Cho phép cross-origin từ FE |
| `AUTH_COOKIE_SECURE` | `false` (local), `true` (prod) | Refresh token cookie |
| `AUTH_COOKIE_SAME_SITE` | `Lax` (local), `None` (prod cross-domain) | Cookie policy |
| `FRONTEND_VERIFICATION_URL` | `https://your-fe.vercel.app/verify` | Link trong email verify |
| `FRONTEND_OAUTH2_REDIRECT_URI` | `https://your-fe.vercel.app/oauth2/callback` | Sau OAuth2 login |

> **Quan trọng:** Nếu backend và frontend khác domain (Railway + Vercel), cần `AUTH_COOKIE_SAME_SITE=None` và `AUTH_COOKIE_SECURE=true`. Ngược lại refresh token cookie sẽ bị block bởi browser.

---

## CORS

Backend chỉ accept request từ các origin trong `CORS_ALLOWED_ORIGINS`. Khi local dev:

```
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

Nếu thấy CORS error → kiểm tra:
1. Backend env `CORS_ALLOWED_ORIGINS` có đúng port FE không
2. FE request có `withCredentials: true` không
3. FE không dùng wildcard origin

---

## Cookie Setup

Refresh token nằm trong HttpOnly cookie tên `__Secure-refresh_token`. Frontend **không đọc được** cookie này — chỉ browser tự gửi khi:
- Request tới cùng domain (hoặc cùng backend domain)
- `withCredentials: true` trong axios/fetch
- Không bị block bởi SameSite policy

### Local dev (cùng domain)
```
API: http://localhost:8080
FE:  http://localhost:5173
```
Khác port vẫn là khác origin → cần `withCredentials: true` + CORS config.

### Production (khác domain)
```
API: https://shopee-backend.railway.app
FE:  https://shopee-clone.vercel.app
```
Bắt buộc: `AUTH_COOKIE_SAME_SITE=None` + `AUTH_COOKIE_SECURE=true` phía backend.

---

## CSRF Setup

Backend set cookie `XSRF-TOKEN` (có thể đọc bởi JS). Frontend đọc và gửi lại qua header `X-XSRF-TOKEN`.

Axios config:
```ts
const api = axios.create({
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
  withCredentials: true,
  // ...
});
```

Với `xsrfCookieName` và `xsrfHeaderName`, Axios **tự động** đọc cookie và gắn header — không cần làm thủ công.

---

## OAuth2 Redirect Setup

### Google OAuth2

Trong Google Cloud Console → Credentials → OAuth2 Client:
- Authorized redirect URIs: `https://your-backend.railway.app/login/oauth2/code/google`

Backend redirect về FE sau khi thành công:
- `https://your-fe.vercel.app/oauth2/callback?token=<access-token>`

Frontend cần route `/oauth2/callback`.

### Facebook OAuth2

Tương tự — redirect URI: `https://your-backend.railway.app/login/oauth2/code/facebook`

---

## VNPay Sandbox

VNPay cần biết URL để redirect sau khi thanh toán. Backend env var:
```
VNPAY_RETURN_URL=https://your-fe.vercel.app/payment/return
```

Frontend cần route `/payment/return` để nhận kết quả. Xem [05-payment.md](05-payment.md).

---

## Media URL

Tùy môi trường, media URL có thể là:
- **Local:** `http://localhost:8080/api/media/images/{mediaId}` (backend serve local file)
- **Production:** `https://r2.example.com/object-key` (Cloudflare R2 public URL)

Response từ media upload luôn trả `url` field sẵn sàng dùng — frontend không cần tự build URL.

---

## Demo Accounts & Seed Data

### Accounts

| Role | Email | Password |
|---|---|---|
| Buyer | `demo-buyer@shopee.local` | `password` |
| Seller | `demo-seller@shopee.local` | `password` |

### Chạy seed (sau khi backend đã start lần đầu)

```bash
psql "postgresql://shoppe:shoppe@localhost:5432/shopee_db" -f scripts/demo-seed.sql
```

### Reset data

```bash
psql "postgresql://shoppe:shoppe@localhost:5432/shopee_db" -f scripts/demo-reset.sql
```

### Sau seed — publish products

Seed data tạo products ở trạng thái DRAFT. Login với demo-seller và publish từng sản phẩm:

```http
POST /api/products/{productId}/publish
Authorization: Bearer <seller-access-token>
```

Hoặc dùng Swagger UI tại `http://localhost:8080/swagger-ui.html`.

---

## Local Development Checklist

- [ ] Docker: `docker compose up -d postgres redis elasticsearch`
- [ ] Backend chạy với profile local (xem README.md backend)
- [ ] FE: set `VITE_API_BASE_URL=http://localhost:8080`
- [ ] FE: set `VITE_WS_BASE_URL=ws://localhost:8080`
- [ ] Gọi `GET /api/auth/csrf` khi app load (lấy CSRF cookie)
- [ ] Seed data và publish products
- [ ] Test với Swagger UI trước khi build UI

## Production Deploy Checklist

- [ ] Backend trên Railway với đủ env vars
- [ ] FE trên Vercel với `VITE_API_BASE_URL` và `VITE_WS_BASE_URL`
- [ ] `CORS_ALLOWED_ORIGINS` backend chứa Vercel URL
- [ ] `AUTH_COOKIE_SAME_SITE=None` + `AUTH_COOKIE_SECURE=true` (cross-domain)
- [ ] `FRONTEND_VERIFICATION_URL` và `FRONTEND_OAUTH2_REDIRECT_URI` trỏ đúng Vercel URL
- [ ] `VNPAY_RETURN_URL` trỏ đúng Vercel URL `/payment/return`
- [ ] OAuth2 redirect URIs cập nhật trong Google/Facebook console
- [ ] Seed data sau deploy (psql vào Railway PostgreSQL)

---

## Health Check

```http
GET /actuator/health
```

Response:
```json
{
  "status": "UP",
  "components": {
    "db": { "status": "UP" },
    "redis": { "status": "UP" }
  }
}
```

Dùng để kiểm tra backend có sẵn sàng chưa trước khi test FE.
