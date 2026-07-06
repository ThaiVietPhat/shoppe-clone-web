# 05 — Payment

> Đối chiếu lại với code thật (`PaymentController`, `VNPayWebhookController`, `PaymentStatusResponse`). Bản trước bịa ra một endpoint JSON `GET /api/payments/vnpay/return` và request field `paymentMethod` — cả hai đều sai. Đã sửa toàn bộ.

---

## Hai payment method

| Method | Flow |
|---|---|
| `COD` | `POST /api/payments/initiate` settle ngay, `nextAction: null` |
| `VNPAY` | `nextAction` là URL redirect tới VNPay sandbox; sau khi thanh toán, VNPay redirect trình duyệt tới backend, backend redirect tiếp về frontend |

Xem [04-cart-checkout.md](04-cart-checkout.md) cho flow đầy đủ tạo order (`POST /api/orders`) rồi khởi tạo thanh toán (`POST /api/payments/initiate`) — 2 bước tách rời.

---

## Initiate Payment

```http
POST /api/payments/initiate
Authorization: Bearer <token>

{ "checkoutSessionId": "uuid", "method": "VNPAY" }
```

Request field tên là **`method`** (không phải `paymentMethod`). Chỉ được tạo 1 payment attempt chưa kết thúc (non-terminal) cho mỗi checkout session — gọi lại `/initiate` khi đã có attempt đang `PENDING` sẽ trả về chính attempt đó, không tạo attempt mới.

Response (`PaymentStatusResponse`), dùng chung cho cả `/initiate` và `/status/{id}`:
```json
{
  "code": 200,
  "data": {
    "checkoutSessionId": "uuid",
    "paymentAttemptId": "uuid",
    "status": "PENDING",
    "orderIds": ["uuid-order-1"],
    "nextAction": "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?...",
    "expiresAt": "2026-06-20T10:15:00Z",
    "reconciliationReason": null
  }
}
```

- COD → `status` chuyển thẳng sang trạng thái settled (không có bước "chờ") và `nextAction: null`.
- VNPAY → `nextAction` là **URL string** cần `window.location.href = nextAction` để redirect.

**Không có field `paymentUrl`** ở bất kỳ response nào — luôn đọc `nextAction`.

---

## VNPay Return — backend redirect 2 bước, KHÔNG có endpoint JSON verify

Đây là điểm khác biệt lớn nhất so với tài liệu cũ (tài liệu cũ bịa ra `GET /api/payments/vnpay/return` trả JSON — **endpoint này không tồn tại**).

Flow thật:

```
1. window.location.href = nextAction   (redirect sang trang VNPay)
2. User thanh toán trên VNPay
3. VNPay gọi GET /api/payments/return/vnpay?vnp_TxnRef=...&vnp_ResponseCode=...  (browser redirect, không phải API call của FE)
4. Backend (VNPayWebhookController.handleReturn) KHÔNG xử lý state ở bước này —
   chỉ tra checkoutSessionId từ vnp_TxnRef rồi 302 redirect trình duyệt về:
   <FRONTEND_URL>/payment/return?checkoutSessionId=uuid
   (hoặc ?error=PAYMENT_NOT_FOUND nếu không tra được)
5. Frontend route /payment/return đọc query param `checkoutSessionId` từ URL của chính nó
   (KHÔNG tự gọi endpoint nào để "verify" — chỉ đọc query param)
6. Frontend bắt đầu poll GET /api/payments/status/{checkoutSessionId}
```

**State thật sự được settle qua IPN webhook server-to-server** (`POST /api/payments/webhook/vnpay`, VNPay gọi trực tiếp tới backend, không qua trình duyệt) — route "return" ở bước 3-4 **không làm thay đổi state gì cả**, chỉ để đưa user quay lại đúng trang frontend kèm `checkoutSessionId`. Vì vậy frontend luôn phải **poll trạng thái** thay vì tin vào việc "redirect thành công = thanh toán thành công".

