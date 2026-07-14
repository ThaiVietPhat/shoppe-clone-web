# 01 — Authentication

---

## Tổng quan

Backend dùng **dual-token** strategy:

| Token | Lưu ở đâu | TTL | Cách truyền |
|---|---|---|---|
| Access Token (JWT) | **Memory** (biến JS, không localStorage/sessionStorage) | 10 phút | `Authorization: Bearer <token>` header |
| Refresh Token | **HttpOnly cookie** (backend set tự động) | 7 ngày | Cookie gửi tự động khi `withCredentials: true` |

Frontend **không bao giờ** đọc được refresh token — backend quản lý hoàn toàn.

---

## Bước 0 — Lấy CSRF token (bắt buộc trước mọi mutating request)

Backend dùng CSRF cookie `XSRF-TOKEN`. Cookie này **có thể đọc bởi JS** (không HttpOnly). Frontend cần đọc và gửi lại qua header.

```http
GET /api/auth/csrf
```

Response: `200 OK` — backend set cookie `XSRF-TOKEN` vào browser.

```ts
// Gọi một lần khi app khởi động (hoặc trước lần đầu tiên mutate)
await api.get('/api/auth/csrf');

// Helper đọc cookie
function getCookie(name: string): string | null {
  return document.cookie
    .split('; ')
    .find(row => row.startsWith(name + '='))
    ?.split('=')[1] ?? null;
}

// Gắn vào mọi POST/PUT/PATCH/DELETE
headers['X-XSRF-TOKEN'] = getCookie('XSRF-TOKEN');
```

> Axios tự xử lý nếu set `xsrfCookieName: 'XSRF-TOKEN'` và `xsrfHeaderName: 'X-XSRF-TOKEN'` trong config.

---

## Đăng ký

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "StrongPass123!",
  "fullName": "Nguyen Van A"
}
```

Response `200`:
```json
{
  "code": 200,
  "message": "Registration successful. Please verify your email.",
  "data": null
}
```

Sau đăng ký, backend gửi email xác minh. User cần click link trong email.

**Lưu ý quan trọng:** link email gọi `POST /api/auth/verify` — **không phải GET**. Frontend cần có route catch link, đọc token từ query param rồi tự gọi POST:

```ts
// Route: /verify?token=xxx
const token = new URLSearchParams(location.search).get('token');
await api.post('/api/auth/verify', { token });
// Redirect về login sau khi verify thành công
```

---

## Đăng nhập

```http
POST /api/auth/login
Content-Type: application/json
X-XSRF-TOKEN: <csrf-token>

{
  "email": "user@example.com",
  "password": "StrongPass123!"
}
```

Response `200`:
```json
{
  "code": 200,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
    "tokenType": "Bearer",
    "expiresIn": 600,
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "fullName": "Nguyen Van A",
      "role": "BUYER",
      "emailVerified": true,
      "shopId": null
    }
  }
}
```

**Sau login:**
1. Lưu `accessToken` vào memory.
2. Lưu `user` vào state (Redux/Zustand/Context).
3. Backend đã set HttpOnly cookie `__Secure-refresh_token` — frontend không cần làm gì.

```ts
const { data } = await api.post('/api/auth/login', { email, password });
setAccessToken(data.data.accessToken); // memory only
setCurrentUser(data.data.user);
```

---

## Refresh Token (tự động gia hạn access token)

Khi access token hết hạn (401), gọi:

```http
POST /api/auth/refresh
X-XSRF-TOKEN: <csrf-token>
```

Không cần body — backend đọc refresh token từ HttpOnly cookie.

Response `200`:
```json
{
  "code": 200,
  "data": {
    "accessToken": "eyJ...",
    "tokenType": "Bearer",
    "expiresIn": 600
  }
}
```

**Lưu ý:** Refresh token bị rotate sau mỗi lần dùng. Backend set cookie mới tự động.

Nếu refresh token hết hạn hoặc bị revoke → `401` → redirect về login.

```ts
// interceptor tự động
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const { data } = await api.post('/api/auth/refresh');
        setAccessToken(data.data.accessToken);
        original.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return api(original);
      } catch {
        clearAccessToken();
        router.push('/login');
      }
    }
    return Promise.reject(err);
  }
);
```

---

## Đăng xuất

### Logout session hiện tại

```http
POST /api/auth/logout
Authorization: Bearer <access-token>
X-XSRF-TOKEN: <csrf-token>
```

Response `200`. Backend xóa cookie và revoke refresh token.

```ts
await api.post('/api/auth/logout');
clearAccessToken();
clearCurrentUser();
router.push('/login');
```

### Logout tất cả thiết bị

```http
POST /api/auth/logout-all
Authorization: Bearer <access-token>
X-XSRF-TOKEN: <csrf-token>
```

---

## Quên / Đặt lại mật khẩu (Task 8)

### Bước 1 — yêu cầu link đặt lại

```http
POST /api/auth/forgot-password
{ "email": "user@example.com" }
```

Response `200` **luôn luôn**, bất kể email có tồn tại trong hệ thống hay không — đây là thiết kế chống dò email (enumeration-safe), không phải bug. **Đừng suy luận "email tồn tại" từ response** — luôn hiển thị cùng một message trung lập kiểu "Nếu email tồn tại, chúng tôi đã gửi link đặt lại mật khẩu".

Nếu tìm thấy user và user không bị khoá (`status != LOCKED`), backend gửi email chứa link dạng `https://your-frontend.vercel.app/reset-password?token=<raw-token>`. Token TTL 30 phút, chỉ dùng được 1 lần.

