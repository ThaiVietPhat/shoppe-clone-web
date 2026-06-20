# 06 — Orders (Buyer & Seller)

---

## Buyer — Danh sách đơn hàng

```http
GET /api/buyer/orders?page=0&size=20&status=ALL
Authorization: Bearer <token>
```

`status` filter (optional):
- `ALL` — tất cả
- `PENDING_PAYMENT` — chờ thanh toán
- `CONFIRMED` — đã xác nhận
- `READY_TO_SHIP` — chờ giao
- `SHIPPED` — đang vận chuyển
- `DELIVERED` — đã giao
- `COMPLETED` — hoàn tất
- `CANCELLED` — đã huỷ

Response:
```json
{
  "code": 200,
  "data": {
    "content": [
      {
        "orderId": "uuid",
        "checkoutSessionId": "uuid",
        "shop": {
          "shopId": "uuid",
          "shopName": "Tech Store VN",
          "logoUrl": "https://..."
        },
        "status": "CONFIRMED",
        "paymentMethod": "VNPAY",
        "paymentStatus": "SUCCEEDED",
        "grandTotal": 50030000,
        "itemCount": 2,
        "coverItem": {
          "productName": "Laptop Gaming ASUS TUF",
          "variantOptions": [{ "name": "RAM", "value": "16GB" }],
          "coverImageUrl": "https://...",
          "quantity": 2,
          "unitPrice": 25000000
        },
        "createdAt": "2025-06-20T08:30:00Z",
        "canCancel": false,
        "canReview": false
      }
    ],
    "page": 0,
    "totalElements": 5,
    "totalPages": 1,
    "last": true
  }
}
```

---

## Buyer — Chi tiết đơn hàng

```http
GET /api/buyer/orders/{orderId}
Authorization: Bearer <token>
```

Response:
```json
{
  "code": 200,
  "data": {
    "orderId": "uuid",
    "checkoutSessionId": "uuid",
    "status": "DELIVERED",
    "paymentMethod": "VNPAY",
    "paymentStatus": "SUCCEEDED",
    "canCancel": false,
    "canReview": true,

    "shop": {
      "shopId": "uuid",
      "shopName": "Tech Store VN",
      "logoUrl": "https://..."
    },

    "shippingAddress": {
      "recipientName": "Nguyen Van A",
      "phone": "0901234567",
      "street": "123 Nguyen Hue",
      "ward": "Bến Nghé",
      "district": "Quận 1",
      "province": "TP. Hồ Chí Minh"
    },

    "items": [
      {
        "orderItemId": "uuid",
        "productId": "uuid",
        "variantId": "uuid",
        "productName": "Laptop Gaming ASUS TUF",
        "variantOptions": [
          { "name": "RAM", "value": "16GB" },
          { "name": "Storage", "value": "512GB SSD" }
        ],
        "sku": "ASUS-TUF-16-512",
        "coverImageUrl": "https://...",
        "quantity": 2,
        "unitPrice": 25000000,
        "subtotal": 50000000,
        "reviewed": false
      }
    ],

    "breakdown": {
      "subtotal": 50000000,
      "shippingFee": 30000,
      "grandTotal": 50030000
    },

    "timeline": [
      { "status": "PENDING_PAYMENT", "timestamp": "2025-06-20T08:30:00Z", "label": "Đặt hàng" },
      { "status": "CONFIRMED", "timestamp": "2025-06-20T08:31:00Z", "label": "Xác nhận thanh toán" },
      { "status": "READY_TO_SHIP", "timestamp": "2025-06-20T09:00:00Z", "label": "Đang chuẩn bị hàng" },
      { "status": "SHIPPED", "timestamp": "2025-06-20T10:00:00Z", "label": "Đang vận chuyển" },
      { "status": "DELIVERED", "timestamp": "2025-06-20T15:00:00Z", "label": "Đã giao hàng" }
    ]
  }
}
```

**UI notes:**
- Render timeline theo `timeline[]` — highlight trạng thái hiện tại
- Hiển thị nút "Huỷ đơn" chỉ khi `canCancel: true`
- Hiển thị nút "Đánh giá" theo từng `item` khi `item.reviewed === false` và order status = `COMPLETED`

---

## Buyer — Huỷ đơn hàng

Chỉ cancel được khi `canCancel: true` (thường là khi chưa ship).

```http
POST /api/buyer/orders/{orderId}/cancel
Authorization: Bearer <token>
X-XSRF-TOKEN: <csrf>

{
  "reason": "Tôi muốn đổi địa chỉ giao hàng"
}
```

Response `200`: `{ "code": 200, "data": null }`

---

## Order Status Flow

```
PENDING_PAYMENT
  │ (payment success)
  ▼
CONFIRMED
  │ (seller chuẩn bị)
  ▼
READY_TO_SHIP
  │ (seller ship)
  ▼
SHIPPED
  │ (seller deliver)
  ▼
DELIVERED
  │ (auto hoặc buyer confirm)
  ▼
COMPLETED  ← buyer có thể review ở đây
```

`CANCELLED` có thể đến từ: buyer cancel, payment timeout, payment failed.

---

## Seller — Danh sách đơn hàng

```http
GET /api/seller/orders?page=0&size=20&status=ALL
Authorization: Bearer <token>  (phải là SELLER role)
```

Response: tương tự buyer orders nhưng thêm thông tin buyer:
```json
{
  "orderId": "uuid",
  "status": "CONFIRMED",
  "buyer": {
    "userId": "uuid",
    "fullName": "Nguyen Van A"
  },
  "grandTotal": 50030000,
  "createdAt": "2025-06-20T08:30:00Z",
  "canShip": true,
  "canDeliver": false
}
```

---

## Seller — Chi tiết đơn hàng

```http
GET /api/seller/orders/{orderId}
Authorization: Bearer <token>
```

Response: tương tự buyer order detail, có thêm:
- `canShip: boolean` — có thể chuyển sang SHIPPED
- `canDeliver: boolean` — có thể chuyển sang DELIVERED
- Buyer info tối thiểu cho fulfillment (tên + địa chỉ giao hàng)

---

## Seller — Fulfill Order

### Chuyển sang "Đang vận chuyển"

```http
POST /api/seller/orders/{orderId}/ship
Authorization: Bearer <token>
X-XSRF-TOKEN: <csrf>

{
  "trackingNumber": "GHN123456"  // optional
}
```

### Chuyển sang "Đã giao hàng"

```http
POST /api/seller/orders/{orderId}/deliver
Authorization: Bearer <token>
X-XSRF-TOKEN: <csrf>
```

Response cả hai: `{ "code": 200, "data": null }`

---

## Seller — Dashboard

```http
GET /api/seller/dashboard
Authorization: Bearer <token>
```

Response:
```json
{
  "code": 200,
  "data": {
    "totalProducts": 15,
    "activeProducts": 12,
    "pendingOrders": 3,
    "shippedOrders": 5,
    "completedOrders": 48,
    "recentOrders": [
      {
        "orderId": "uuid",
        "buyerName": "Nguyen Van A",
        "grandTotal": 50030000,
        "status": "CONFIRMED",
        "createdAt": "2025-06-20T08:30:00Z"
      }
    ]
  }
}
```
