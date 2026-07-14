# 11 — Voucher, Admin & Moderation (Task 8)

> Ba tính năng trước đây chỉ tồn tại dưới dạng `ErrorCode` dự phòng / route placeholder, đã implement đầy đủ trong Task 8: quên/đặt lại mật khẩu (xem [01-auth.md](01-auth.md)), voucher, và admin panel (user ban, shop moderation, buyer report). Scope cố ý thu hẹp: voucher admin-only/platform-wide không stacking, admin moderation không có fraud scoring — xem `DESIGN.md` §13.9 Scope Bank ở backend cho phần còn lại chưa làm.

---

## Voucher

Admin-only, platform-wide, **1 voucher/checkout** (không stacking nhiều mã cùng lúc, không voucher riêng theo shop).

### Validate / preview (buyer, bất kỳ role đã login)

```http
POST /api/vouchers/validate
{ "code": "WELCOME10", "orderSubtotal": 500000 }
```

Dùng độc lập nếu cần preview riêng; trong flow checkout thật, validate đã được gộp sẵn vào `POST /api/orders/preview` (xem [04-cart-checkout.md](04-cart-checkout.md)) — không cần gọi endpoint này riêng trừ khi muốn kiểm tra mã trước khi vào trang checkout.

### CRUD (ADMIN only)

```http
GET    /api/admin/vouchers?page=0&size=20
POST   /api/admin/vouchers
PATCH  /api/admin/vouchers/{id}/activate
PATCH  /api/admin/vouchers/{id}/deactivate
DELETE /api/admin/vouchers/{id}          # soft-delete, status=DELETED
```

Request tạo voucher (`CreateVoucherRequest`):
```json
{
  "code": "WELCOME10",
  "discountType": "PERCENTAGE",
  "discountValue": 10,
  "maxDiscountAmount": 50000,
  "minOrderAmount": 200000,
  "usageLimit": 100,
  "startsAt": "2026-07-01T00:00:00Z",
  "expiresAt": "2026-12-31T23:59:59Z"
}
```

- `discountType`: `PERCENTAGE` (phần trăm, giảm tính trên **items subtotal**, không tính shipping) hoặc `FIXED_AMOUNT` (số tiền cố định).
- `maxDiscountAmount`: chỉ áp dụng cho `PERCENTAGE`, để `null`/bỏ trống = không giới hạn mức giảm tối đa.
- `usageLimit`: để `null`/bỏ trống = không giới hạn số lượt dùng.
- `code` unique — tạo trùng code trả `VOUCHER_CODE_ALREADY_EXISTS`.
- `startsAt >= expiresAt` trả `VOUCHER_INVALID_DATE_RANGE`.

`Voucher` response field thật: `{ id, code, discountType, discountValue, maxDiscountAmount, minOrderAmount, usageLimit, usedCount, startsAt, expiresAt, status }`. `status`: `ACTIVE` | `INACTIVE` | `DELETED`.

### ⚠️ Form tạo voucher — bug thật đã xảy ra với field số optional

`<input type="number">` để trống gửi lên là chuỗi rỗng `''`. Với zod, `z.coerce.number().nonnegative().optional()` KHÔNG bắt được trường hợp này — `Number('')` cho ra `0` (không phải `NaN`), nên coercion "thành công" thành `0` trước khi zod kịp fallback qua nhánh optional. Hậu quả quan sát được khi test thật: tạo voucher bỏ trống "giảm tối đa" hiển thị "(tối đa 0 ₫)" thay vì không giới hạn.

Fix — preprocess ép chuỗi rỗng thành `undefined` trước khi coerce:
```ts
const emptyToUndefined = (v: unknown) => (v === '' || v === undefined ? undefined : v);

const schema = z.object({
  // ...
  maxDiscountAmount: z.preprocess(emptyToUndefined, z.coerce.number().nonnegative().optional()),
  usageLimit: z.preprocess(emptyToUndefined, z.coerce.number().positive().optional()),
});
```

Vì `z.coerce` làm input type (trước coerce, có thể là string) khác output type (sau coerce, number), `useForm` cần 2 generic tách biệt để khớp `zodResolver`:
```ts
type FormInput = z.input<typeof schema>;
type FormData = z.output<typeof schema>;
const { register, handleSubmit } = useForm<FormInput, unknown, FormData>({
  resolver: zodResolver(schema),
});
```
Submit dùng `values.maxDiscountAmount ?? null` (sau coerce giá trị đã là number/undefined, không còn là chuỗi rỗng).

