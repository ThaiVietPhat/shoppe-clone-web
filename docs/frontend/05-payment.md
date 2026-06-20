# 05 — Payment

---

## Hai payment method

| Method | Flow |
|---|---|
| `COD` | Đặt hàng xong là confirmed luôn, không cần redirect |
| `VNPAY` | Redirect tới VNPay sandbox, sau khi thanh toán VNPay redirect về frontend |

---

## COD Flow

```
[User bấm "Đặt hàng - COD"]
  → POST /api/orders (paymentMethod: "COD")
  → Response trả orderIds, KHÔNG có paymentUrl
  → Frontend redirect tới /orders/{orderId}
  → Đơn đã ở trạng thái CONFIRMED
```

---

## VNPay Flow

```
[User bấm "Đặt hàng - VNPay"]
  → POST /api/orders (paymentMethod: "VNPAY")
  → Response có paymentUrl
  → window.location.href = paymentUrl  ← redirect sang VNPay
  → User nhập thông tin thẻ trên trang VNPay
  → VNPay redirect về: https://your-fe.com/payment/return?vnp_*=...
  → Frontend đọc query params, gọi backend để verify
  → Hiển thị kết quả
```

### Route `/payment/return`

VNPay redirect về URL này với nhiều query params (`vnp_TxnRef`, `vnp_ResponseCode`, v.v.). Frontend **không tự xử lý** — gọi backend để verify và lấy status:

```ts
// Route: /payment/return
// VNPay truyền query params qua URL
const searchParams = new URLSearchParams(location.search);

// Gọi backend với toàn bộ query string
const { data } = await api.get('/api/payments/vnpay/return?' + searchParams.toString());
// Backend verify chữ ký VNPay và trả kết quả
```

```http
GET /api/payments/vnpay/return?vnp_TxnRef=...&vnp_ResponseCode=00&...
Authorization: Bearer <token>
```

Response:
```json
{
  "code": 200,
  "data": {
    "status": "SUCCEEDED",
    "checkoutSessionId": "uuid",
    "orderIds": ["uuid"],
    "message": "Thanh toán thành công"
  }
}
```

```json
{
  "code": 200,
  "data": {
    "status": "FAILED",
    "checkoutSessionId": "uuid",
    "orderIds": ["uuid"],
    "message": "Thanh toán thất bại. Đơn hàng đã bị huỷ."
  }
}
```

---

## Polling Payment Status

Khi không chắc status (user đóng tab, mất kết nối), poll endpoint này:

```http
GET /api/payments/status/{checkoutSessionId}
Authorization: Bearer <token>
```

Response:
```json
{
  "code": 200,
  "data": {
    "checkoutSessionId": "uuid",
    "paymentAttemptId": "uuid",
    "status": "PENDING",
    "orderIds": ["uuid"],
    "nextAction": "WAIT",
    "expiresAt": "2025-06-20T10:15:00Z",
    "reconciliationReason": null
  }
}
```

`status` values:
| Status | Ý nghĩa | UI |
|---|---|---|
| `PENDING` | Đang chờ thanh toán | Spinner, hiển thị countdown đến `expiresAt` |
| `SUCCEEDED` | Thanh toán thành công | Redirect tới trang đơn hàng |
| `FAILED` | Thanh toán thất bại | Thông báo, nút thử lại |
| `EXPIRED` | Hết giờ thanh toán | Thông báo đơn bị huỷ |
| `REQUIRES_RECONCILIATION` | Cần đối soát thủ công | Thông báo "Liên hệ hỗ trợ" |

`nextAction` values:
- `WAIT` — tiếp tục poll
- `REDIRECT_TO_ORDER` — thanh toán xong, redirect
- `RETRY_PAYMENT` — có thể thử lại
- `CONTACT_SUPPORT` — cần hỗ trợ

```ts
// Polling logic
async function pollPaymentStatus(checkoutSessionId: string) {
  const INTERVAL = 3000;  // 3 giây
  const TIMEOUT = 15 * 60 * 1000;  // 15 phút
  const start = Date.now();

  const poll = async () => {
    const { data } = await api.get(`/api/payments/status/${checkoutSessionId}`);
    const { status, nextAction, orderIds } = data.data;

    if (status === 'SUCCEEDED') {
      router.push(`/orders/${orderIds[0]}`);
      return;
    }
    if (['FAILED', 'EXPIRED'].includes(status)) {
      setPaymentFailed(true);
      return;
    }
    if (status === 'REQUIRES_RECONCILIATION') {
      setNeedsSupport(true);
      return;
    }
    if (Date.now() - start < TIMEOUT) {
      setTimeout(poll, INTERVAL);
    }
  };

  await poll();
}
```

---

## Initiate Payment (thử lại thanh toán)

Nếu đơn vẫn đang `PENDING_PAYMENT` và user muốn thanh toán lại (ví dụ đổi sang VNPay sau khi COD):

```http
POST /api/payments/initiate
Authorization: Bearer <token>
X-XSRF-TOKEN: <csrf>

{
  "checkoutSessionId": "uuid",
  "paymentMethod": "VNPAY"
}
```

Response: cùng shape với place order response — có `paymentUrl` nếu VNPAY.

---

## UI checklist

- [ ] `/payment/return` route: đọc query params, gọi `/api/payments/vnpay/return`, hiển thị kết quả
- [ ] Trang "Đang xử lý thanh toán": hiển thị spinner + countdown đến `expiresAt`
- [ ] Poll `/api/payments/status/{id}` mỗi 3 giây khi status = PENDING
- [ ] Xử lý đủ 5 status: PENDING / SUCCEEDED / FAILED / EXPIRED / REQUIRES_RECONCILIATION
- [ ] COD: không cần redirect VNPay, đơn confirmed ngay
- [ ] Nút "Thử lại thanh toán" khi FAILED → gọi `/api/payments/initiate`
