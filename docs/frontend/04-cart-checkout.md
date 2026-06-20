# 04 — Cart, Checkout Preview, Place Order

---

## Cart

Cart lưu phía server (Redis). Mỗi item trong cart là `variantId → quantity`. Cart tự hết hạn sau 7 ngày không hoạt động.

### Xem giỏ hàng

```http
GET /api/cart
Authorization: Bearer <token>
```

Response:
```json
{
  "code": 200,
  "data": {
    "version": 12,
    "items": [
      {
        "variantId": "uuid",
        "productId": "uuid",
        "productName": "Laptop Gaming ASUS TUF",
        "variantOptions": [
          { "name": "RAM", "value": "16GB" },
          { "name": "Storage", "value": "512GB SSD" }
        ],
        "sku": "ASUS-TUF-16-512",
        "price": 25000000,
        "coverImage": { "mediaId": "uuid", "url": "https://...", "contentType": "image/jpeg" },
        "shopId": "uuid",
        "shopName": "Tech Store VN",
        "quantity": 2,
        "selected": true,
        "stockStatus": "IN_STOCK",
        "availableStock": 5,
        "checkoutEligible": true
      }
    ]
  }
}
```

### Thêm item vào giỏ

```http
POST /api/cart/items
Authorization: Bearer <token>
X-XSRF-TOKEN: <csrf>

{
  "variantId": "uuid",
  "quantity": 1
}
```

Nếu variant đã có trong giỏ → cộng thêm quantity. Không replace.

Response `200`: `{ "code": 200, "data": null }`

### Cập nhật số lượng

```http
PUT /api/cart/items/{variantId}
Authorization: Bearer <token>
X-XSRF-TOKEN: <csrf>

{ "quantity": 3 }
```

Nếu `quantity = 0` → xóa item khỏi giỏ.

### Xóa item khỏi giỏ

```http
DELETE /api/cart/items/{variantId}
Authorization: Bearer <token>
X-XSRF-TOKEN: <csrf>
```

### Chọn / bỏ chọn item để checkout

```http
POST /api/cart/items/select
Authorization: Bearer <token>
X-XSRF-TOKEN: <csrf>

{
  "variantIds": ["uuid1", "uuid2"],
  "selected": true
}
```

- `selected: true` → chọn các items này
- `selected: false` → bỏ chọn

**Quan trọng:** Backend checkout chỉ dùng **selected items** — không bao giờ checkout toàn bộ giỏ nếu chỉ chọn một phần. Frontend phải reflect trạng thái `selected` của từng item.

### Chọn/bỏ chọn tất cả

```http
POST /api/cart/items/select-all
Authorization: Bearer <token>
X-XSRF-TOKEN: <csrf>

{ "selected": true }
```

---

## Địa chỉ giao hàng

### Lấy danh sách địa chỉ

```http
GET /api/users/me/addresses
Authorization: Bearer <token>
```

Response:
```json
{
  "code": 200,
  "data": [
    {
      "addressId": "uuid",
      "recipientName": "Nguyen Van A",
      "phone": "0901234567",
      "street": "123 Nguyen Hue",
      "ward": "Bến Nghé",
      "district": "Quận 1",
      "province": "TP. Hồ Chí Minh",
      "isDefault": true
    }
  ]
}
```

### Thêm địa chỉ

```http
POST /api/users/me/addresses
Authorization: Bearer <token>
X-XSRF-TOKEN: <csrf>

{
  "recipientName": "Nguyen Van A",
  "phone": "0901234567",
  "street": "123 Nguyen Hue",
  "ward": "Bến Nghé",
  "district": "Quận 1",
  "province": "TP. Hồ Chí Minh",
  "isDefault": true
}
```

---

## Checkout Preview

Gọi trước khi đặt hàng để hiển thị breakdown giá và validate. **Không tạo order, không giữ kho.**

```http
POST /api/orders/preview
Authorization: Bearer <token>
X-XSRF-TOKEN: <csrf>

{
  "addressId": "uuid"
}
```

Backend dùng các **selected items** trong cart hiện tại.

Response:
```json
{
  "code": 200,
  "data": {
    "valid": true,
    "groups": [
      {
        "shopId": "uuid",
        "shopName": "Tech Store VN",
        "items": [
          {
            "variantId": "uuid",
            "productName": "Laptop Gaming ASUS TUF",
            "variantOptions": [{ "name": "RAM", "value": "16GB" }],
            "quantity": 2,
            "unitPrice": 25000000,
            "subtotal": 50000000,
            "valid": true,
            "invalidReason": null
          }
        ],
        "subtotal": 50000000,
        "shippingFee": 30000
      }
    ],
    "subtotal": 50000000,
    "totalShippingFee": 30000,
    "grandTotal": 50030000,
    "invalidItems": []
  }
}
```

Khi có item không hợp lệ (`valid: false`):
```json
{
  "valid": false,
  "invalidItems": [
    {
      "variantId": "uuid",
      "productName": "...",
      "invalidReason": "INSUFFICIENT_STOCK",
      "availableStock": 1,
      "requestedQuantity": 3
    }
  ]
}
```

`invalidReason` values và message hiển thị cho user:
| Code | Message gợi ý |
|---|---|
| `PRODUCT_INACTIVE` | Sản phẩm không còn bán |
| `VARIANT_INACTIVE` | Phiên bản sản phẩm không còn bán |
| `PRICE_CHANGED` | Giá đã thay đổi, vui lòng kiểm tra lại |
| `INSUFFICIENT_STOCK` | Không đủ hàng (còn {availableStock}) |
| `ADDRESS_INVALID` | Địa chỉ giao hàng không hợp lệ |

Khi `valid: false` → disable nút "Đặt hàng" và hiển thị lý do theo từng item.

---

## Place Order (tạo đơn hàng)

Sau khi preview OK, gọi place order. Bắt buộc gửi `Idempotency-Key`.

```http
POST /api/orders
Authorization: Bearer <token>
X-XSRF-TOKEN: <csrf>
Idempotency-Key: <uuid-v4>  ← TẠO MỘT LẦN, GIỮ LẠI ĐỂ RETRY

{
  "addressId": "uuid",
  "paymentMethod": "VNPAY"  // hoặc "COD"
}
```

**Quan trọng về Idempotency-Key:**
- Tạo UUID ngay khi user bấm "Đặt hàng"
- Nếu request timeout/lỗi mạng → retry với **cùng key**
- Không tạo key mới khi retry — sẽ tạo đơn trùng

```ts
// Lưu key vào state component, không regenerate khi retry
const [idempotencyKey] = useState(() => uuidv4());

async function placeOrder() {
  const { data } = await api.post('/api/orders', payload, {
    headers: { 'Idempotency-Key': idempotencyKey }
  });
  // redirect tới trang thanh toán
}
```

Response `200`:
```json
{
  "code": 200,
  "data": {
    "checkoutSessionId": "uuid",
    "orderIds": ["uuid-order-1", "uuid-order-2"],
    "paymentMethod": "VNPAY",
    "grandTotal": 50030000,
    "expiresAt": "2025-06-20T10:15:00Z",
    "paymentUrl": "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?..."
  }
}
```

**Sau khi nhận response:**
- `COD`: không có `paymentUrl`, redirect tới trang xác nhận đơn hàng
- `VNPAY`: redirect browser tới `paymentUrl`

```ts
if (data.data.paymentMethod === 'VNPAY') {
  window.location.href = data.data.paymentUrl;
} else {
  // COD
  router.push(`/orders/${data.data.orderIds[0]}`);
}
```

Xem chi tiết VNPay flow ở [05-payment.md](05-payment.md).
