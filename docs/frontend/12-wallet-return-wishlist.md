# 12 — Wallet, Return/Dispute & Wishlist (Task 9)

> Ba tính năng escape-hatch khỏi Scope Bank (`DESIGN.md` §13.9 ở backend), implement đầy đủ trong Task 9: seller wallet/payout, return/dispute, và product wishlist (wishlist chưa từng bị scope-bank, chỉ đơn giản chưa từng được build). Đã verify thật end-to-end qua browser thật (không chỉ tin unit/integration test) — xem ghi chú "Đã verify thật" ở mỗi mục.

---

## Wallet

Buyer refund credit + seller earnings dùng **chung 1 wallet/user** — không có wallet riêng cho buyer và seller.

```http
GET  /api/wallet                          # authenticated bất kỳ role — auto-create balance 0 nếu user chưa có wallet
GET  /api/wallet/transactions?page=0&size=20
POST /api/wallet/withdraw                 # SELLER only
{ "amount": 40000 }
```

`WalletResponse`:
```json
{ "walletId": "uuid", "balance": 60000.00 }
```

`WalletTransaction` (item của `/api/wallet/transactions`, shape `PagedResponse` chuẩn — xem [02-api-conventions.md](02-api-conventions.md)):
```json
{
  "id": "uuid",
  "type": "SELLER_EARNING",
  "amount": 100000.00,
  "referenceType": "ORDER",
  "referenceId": "uuid",
  "createdAt": "2026-07-15T03:57:00Z"
}
```

- `type`: `SELLER_EARNING` (+, tự động khi order chuyển `DELIVERED`) | `RETURN_REFUND` (+, buyer khi return được approve) | `RETURN_CLAWBACK` (-, seller khi return được approve) | `WITHDRAWAL` (-, seller tự rút).
- `amount` **có dấu sẵn** — cộng trực tiếp để tính running total, không tự suy luận dấu từ `type`.
- `POST /api/wallet/withdraw`: không phải SELLER role trả `403`; `amount > balance` trả `409`. Là **mock instant** — không có bank transfer thật, response trả về `WalletResponse` mới ngay lập tức, không có trạng thái "đang xử lý" để poll.
- `balance` **có thể âm** — nếu seller đã rút hết tiền rồi bị return clawback sau đó, balance âm là trạng thái hợp lệ (không phải bug), UI phải render số âm bình thường.

### Đã verify thật (browser thật, không chỉ test)
Đặt đơn COD → seller ship → seller deliver → seller wallet tự động `+100.000 ₫` (transaction `SELLER_EARNING`) → seller withdraw `40.000 ₫` → balance giảm đúng, transaction `WITHDRAWAL -40.000 ₫` xuất hiện ngay.

---

## Return/Dispute

```http
POST /api/buyer/orders/{orderId}/return
{
  "reasonCategory": "DEFECTIVE",
  "description": "Sản phẩm bị lỗi khi mở hộp, không hoạt động.",
  "evidenceMediaIds": ["media-uuid-1", "media-uuid-2"]
}

GET  /api/buyer/orders/{orderId}/return   # data: null nếu order chưa có return nào (không phải 404)

GET  /api/seller/returns?status=REQUESTED&page=0&size=20   # status optional filter

POST /api/seller/returns/{returnId}/approve
{ "resolutionNote": "Đã xác nhận lỗi, chấp nhận hoàn tiền" }

POST /api/seller/returns/{returnId}/reject
{ "resolutionNote": "Ngoài chính sách đổi trả" }
```

`ReturnRequestDetail`:
```json
{
  "id": "uuid",
  "orderId": "uuid",
  "buyerId": "uuid",
  "reasonCategory": "DEFECTIVE",
  "description": "Sản phẩm bị lỗi khi mở hộp, không hoạt động.",
  "status": "APPROVED",
  "refundAmount": 130000.00,
  "resolutionNote": "Đã xác nhận lỗi, chấp nhận hoàn tiền",
  "resolvedAt": "2026-07-15T04:16:00Z",
  "requestedAt": "2026-07-15T04:12:00Z",
  "evidenceMediaIds": ["media-uuid-1", "media-uuid-2"]
}
```

- `reasonCategory`: `DEFECTIVE` | `WRONG_ITEM` | `NOT_AS_DESCRIBED` | `CHANGED_MIND` | `OTHER`.
- `status`: `REQUESTED` → `APPROVED` | `REJECTED`. **Chỉ 3 trạng thái** — approve refund/clawback/restock chạy atomic trong 1 transaction ở backend, không có trạng thái `REFUNDED` riêng.
- Điều kiện tạo return: order phải `status === 'DELIVERED'` và trong return window (mặc định 7 ngày kể từ lúc giao — backend enforce qua `orders.delivered_at`, FE không tự tính lại window, chỉ hiện nút "Yêu cầu trả hàng/hoàn tiền" khi `order.status === 'DELIVERED'` và để backend trả lỗi nếu hết hạn).
- **1 return/order** — gọi `POST` lần 2 cho cùng order trả `409` (`RETURN_ALREADY_EXISTS`).
- `refundAmount` = `order.totalAmount` (toàn bộ đơn, gồm cả shipping fee) — hoàn vào **wallet buyer**, không phải hoàn qua VNPay/tiền mặt thật (xem mục Wallet ở trên; đây cũng là lý do Wallet tồn tại trong scope — không có "cổng" refund thật cho VNPay sandbox hay COD).
- Approve đồng thời: credit buyer wallet `refundAmount`, clawback seller wallet `order.itemsSubtotal` (không gồm shipping — seller chỉ từng nhận `itemsSubtotal` lúc giao hàng, xem mục Wallet), và restock `available_stock` cho từng variant trong đơn. Reject không đụng gì tới wallet/inventory.
- Single-level: seller approve/reject trực tiếp, **không có** buyer counter-appeal hay admin arbitration layer (scope thu hẹp, xem `DESIGN.md` §13.9).