### Bước 2 — đặt mật khẩu mới bằng token

```http
POST /api/auth/reset-password
{ "token": "<raw-token-từ-query-string>", "newPassword": "NewStrongPass123!" }
```

Route FE: `/reset-password?token=xxx` đọc `token` từ query string (dùng `useSearchParams`, cần bọc trong `<Suspense>` ở Next.js App Router vì `useSearchParams` yêu cầu suspense boundary khi export tĩnh).

Response lỗi thật (map theo `ErrorCode` backend):
| Code | Ý nghĩa |
|---|---|
| `PASSWORD_RESET_TOKEN_NOT_FOUND` | Token sai/không tồn tại |
| `PASSWORD_RESET_TOKEN_EXPIRED` | Token quá 30 phút |
| `PASSWORD_RESET_TOKEN_ALREADY_USED` | Token đã được dùng để reset trước đó |
| `ACCOUNT_NOT_ACTIVE` | Account bị khoá (LOCKED) — admin đã ban |

**Reset thành công tự động logout mọi thiết bị đang đăng nhập** (session revocation toàn bộ refresh-token family) — user phải login lại bằng mật khẩu mới trên mọi thiết bị, kể cả thiết bị vừa dùng để reset.

Cả 2 endpoint đều `permitAll` (không cần Bearer token) nhưng có rate-limit bucket riêng (mặc định 3 request/phút theo IP/user) — hiển thị message rate-limit rõ ràng khi gặp `429`, không phải lỗi generic.

```ts
// forgot-password/page.tsx
await api.post('/api/auth/forgot-password', { email });
// luôn hiện toast thành công trung lập, không rẽ nhánh theo response

// reset-password/page.tsx — trong <Suspense>
const token = useSearchParams().get('token');
await api.post('/api/auth/reset-password', { token, newPassword });
router.push('/login');
```

Link "Quên mật khẩu?" đặt cạnh label password trên trang `/login`.

---

## OAuth2 (Google / Facebook)

Flow redirect — không dùng fetch/axios:

```ts
// Redirect browser tới backend OAuth endpoint
window.location.href = `${API_BASE_URL}/oauth2/authorization/google`;
// hoặc
window.location.href = `${API_BASE_URL}/oauth2/authorization/facebook`;
```

Sau khi OAuth thành công, backend redirect về:
```
https://your-frontend.vercel.app/oauth2/callback?token=<access-token>
```

Frontend cần route `/oauth2/callback` để nhận token:

```ts
// Route: /oauth2/callback?token=xxx
const token = new URLSearchParams(location.search).get('token');
if (token) {
  setAccessToken(token);
  // Fetch current user
  const { data } = await api.get('/api/users/me');
  setCurrentUser(data.data);
  router.push('/');
}
```

> URL callback phải khớp với `OAUTH2_REDIRECT_URI` backend được cấu hình. Xem [10-environment.md](10-environment.md).

---

## Rate Limiting

Backend giới hạn:
- **Anonymous:** 100 req/phút theo IP
- **Authenticated:** 300 req/phút theo userId
- **Login/Register:** bucket riêng chặt hơn

Khi bị rate limit → `429 Too Many Requests`:
```json
{
  "code": 429,
  "message": "Too many requests. Please try again later.",
  "data": null
}
```

Frontend nên hiển thị message và disable form/button tạm thời.

---

## Lấy thông tin user hiện tại

```http
GET /api/users/me
Authorization: Bearer <access-token>
```

Response:
```json
{
  "code": 200,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "fullName": "Nguyen Van A",
    "role": "BUYER",
    "emailVerified": true,
    "avatarUrl": "https://...",
    "shopId": null,
    "shopName": null
  }
}
```

Gọi endpoint này sau mỗi lần refresh token thành công để sync user state.

---

## Checklist cho frontend

- [ ] Gọi `GET /api/auth/csrf` khi app load lần đầu
- [ ] Lưu access token trong memory (closure, biến module, Zustand), **không** localStorage
- [ ] Gửi `withCredentials: true` cho mọi request
- [ ] Gắn `X-XSRF-TOKEN` header cho mọi POST/PUT/PATCH/DELETE
- [ ] Interceptor tự động refresh khi 401
- [ ] Route `/verify?token=xxx` → gọi `POST /api/auth/verify`
- [ ] Route `/oauth2/callback?token=xxx` → set access token rồi fetch `/api/users/me`
- [ ] Khi refresh thất bại → clear state → redirect login
