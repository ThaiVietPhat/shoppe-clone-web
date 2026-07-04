import { FulfillmentStatus, OrderPaymentStatus, OrderStatus } from '@/types/api';

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING_PAYMENT: 'Chờ thanh toán',
  PAID: 'Đã thanh toán',
  CONFIRMED: 'Đã xác nhận',
  FULFILLED: 'Đang giao',
  DELIVERED: 'Đã giao',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã huỷ',
};

export const ORDER_STATUS_CLASS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  PAID: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  CONFIRMED: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  FULFILLED: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/20',
  DELIVERED: 'bg-teal-500/15 text-teal-400 border-teal-500/20',
  COMPLETED: 'bg-green-500/15 text-green-400 border-green-500/20',
  CANCELLED: 'bg-destructive/15 text-destructive border-destructive/20',
};

// value '' means "no filter" — GET /api/buyer/orders has no filter param for it
export const ORDER_STATUS_FILTERS: { value: OrderStatus | ''; label: string }[] = [
  { value: '', label: 'Tất cả' },
  { value: 'PENDING_PAYMENT', label: 'Chờ thanh toán' },
  { value: 'CONFIRMED', label: 'Đã xác nhận' },
  { value: 'FULFILLED', label: 'Đang giao' },
  { value: 'DELIVERED', label: 'Đã giao' },
  { value: 'COMPLETED', label: 'Hoàn thành' },
  { value: 'CANCELLED', label: 'Đã huỷ' },
];

export const FULFILLMENT_STATUS_LABEL: Record<FulfillmentStatus, string> = {
  READY_TO_SHIP: 'Chờ lấy hàng',
  SHIPPED: 'Đang giao',
  DELIVERED: 'Đã giao',
};

// GET /api/seller/orders filters by fulfillmentStatus (not order status) — separate value set.
export const SELLER_FULFILLMENT_FILTERS: { value: FulfillmentStatus | ''; label: string }[] = [
  { value: '', label: 'Tất cả' },
  { value: 'READY_TO_SHIP', label: 'Chờ lấy hàng' },
  { value: 'SHIPPED', label: 'Đang giao' },
  { value: 'DELIVERED', label: 'Đã giao' },
];

// Labels for BuyerOrderTimelineEvent.event — PLACED/PAID plus the terminal OrderStatus reached
export const TIMELINE_EVENT_LABEL: Record<string, string> = {
  ...ORDER_STATUS_LABEL,
  PLACED: 'Đã đặt hàng',
  PAID: 'Đã thanh toán',
};

export const PAYMENT_STATUS_LABEL: Record<OrderPaymentStatus, string> = {
  UNPAID: 'Chưa thanh toán',
  PAID: 'Đã thanh toán',
  FAILED: 'Thất bại',
  EXPIRED: 'Hết hạn',
};

// Mirrors backend Order.cancel() precondition (BuyerOrderServiceImpl.cancelOrder)
export function canCancelOrder(status: OrderStatus): boolean {
  return status === 'PENDING_PAYMENT';
}

// Mirrors backend OrderItemReviewData.reviewable (order.getStatus() DELIVERED/COMPLETED)
export function canReviewOrder(status: OrderStatus): boolean {
  return status === 'DELIVERED' || status === 'COMPLETED';
}

// Mirrors backend Order.ship() precondition
export function canShipOrder(paymentStatus: OrderPaymentStatus, fulfillmentStatus: FulfillmentStatus | null): boolean {
  return paymentStatus === 'PAID' && fulfillmentStatus === 'READY_TO_SHIP';
}

// Mirrors backend Order.deliver() precondition
export function canDeliverOrder(fulfillmentStatus: FulfillmentStatus | null): boolean {
  return fulfillmentStatus === 'SHIPPED';
}

export const CHECKOUT_INVALID_REASON: Record<string, string> = {
  PRODUCT_INACTIVE: 'Sản phẩm ngừng kinh doanh',
  VARIANT_INACTIVE: 'Phiên bản ngừng kinh doanh',
  INSUFFICIENT_STOCK: 'Không đủ tồn kho',
};