### Evidence upload

Dùng lại `ImageUpload` component (`src/components/shared/ImageUpload.tsx`), mở rộng thêm `purpose="RETURN_EVIDENCE"`:
```tsx
<ImageUpload purpose="RETURN_EVIDENCE" ownerType="USER" ownerId={user.id} value={img} onChange={setImg} />
```
Backend validate `ownerId === current user id` cho `RETURN_EVIDENCE` (giống `AVATAR`, không giống `PRODUCT_IMAGE`/`SHOP_LOGO` vốn cần ownership qua shop). Tối đa 3 ảnh, mỗi ảnh 1 `ImageUpload` slot riêng (không có multi-file input) — xem `ReturnRequestDialog.tsx` (`src/components/order/`).

### Đã verify thật (browser thật)
Buyer request return (kèm mô tả, không kèm ảnh) trên đơn đã `DELIVERED` → status card hiện "Đang chờ shop xử lý" → seller thấy request ở `/seller/returns` với status `REQUESTED` → seller approve → buyer wallet `+130.000 ₫`, seller wallet `-100.000 ₫` (clawback, balance thành âm — hợp lệ), `available_stock` của variant `+1` — verify trực tiếp qua DB, khớp UI hiển thị.

---

## Wishlist

```http
POST   /api/wishlist/{productId}          # 409 nếu đã có, 404 nếu product không active
DELETE /api/wishlist/{productId}
GET    /api/wishlist?page=0&size=20       # trả ProductCardResponse[] — cùng shape với homepage/search (xem 03-catalog.md)
POST   /api/wishlist/check
{ "productIds": ["uuid-1", "uuid-2"] }
```

Response `/api/wishlist/check`:
```json
{ "code": 200, "data": { "uuid-1": true, "uuid-2": false } }
```

### UI

`ProductCard` (`src/components/product/ProductCard.tsx`) nhận thêm 2 prop optional:
```tsx
interface ProductCardProps {
  product: ProductCardResponse;
  wishlisted?: boolean;               // default false, KHÔNG tự fetch
  onWishlistChange?: (productId: string, wishlisted: boolean) => void;
}
```
Heart icon overlay góc trên-phải ảnh sản phẩm, tự gọi `POST`/`DELETE` khi bấm, quản lý state local (`localWishlisted`), sync lại nếu prop `wishlisted` đổi (`useEffect`).

**Trade-off chấp nhận cho demo**: chỉ trang `/wishlist` và trang product detail tự gọi `/api/wishlist/check` để có trạng thái tim chính xác lúc load — các trang listing khác (homepage, search, category, shop) **không** làm việc này, heart mặc định hiện trạng thái rỗng (chưa yêu thích) cho tới khi user tự bấm trên chính trang đó. Tránh N+1 query hoặc phải sửa mọi trang listing cho một tính năng phụ.

Trang `/wishlist` (`src/app/(buyer)/wishlist/page.tsx`) truyền `wishlisted` cố định `true` cho mọi card (đã lọc theo API) và `onWishlistChange` để `invalidateQueries` + tự refetch khi bỏ yêu thích — card biến mất khỏi danh sách ngay, không cần reload trang.

Trang product detail (`src/app/(buyer)/products/[productId]/page.tsx`) gọi `POST /api/wishlist/check` với 1 `productId` duy nhất để lấy trạng thái tim chính xác, hiện nút text "Yêu thích"/"Đã yêu thích" cạnh nút "Báo cáo".

### Đã verify thật (browser thật)
Bấm tim trên product detail → "Đã yêu thích" → vào `/wishlist` thấy sản phẩm xuất hiện → bấm tim trên `ProductCard` ở `/wishlist` để bỏ yêu thích → danh sách tự refetch, sản phẩm biến mất, hiện empty state.

---

## Route & Component (Frontend)

```
src/app/(seller)/seller/
├── wallet/page.tsx           # Balance card, lịch sử giao dịch (Pagination), withdraw Dialog
└── returns/page.tsx          # List theo status filter, approve/reject Dialog + resolutionNote Textarea

src/app/(buyer)/wishlist/page.tsx   # Grid ProductCard, wishlisted=true cố định

src/components/
├── order/ReturnRequestDialog.tsx   # reasonCategory select, description Textarea, evidence ImageUpload x3
└── product/ProductCard.tsx         # + heart-toggle overlay
```

Nav entries mới: `SellerSidebar` thêm "Trả hàng/Hoàn tiền" (`/seller/returns`) và "Ví" (`/seller/wallet`); `Header` dropdown user menu thêm "Sản phẩm yêu thích" (`/wishlist`).