```ts
// Route: /payment/return
const sessionId = useSearchParams().get('checkoutSessionId'); // đọc trực tiếp, không gọi API verify nào khác
if (!sessionId) {
  // query có thể là ?error=PAYMENT_NOT_FOUND thay vì checkoutSessionId
  showError();
} else {
  startPolling(sessionId); // xem mục Polling bên dưới
}
```

Xem implementation thật tại [payment/return/page.tsx](../../src/app/(buyer)/payment/return/page.tsx) — đã đúng theo flow này.

---

## Polling Payment Status

```http
GET /api/payments/status/{checkoutSessionId}
Authorization: Bearer <token>
```

Response: `PaymentStatusResponse` — cùng shape với `/initiate` ở trên.

`status` values:
| Status | Ý nghĩa | UI |
|---|---|---|
| `PENDING` | Đang chờ thanh toán | Spinner, tiếp tục poll |
| `SUCCEEDED` | Thanh toán thành công | Redirect tới `/orders/{orderIds[0]}` |
| `FAILED` | Thanh toán thất bại | Thông báo, nút "Thử lại" gọi lại `/initiate` |
| `EXPIRED` | Hết giờ thanh toán | Thông báo, quay về giỏ hàng |
| `REQUIRES_RECONCILIATION` | Cần đối soát thủ công | Hiển thị `reconciliationReason`, nút "Liên hệ hỗ trợ" |

**Không có field `nextAction` dạng enum** (`WAIT`/`REDIRECT_TO_ORDER`/...) như tài liệu cũ mô tả — `nextAction` **luôn là URL string hoặc `null`**, chỉ dùng khi tạo/thử lại attempt (VNPAY), không dùng để điều hướng UI sau khi poll. UI tự quyết định hành động dựa trên `status`, không dựa vào `nextAction` khi polling.

```ts
const POLL_INTERVAL = 3000;   // 3 giây
const POLL_TIMEOUT = 15 * 60 * 1000; // 15 phút

async function poll(checkoutSessionId: string, startedAt: number) {
  const { data } = await api.get(`/api/payments/status/${checkoutSessionId}`);
  const result = data.data;

  if (result.status === 'SUCCEEDED') {
    router.replace(`/orders/${result.orderIds[0]}`);
    return;
  }
  if (result.status === 'PENDING' && Date.now() - startedAt < POLL_TIMEOUT) {
    setTimeout(() => poll(checkoutSessionId, startedAt), POLL_INTERVAL);
  }
  // FAILED / EXPIRED / REQUIRES_RECONCILIATION: render kết quả, dừng poll
}
```

---

## Thử lại thanh toán (retry sau FAILED)

Gọi lại chính endpoint `/initiate` với `checkoutSessionId` cũ:

```http
POST /api/payments/initiate
{ "checkoutSessionId": "uuid", "method": "VNPAY" }
```

Điều kiện: checkout session phải còn ở trạng thái payable (chưa `EXPIRED`) và không có attempt nào khác đang `PENDING`.

---

## UI checklist

- [x] `/payment/return` route: đọc `checkoutSessionId` từ query param của chính URL frontend (không gọi endpoint verify nào) — nếu thiếu, đọc `error` param
- [x] Bắt đầu poll `GET /api/payments/status/{id}` ngay khi có `checkoutSessionId`
- [x] Poll mỗi 3 giây khi `status === 'PENDING'`, timeout sau 15 phút
- [x] Xử lý đủ 5 status: `PENDING` / `SUCCEEDED` / `FAILED` / `EXPIRED` / `REQUIRES_RECONCILIATION`
- [x] COD: `nextAction: null`, không redirect, hiển thị kết quả ngay
- [x] Nút "Thử lại thanh toán" khi `FAILED` → gọi lại `/api/payments/initiate` với `{checkoutSessionId, method}`