---

## Admin — User & Shop Moderation

Toàn bộ `/api/admin/**` yêu cầu role `ADMIN` ở backend (`SecurityConfig`, trả `403` nếu sai role) — đây là subtree role-gated đầu tiên ngoài `/actuator/**`.

### Users

```http
GET  /api/admin/users?page=0&size=20
POST /api/admin/users/{id}/ban      # user.status = LOCKED + logout-all tức thì (session revocation)
POST /api/admin/users/{id}/unban
```

Ban user đã login sẵn → mọi refresh-token family bị revoke ngay, access token cũ tự hết hiệu lực chậm nhất sau 10 phút (access-token TTL) dù chưa refresh lần nào. Ban user đã bị ban trả `USER_ALREADY_BANNED`; unban user chưa bị ban trả `USER_ALREADY_ACTIVE`.

### Shops

```http
GET  /api/admin/shops?page=0&size=20
POST /api/admin/shops/{id}/suspend
POST /api/admin/shops/{id}/reinstate
POST /api/admin/shops/{id}/verify
```

`Shop` trước Task 8 không có field trạng thái nào — `status` (`ACTIVE`/`SUSPENDED`) và `verified` (boolean) là field mới. Suspend **không cascade unlist sản phẩm của shop** (out of scope, giữ đơn giản cho demo — nếu cần tự động ẩn sản phẩm khi shop bị suspend, đó là việc chưa làm). Suspend shop đã suspended trả `SHOP_ALREADY_SUSPENDED`; tương tự cho reinstate.

---

## Report / Moderation

Buyer report sản phẩm hoặc shop, admin review và resolve.

### Buyer tạo report (authenticated, bất kỳ role)

```http
POST /api/reports
{
  "targetType": "PRODUCT",
  "targetId": "uuid",
  "reasonCategory": "COUNTERFEIT",
  "description": "Optional, mô tả thêm"
}
```

`targetType`: `PRODUCT` | `SHOP`. `reasonCategory`: `COUNTERFEIT` | `PROHIBITED` | `MISLEADING` | `ABUSE` | `OTHER`. `description` optional.

UI trigger: nút "Báo cáo" trên trang chi tiết sản phẩm (`/products/[productId]`) và trang shop (`/shops/[shopId]`), mở `<ReportDialog targetType targetId />` (component dùng chung, `src/components/shared/ReportDialog.tsx`).

### Admin xem & xử lý (ADMIN only)

```http
GET   /api/admin/reports?status=PENDING&page=0&size=20   # status optional filter
PATCH /api/admin/reports/{id}/resolve
{ "outcome": "RESOLVED", "note": "Đã xác minh và gỡ sản phẩm" }   // hoặc "REJECTED"
```

`Report` field thật: `{ id, reporterId, targetType, targetId, reasonCategory, description, status, resolutionNote, resolvedBy, resolvedAt, createdAt }`. `status`: `PENDING` | `RESOLVED` | `REJECTED`.

Resolve report không còn `PENDING` (đã resolve/reject trước đó) trả `REPORT_ALREADY_RESOLVED`.

**`targetId` không tự động resolve ra tên sản phẩm/shop** — `moderation` module không có FK cross-module tới `product`/`user` (kiến trúc modular monolith cấm dependency ngược). Trang admin resolve report hiện `targetId` thô kèm `targetType`; nếu cần hiển thị tên/thumbnail thật, FE phải tự gọi thêm `GET /api/products/{id}` hoặc `GET /api/shops/{id}` theo `targetType`.

---

## Route & Layout (Frontend)

```
src/app/(admin)/
├── layout.tsx              # client-side role guard, giống (seller)/layout.tsx nhưng check role === 'ADMIN'
└── admin/
    ├── page.tsx             # Dashboard: 4 stat card (users/shops/pending-reports/vouchers), đếm qua GET .../?page=0&size=1 rồi đọc totalElements
    ├── users/page.tsx
    ├── shops/page.tsx
    ├── reports/page.tsx
    └── vouchers/page.tsx
```

`(admin)/layout.tsx` chờ `isHydrated` từ Zustand auth store, chưa login → redirect `/login?redirect=/admin`, sai role → redirect `/`. Route protection này thuần client-side — `middleware.ts` là no-op vì refresh-token cookie có `Path=/api/auth`, không gửi kèm request điều hướng trang tới Next.js server.
