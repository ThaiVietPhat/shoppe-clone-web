# 08 — Review & Notification

---

## Review

Review chỉ cho phép sau khi đơn hàng ở trạng thái `COMPLETED`. Mỗi `orderItemId` chỉ được review **một lần**.

### Tạo review

```http
POST /api/reviews
Authorization: Bearer <token>
X-XSRF-TOKEN: <csrf>

{
  "orderItemId": "uuid",
  "rating": 5,
  "comment": "Sản phẩm tốt, giao hàng nhanh!"
}
```

`rating`: 1–5 (bắt buộc)
`comment`: optional

Response:
```json
{
  "code": 200,
  "data": {
    "reviewId": "uuid",
    "rating": 5,
    "comment": "Sản phẩm tốt, giao hàng nhanh!",
    "createdAt": "2025-06-20T10:00:00Z"
  }
}
```

Lỗi thường gặp:
- `400` `ORDER_ITEM_NOT_COMPLETED` — đơn chưa COMPLETED
- `400` `ALREADY_REVIEWED` — đã review order item này rồi

### Xem reviews của sản phẩm

```http
GET /api/products/{productId}/reviews?page=0&size=10&rating=5
Authorization: Bearer <token>  (optional — anonymous cũng xem được)
```

`rating` filter: `1`–`5` hoặc bỏ trống để xem tất cả.

Response:
```json
{
  "code": 200,
  "data": {
    "content": [
      {
        "reviewId": "uuid",
        "rating": 5,
        "comment": "Sản phẩm rất tốt!",
        "reviewer": {
          "userId": "uuid",
          "fullName": "Nguyen Van A",
          "avatarUrl": "https://..."
        },
        "orderItemSnapshot": {
          "variantOptions": [{ "name": "RAM", "value": "16GB" }]
        },
        "createdAt": "2025-06-20T10:00:00Z"
      }
    ],
    "page": 0,
    "totalElements": 45,
    "totalPages": 5,
    "last": false,
    "summary": {
      "averageRating": 4.7,
      "totalReviews": 45,
      "distribution": {
        "5": 30,
        "4": 10,
        "3": 3,
        "2": 1,
        "1": 1
      }
    }
  }
}
```

### Cập nhật review (trong giới hạn thời gian)

```http
PATCH /api/reviews/{reviewId}
Authorization: Bearer <token>
X-XSRF-TOKEN: <csrf>

{
  "rating": 4,
  "comment": "Đã dùng lâu hơn, vẫn tốt nhưng pin hơi yếu"
}
```

---

## Notification

Notification inbox là **REST-only** — email là side effect không đồng bộ, không phải primary UI source.

### Lấy danh sách notifications

```http
GET /api/notifications?page=0&size=20&unreadOnly=false
Authorization: Bearer <token>
```

Response:
```json
{
  "code": 200,
  "data": {
    "content": [
      {
        "notificationId": "uuid",
        "type": "ORDER_CONFIRMED",
        "title": "Đơn hàng đã được xác nhận",
        "body": "Đơn hàng #ORD-001 của bạn đã được xác nhận thanh toán",
        "read": false,
        "metadata": {
          "orderId": "uuid"
        },
        "createdAt": "2025-06-20T08:31:00Z"
      },
      {
        "notificationId": "uuid",
        "type": "ORDER_SHIPPED",
        "title": "Đơn hàng đang được giao",
        "body": "Đơn hàng #ORD-001 đang trên đường giao đến bạn",
        "read": true,
        "metadata": {
          "orderId": "uuid",
          "trackingNumber": "GHN123456"
        },
        "createdAt": "2025-06-20T10:00:00Z"
      }
    ],
    "page": 0,
    "totalElements": 12,
    "unreadCount": 3
  }
}
```

`type` values:
| Type | Trigger |
|---|---|
| `ORDER_CONFIRMED` | Payment thành công |
| `ORDER_SHIPPED` | Seller ship đơn |
| `ORDER_DELIVERED` | Seller mark delivered |
| `ORDER_COMPLETED` | Đơn hoàn tất |
| `ORDER_CANCELLED` | Đơn bị huỷ |
| `REVIEW_REMINDER` | Nhắc review sau khi delivered |

`metadata` chứa các ID liên quan để navigate (orderId, productId, ...).

### Số lượng chưa đọc (cho badge)

```http
GET /api/notifications/unread-count
Authorization: Bearer <token>
```

Response:
```json
{
  "code": 200,
  "data": { "count": 3 }
}
```

Poll endpoint này mỗi 30–60 giây để cập nhật badge. Hoặc dùng STOMP nếu muốn realtime (hiện tại chưa có endpoint push notification qua STOMP — chỉ chat).

### Đánh dấu đã đọc

```http
POST /api/notifications/{notificationId}/read
Authorization: Bearer <token>
X-XSRF-TOKEN: <csrf>
```

Response: `{ "code": 200, "data": null }`

### Đánh dấu tất cả đã đọc

```http
POST /api/notifications/read-all
Authorization: Bearer <token>
X-XSRF-TOKEN: <csrf>
```

---

## UI Patterns

### Review flow

```
1. Buyer vào trang order detail
2. Với mỗi item có `reviewed: false` và order status = COMPLETED
   → Hiển thị nút "Viết đánh giá"
3. Click → mở modal/drawer chọn sao + nhập comment
4. POST /api/reviews → cập nhật UI ngay (optimistic update hoặc refetch)
```

### Notification badge

```ts
// Poll unread count mỗi 60 giây
useEffect(() => {
  const fetchUnreadCount = async () => {
    const { data } = await api.get('/api/notifications/unread-count');
    setUnreadCount(data.data.count);
  };

  fetchUnreadCount();
  const interval = setInterval(fetchUnreadCount, 60_000);
  return () => clearInterval(interval);
}, []);
```

### Navigate từ notification

```ts
function handleNotificationClick(notification: Notification) {
  // Đánh dấu đọc
  api.post(`/api/notifications/${notification.notificationId}/read`);

  // Navigate theo type
  switch (notification.type) {
    case 'ORDER_CONFIRMED':
    case 'ORDER_SHIPPED':
    case 'ORDER_DELIVERED':
    case 'ORDER_COMPLETED':
    case 'ORDER_CANCELLED':
      router.push(`/orders/${notification.metadata.orderId}`);
      break;
    case 'REVIEW_REMINDER':
      router.push(`/orders/${notification.metadata.orderId}#review`);
      break;
  }
}
```
