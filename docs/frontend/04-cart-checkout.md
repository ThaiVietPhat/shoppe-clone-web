# 04 — Cart, Checkout Preview, Place Order

> Đối chiếu lại với Swagger sống (xem `CLAUDE.md`). Bản trước có nhiều field/endpoint không tồn tại (`variantOptions`, `stockStatus`, `/api/users/me/addresses`, `select-all`, `paymentMethod` trong response `/api/orders`) — đã sửa toàn bộ.

---

## Cart

Cart lưu phía server (Redis). Mỗi item trong cart là `variantId → quantity`. Cart tự hết hạn sau 7 ngày không hoạt động.

### Xem giỏ hàng

```http
GET /api/cart
Authorization: Bearer <token>
```

Response (`CartResponse`):
```json
{
  "code": 200,
  "data": {
    "version": 12,
    "totalItems": 1,
    "items": [
      {
        "variantId": "uuid",
        "productId": "uuid",
        "shopId": "uuid",
        "shopName": "Tech Store VN",
        "productName": "Laptop Gaming ASUS TUF",
        "variantName": "16GB / 512GB SSD",
        "optionLabels": { "RAM": "16GB", "Storage": "512GB SSD" },
        "sku": "ASUS-TUF-16-512",
        "price": 25000000,
        "coverImageUrl": "https://...",
        "availableStock": 5,
        "checkoutEligible": true,
        "quantity": 2,
        "selected": true
      }
    ]
  }
}
```

**Không có** `variantOptions` (mảng), `coverImage` (object), `stockStatus` — dùng đúng field phẳng ở trên. Backend đã enrich đủ productName/variantName/optionLabels/coverImageUrl/availableStock/checkoutEligible cho từng item, FE không cần tự ghép từ product API khác.

### Thêm item vào giỏ

```http
POST /api/cart/items
{ "variantId": "uuid", "quantity": 1 }
```

Cộng dồn quantity nếu variant đã có trong giỏ, không replace.

### Cập nhật số lượng

```http
PUT /api/cart/items/{variantId}
{ "quantity": 3 }
```

`quantity = 0` → xóa item khỏi giỏ.

### Xóa item khỏi giỏ

```http
DELETE /api/cart/items/{variantId}
```

### Xoá sạch giỏ hàng

```http
DELETE /api/cart
```

### Chọn / bỏ chọn item để checkout — **2 endpoint riêng biệt, KHÔNG có cờ boolean**

```http
POST /api/cart/items/select
{ "variantIds": ["uuid1", "uuid2"] }

POST /api/cart/items/deselect
{ "variantIds": ["uuid1", "uuid2"] }
```

Request body `CartSelectRequest` chỉ có `variantIds` — **không có field `selected`**. Muốn chọn thì gọi `/select`, muốn bỏ chọn thì gọi `/deselect` — gọi nhầm `/select` cho cả hai trường hợp (như code cũ từng làm) khiến việc bỏ chọn không có tác dụng gì.

**Không có endpoint `/api/cart/items/select-all`.** Muốn "chọn/bỏ chọn tất cả", FE tự lấy toàn bộ `variantId` đang có trong cart rồi gọi `/select` hoặc `/deselect` với danh sách đó (xem `hooks/use-cart.ts`).

**Quan trọng:** Backend checkout chỉ dùng **selected items** — không bao giờ checkout toàn bộ giỏ nếu chỉ chọn một phần.

---

## Địa chỉ giao hàng

```http
GET    /api/addresses
POST   /api/addresses
PUT    /api/addresses/{addressId}
DELETE /api/addresses/{addressId}
PATCH  /api/addresses/{addressId}/default
```

**KHÔNG phải** `/api/users/me/addresses` — route đó không tồn tại, gọi vào sẽ luôn 404.

Response (`AddressResponse`):
```json
{
  "id": "uuid",
  "userId": "uuid",
  "recipientName": "Nguyen Van A",
  "phone": "0901234567",
  "addressLine": "123 Nguyen Hue",
  "wardCode": "00263",
  "wardName": "Bến Nghé",
  "districtCode": "001",
  "districtName": "Quận 1",
  "provinceCode": "01",
  "provinceName": "TP. Hồ Chí Minh",
  "isDefault": true,
  "createdAt": "...",
  "updatedAt": "..."
}
```

Field là `id` (không phải `addressId`), `addressLine` (không phải `street`), `wardName/districtName/provinceName` (không phải `ward/district/province`).

### Request tạo/sửa địa chỉ (`AddressRequest`)

```json
{
  "recipientName": "Nguyen Van A",
  "phone": "0901234567",
  "addressLine": "123 Nguyen Hue",
  "wardCode": "00263",
  "wardName": "Bến Nghé",
  "districtCode": "001",
  "districtName": "Quận 1",
  "provinceCode": "01",
  "provinceName": "TP. Hồ Chí Minh",
  "isDefault": true
}
```

**Cả 6 field code+name của ward/district/province đều bắt buộc** (không blank) — thiếu 1 field là backend trả 400. Hiện chưa có location-picker/GHN reference data thật để tra code chuẩn; FE tạm dùng chính tên nhập tay làm code (xem comment trong `checkout/page.tsx`). Đây là workaround, không phải hợp đồng backend — thay bằng bộ chọn tỉnh/huyện/xã thật khi có nguồn dữ liệu GHN.

---

