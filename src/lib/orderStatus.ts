import { OrderStatus } from '@/types/api';

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING_PAYMENT: 'Chờ thanh toán',
  PAID: 'Đã thanh toán',
  CONFIRMED: 'Đã xác nhận',
  READY_TO_SHIP: 'Chờ lấy hàng',
  SHIPPED: 'Đang giao',
  FULFILLED: 'Đã giao xong',
  DELIVERED: 'Đã giao',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã huỷ',
};

export const ORDER_STATUS_CLASS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  PAID: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  CONFIRMED: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  READY_TO_SHIP: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
  SHIPPED: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/20',
  FULFILLED: 'bg-teal-500/15 text-teal-400 border-teal-500/20',
  DELIVERED: 'bg-teal-500/15 text-teal-400 border-teal-500/20',
  COMPLETED: 'bg-green-500/15 text-green-400 border-green-500/20',
  CANCELLED: 'bg-destructive/15 text-destructive border-destructive/20',
};

export const ORDER_STATUS_FILTERS: { value: string; label: string }[] = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'PENDING_PAYMENT', label: 'Chờ thanh toán' },
  { value: 'CONFIRMED', label: 'Đã xác nhận' },
  { value: 'READY_TO_SHIP', label: 'Chờ lấy hàng' },
  { value: 'SHIPPED', label: 'Đang giao' },
  { value: 'DELIVERED', label: 'Đã giao' },
  { value: 'COMPLETED', label: 'Hoàn thành' },
  { value: 'CANCELLED', label: 'Đã huỷ' },
];

export const CHECKOUT_INVALID_REASON: Record<string, string> = {
  PRODUCT_INACTIVE: 'Sản phẩm ngừng kinh doanh',
  VARIANT_INACTIVE: 'Phiên bản ngừng kinh doanh',
  PRICE_CHANGED: 'Giá đã thay đổi',
  INSUFFICIENT_STOCK: 'Không đủ tồn kho',
  ADDRESS_INVALID: 'Địa chỉ không hợp lệ',
};
