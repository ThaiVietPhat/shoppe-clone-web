# Frontend Integration Guide — Shopee Clone Backend

Backend này là một Spring Boot modular monolith phục vụ toàn bộ buyer/seller/AI demo flow.
Tài liệu này đủ để build và deploy frontend mà không cần hỏi lại backend.

---

## Base URL

| Môi trường | URL |
|---|---|
| Local | `http://localhost:8080` |
| Production (Railway) | Set qua env `VITE_API_BASE_URL` / `NEXT_PUBLIC_API_BASE_URL` |

Swagger UI (dùng để test nhanh):
```
http://localhost:8080/swagger-ui.html
```

OpenAPI groups:
- `auth-user` — Auth, users, addresses
- `catalog-search` — Products, categories, shops, media, search, recommendations
- `cart-order-payment` — Cart, checkout, orders, inventory, payment, seller dashboard
- `review-notification-chat` — Reviews, notifications, chat

---

## Demo Accounts

> Backend không còn seed data sẵn (đã bỏ để sản phẩm có ảnh thật qua upload R2 thay vì SQL seed).
> Tự đăng ký account buyer/seller mới qua `/api/auth/register`, hoặc tạo qua Swagger UI.

---

## Tổng quan flow

```
[Buyer]
  register/login (quên mật khẩu → forgot/reset-password) → browse homepage → search/AI recommend
  → product detail (báo cáo vi phạm) → add cart → select items → checkout preview (áp mã voucher)
  → place order → VNPay / COD → order confirmed
  → review → notification → chat với seller

[Seller]
  login → create product + media + variants + stock → publish
  → nhận order → ship → deliver → seller dashboard

[Admin]
  login (role ADMIN) → dashboard → quản lý user (ban/unban)
  → quản lý shop (suspend/reinstate/verify) → xử lý report → quản lý voucher (tạo/kích hoạt/xoá)
```

---

## Index tài liệu

| File | Nội dung |
|---|---|
| [01-auth.md](01-auth.md) | CSRF, login, logout, refresh token, OAuth2, rate limit |
| [02-api-conventions.md](02-api-conventions.md) | Response shape, error codes, pagination, idempotency |
| [03-catalog.md](03-catalog.md) | Homepage, category, product detail, search, AI recommend |
| [04-cart-checkout.md](04-cart-checkout.md) | Cart, selected items, checkout preview, place order |
| [05-payment.md](05-payment.md) | COD, VNPay, polling status, payment return page |
| [06-orders.md](06-orders.md) | Buyer order list/detail/cancel, seller fulfill flow |
| [07-seller.md](07-seller.md) | Shop, product CRUD, media upload, inventory, dashboard |
| [08-review-notification.md](08-review-notification.md) | Review, notification inbox, mark-read |
| [09-chat.md](09-chat.md) | REST history + STOMP realtime setup |
| [10-environment.md](10-environment.md) | Env vars, CORS, cookies, seed/reset |
| [11-voucher-admin-moderation.md](11-voucher-admin-moderation.md) | Voucher CRUD/apply, admin user ban/shop moderation, buyer report → admin resolve |

---

## Axios / Fetch setup tối thiểu

```ts
// api.ts
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true, // BẮT BUỘC — refresh token nằm trong HttpOnly cookie
});

// Gắn access token vào mọi request
api.interceptors.request.use((config) => {
  const token = getAccessToken(); // lưu trong memory, không localStorage
  if (token) config.headers.Authorization = `Bearer ${token}`;

  // Gắn CSRF token cho mọi mutating request
  const csrf = getCsrfFromCookie('XSRF-TOKEN');
  if (csrf) config.headers['X-XSRF-TOKEN'] = csrf;

  return config;
});

// Auto-refresh khi 401
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401 && !err.config._retry) {
      err.config._retry = true;
      await refreshAccessToken();
      return api(err.config);
    }
    return Promise.reject(err);
  }
);
```

> Chi tiết đầy đủ xem [01-auth.md](01-auth.md).