## Checkout Preview

Gọi trước khi đặt hàng để hiển thị breakdown giá và validate. **Không tạo order, không giữ kho.**

```http
POST /api/orders/preview
{ "addressId": "uuid" }
```

Backend dùng các **selected items** trong cart hiện tại.

Response (`CheckoutPreviewResponse`):
```json
{
  "code": 200,
  "data": {
    "shops": [
      {
        "shopId": "uuid",
        "shopName": "Tech Store VN",
        "items": [
          {
            "variantId": "uuid",
            "productId": "uuid",
            "productName": "Laptop Gaming ASUS TUF",
            "variantName": "16GB / 512GB SSD",
            "sku": "ASUS-TUF-16-512",
            "quantity": 2,
            "unitPrice": 25000000,
            "itemTotal": 50000000,
            "valid": true,
            "invalidReasonCode": null
          }
        ],
        "itemsSubtotal": 50000000,
        "shippingFee": 30000,
        "shopTotal": 50030000
      }
    ],
    "invalidItems": [],
    "totalItemsSubtotal": 50000000,
    "totalShippingFee": 30000,
    "grandTotal": 50030000,
    "allItemsValid": true,
    "addressId": "uuid",
    "cartVersion": 12
  }
}
```

Field đổi tên so với bản mô tả cũ:
- `groups` → **`shops`**
- `valid` (cấp response) → **`allItemsValid`**
- `variantOptions` (mảng) → **`variantName`** (string)
- `subtotal` (item) → **`itemTotal`**
- `subtotal` (per shop) → **`itemsSubtotal`**, có thêm `shopTotal`
- `subtotal` (tổng) → **`totalItemsSubtotal`**
- `invalidReason` → **`invalidReasonCode`**

`invalidItems[]` dùng đúng shape `CheckoutPreviewItemResult` như item trong `shops[].items[]` ở trên (có `variantId`, `productName`, `invalidReasonCode`...) — không phải shape riêng với `availableStock`/`requestedQuantity`.

`invalidReasonCode` chỉ có **3 giá trị thật**:
| Code | Message gợi ý |
|---|---|
| `PRODUCT_INACTIVE` | Sản phẩm không còn bán |
| `VARIANT_INACTIVE` | Phiên bản sản phẩm không còn bán |
| `INSUFFICIENT_STOCK` | Không đủ hàng |

**Không có** `PRICE_CHANGED` hay `ADDRESS_INVALID` — backend chưa phát hiện 2 trường hợp này qua preview.

Khi `allItemsValid: false` → disable nút "Đặt hàng" và hiển thị lý do theo từng item.

---

## Place Order (tạo đơn hàng) — **2 bước tách rời, không gộp**

### Bước 1 — tạo order, CHƯA khởi tạo thanh toán

```http
POST /api/orders
Idempotency-Key: <uuid-v4>  ← TẠO MỘT LẦN, GIỮ LẠI ĐỂ RETRY

{ "addressId": "uuid" }
```

**Request KHÔNG có `paymentMethod`.** Response (`CheckoutResponse`) **KHÔNG có `paymentUrl` hay `paymentMethod`**:
```json
{
  "code": 200,
  "data": {
    "checkoutSessionId": "uuid",
    "orderIds": ["uuid-order-1", "uuid-order-2"],
    "status": "PENDING_PAYMENT",
    "itemsSubtotal": 50000000,
    "shippingFee": 30000,
    "totalAmount": 50030000,
    "expiresAt": "2026-06-20T10:15:00Z"
  }
}
```

Đây là điểm gây nhầm lẫn lớn nhất trong toàn bộ tài liệu cũ: đặt hàng **không tự động khởi tạo thanh toán**. Response chỉ tạo order ở trạng thái `PENDING_PAYMENT` và trả về `checkoutSessionId`.

### Bước 2 — khởi tạo thanh toán (bắt buộc gọi tiếp)

```http
POST /api/payments/initiate
{ "checkoutSessionId": "uuid", "method": "VNPAY" }   // hoặc "COD" — field tên là `method`, không phải `paymentMethod`
```

Response (`PaymentStatusResponse`):
```json
{
  "checkoutSessionId": "uuid",
  "paymentAttemptId": "uuid",
  "status": "PENDING",
  "orderIds": ["uuid-order-1", "uuid-order-2"],
  "nextAction": "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?...",
  "expiresAt": "2026-06-20T10:15:00Z",
  "reconciliationReason": null
}
```

`nextAction` là **URL string** cần redirect tới (VNPAY), hoặc `null` (COD — đã settle ngay, không cần redirect).

```ts
const [idempotencyKey] = useState(() => uuidv4()); // tạo 1 lần, giữ để retry

async function placeOrder() {
  const { data: checkoutRes } = await api.post('/api/orders',
    { addressId }, { headers: { 'Idempotency-Key': idempotencyKey } });

  const { data: paymentRes } = await api.post('/api/payments/initiate', {
    checkoutSessionId: checkoutRes.data.checkoutSessionId,
    method: paymentMethod, // 'VNPAY' | 'COD'
  });

  if (paymentRes.data.nextAction) {
    window.location.href = paymentRes.data.nextAction;
  } else {
    router.push(`/orders/${checkoutRes.data.orderIds[0]}`);
  }
}
```

Xem chi tiết VNPay flow ở [05-payment.md](05-payment.md).
