export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

// Auth
export interface User {
  id: string;
  email: string;
  fullName: string | null;
  role: 'BUYER' | 'SELLER' | 'ADMIN';
  emailVerified: boolean;
  avatarUrl: string | null;
  shopId: string | null;
  shopName: string | null;
}

// Backend only returns the access token; the refresh token is set as an httpOnly cookie.
export interface LoginResponse {
  accessToken: string;
}

// Matches com.shopee.monolith.modules.user.dto.response.CurrentUserResponse (GET /api/users/me)
export interface CurrentUserResponse {
  id: string;
  email: string;
  role: 'BUYER' | 'SELLER' | 'ADMIN';
  status: 'PENDING_VERIFICATION' | 'ACTIVE' | 'INACTIVE' | 'LOCKED';
  avatar: { publicUrl: string } | null;
  shop: { id: string; name: string } | null;
}

// Catalog
// Matches com.shopee.monolith.modules.media.dto.response.ProductMediaSummary
export interface ProductMediaSummary {
  mediaId: string;
  publicUrl: string;
  objectKey: string;
  contentType: string;
  sortOrder: number;
  cover: boolean;
}

// Matches com.shopee.monolith.modules.product.dto.response.ShopSummaryDto
export interface ShopSummaryDto {
  id: string;
  name: string;
  rating: number | null;
}

// Structured publish/checkout eligibility issue codes (see backend ProductEligibilityIssue enum)
export type ProductEligibilityIssue = 'PRODUCT_NOT_ACTIVE' | 'NO_ACTIVE_VARIANT' | 'NO_POSITIVE_PRICE' | 'NO_STOCK';

// Matches com.shopee.monolith.modules.product.dto.response.ProductCardResponse
export interface ProductCardResponse {
  id: string;
  name: string;
  brand: string | null;
  sellerSku: string | null;
  coverImageUrl: string | null;
  coverMediaId: string | null;
  coverObjectKey: string | null;
  coverContentType: string | null;
  minPrice: number;
  maxPrice: number;
  status: 'ACTIVE' | 'INACTIVE' | 'DRAFT' | 'DELETED';
  shopId: string;
  shopName: string;
  shopRating: number | null;
  categoryPath: string | null;
  checkoutEligible: boolean;
  eligibilityIssues: ProductEligibilityIssue[];
  createdAt: string;
}

// Matches com.shopee.monolith.modules.product.dto.response.ProductVariantDetailResponse
export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  name: string;
  price: number;
  optionLabels: Record<string, string>;
  active: boolean;
  availableStock: number;
  checkoutEligible: boolean;
  coverMedia: ProductMediaSummary | null;
  createdAt: string;
  updatedAt: string;
}

// Matches com.shopee.monolith.modules.product.dto.response.ProductDetailResponse
export interface ProductDetail {
  id: string;
  shopId: string;
  status: string;
  name: string;
  description: string;
  brand: string | null;
  sellerSku: string | null;
  categoryId: string;
  categoryPath: string | null;
  attributes: Record<string, unknown> | null;
  minPrice: number;
  maxPrice: number;
  hasCover: boolean;
  media: ProductMediaSummary[];
  variants: ProductVariant[];
  eligibilityIssues: ProductEligibilityIssue[];
  shop: ShopSummaryDto;
  totalAvailableStock: number;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryNode {
  id: string;
  parentId: string | null;
  name: string;
  path: string;
}

// Matches com.shopee.monolith.modules.user.dto.response.ShopResponse.
// No banner/productCount/followerCount support on the backend yet.
export interface ShopDetail {
  id: string;
  ownerId: string;
  name: string;
  address: Address | null;
  description: string | null;
  logo: { publicUrl: string } | null;
  rating: number;
}

// Search
// Matches com.shopee.monolith.modules.search.dto.response.SearchResponse
// (products is nested, no facets — backend does not compute brand/price-range buckets)
export interface SearchResult extends Page<ProductCardResponse> {
  degraded: boolean;
  degradedReason: string | null;
}

// Cart
// Matches com.shopee.monolith.modules.cart.dto.response.CartItemResponse
export interface CartItem {
  variantId: string;
  productId: string;
  shopId: string;
  shopName: string | null;
  productName: string;
  variantName: string;
  optionLabels: Record<string, string>;
  sku: string;
  price: number;
  coverImageUrl: string | null;
  availableStock: number;
  checkoutEligible: boolean;
  quantity: number;
  selected: boolean;
}

export interface Cart {
  version: number;
  items: CartItem[];
}

// Address
// Matches com.shopee.monolith.modules.user.dto.response.AddressResponse
export interface Address {
  id: string;
  recipientName: string;
  phone: string;
  addressLine: string;
  wardCode: string;
  wardName: string;
  districtCode: string;
  districtName: string;
  provinceCode: string;
  provinceName: string;
  isDefault: boolean;
}

// Checkout
// Matches com.shopee.monolith.modules.order.dto.response.CheckoutPreviewItemResult
export interface CheckoutPreviewItem {
  variantId: string;
  productId: string;
  productName: string;
  variantName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  itemTotal: number;
  valid: boolean;
  invalidReasonCode: 'PRODUCT_INACTIVE' | 'VARIANT_INACTIVE' | 'INSUFFICIENT_STOCK' | null;
}

// Matches com.shopee.monolith.modules.order.dto.response.CheckoutPreviewShopGroup
export interface CheckoutPreviewGroup {
  shopId: string;
  shopName: string;
  items: CheckoutPreviewItem[];
  itemsSubtotal: number;
  shippingFee: number;
  shopTotal: number;
}

// Matches com.shopee.monolith.modules.order.dto.response.CheckoutPreviewResponse
export interface CheckoutPreview {
  shops: CheckoutPreviewGroup[];
  invalidItems: CheckoutPreviewItem[];
  totalItemsSubtotal: number;
  totalShippingFee: number;
  grandTotal: number;
  allItemsValid: boolean;
  addressId: string;
  cartVersion: number;
  discountAmount: number | null;
  voucherError: string | null;
}

// Matches com.shopee.monolith.modules.order.dto.response.CheckoutResponse (POST /api/orders)
export interface CheckoutResponse {
  checkoutSessionId: string;
  orderIds: string[];
  status: string;
  itemsSubtotal: number;
  shippingFee: number;
  totalAmount: number;
  expiresAt: string;
  discountAmount: number | null;
}

// Matches com.shopee.monolith.modules.payment.dto.response.PaymentStatusResponse
// (response of POST /api/payments/initiate and GET /api/payments/status/{checkoutSessionId})
export type PaymentStatus = 'NONE' | 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'EXPIRED' | 'REQUIRES_RECONCILIATION';

export interface PaymentStatusResponse {
  checkoutSessionId: string;
  paymentAttemptId: string | null;
  status: PaymentStatus;
  orderIds: string[];
  // Payment URL for pending online payments (e.g. VNPay redirect); null otherwise. Not a fixed enum.
  nextAction: string | null;
  expiresAt: string;
  reconciliationReason: string | null;
}

// Orders
// Matches com.shopee.monolith.modules.order.model.OrderStatus
export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'CONFIRMED'
  | 'FULFILLED'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED';

// Matches com.shopee.monolith.modules.order.model.OrderPaymentStatus
export type OrderPaymentStatus = 'UNPAID' | 'PAID' | 'FAILED' | 'EXPIRED';

// Matches com.shopee.monolith.modules.order.model.FulfillmentStatus (null until payment confirmed)
export type FulfillmentStatus = 'READY_TO_SHIP' | 'SHIPPED' | 'DELIVERED';

// Matches com.shopee.monolith.modules.order.dto.response.BuyerOrderSummaryResponse
// (GET /api/buyer/orders row — deliberately lightweight, no item/cover preview)
export interface OrderSummary {
  orderId: string;
  shopId: string;
  shopName: string;
  status: OrderStatus;
  paymentStatus: OrderPaymentStatus;
  totalAmount: number;
  itemCount: number;
  coverProductName: string | null;
  coverItemQuantity: number;
  coverImageUrl: string | null;
  createdAt: string;
}

// Matches com.shopee.monolith.modules.order.dto.response.BuyerOrderItemResponse
export interface OrderItem {
  id: string;
  variantId: string;
  productName: string;
  variantName: string;
  sku: string;
  price: number;
  quantity: number;
  subtotal: number;
  reviewed: boolean;
}

// Matches com.shopee.monolith.modules.order.dto.response.BuyerOrderTimelineEvent
export interface OrderTimeline {
  event: string;
  occurredAt: string;
}

// Matches com.shopee.monolith.modules.order.dto.response.BuyerOrderDetailResponse
export interface OrderDetail {
  orderId: string;
  checkoutSessionId: string;
  shopId: string;
  shopName: string;
  status: OrderStatus;
  paymentStatus: OrderPaymentStatus;
  paymentMethod: string | null;
  itemsSubtotal: number;
  shippingFee: number;
  totalAmount: number;
  shippingRecipientName: string;
  shippingPhone: string;
  shippingAddressLine: string;
  shippingWardName: string;
  shippingDistrictName: string;
  shippingProvinceName: string;
  items: OrderItem[];
  timeline: OrderTimeline[];
  createdAt: string;
}



// Review
// Matches com.shopee.monolith.modules.review.dto.response.ReviewResponse
export interface Review {
  id: string;
  productId: string;
  orderItemId: string;
  buyerId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
}

// Matches com.shopee.monolith.modules.review.dto.response.ProductReviewListResponse
// (GET /api/products/{productId}/reviews response shape, not a plain Page<Review>)
export interface ProductReviewListResponse {
  ratingAvg: number;
  ratingCount: number;
  reviews: { items: Review[]; page: number; size: number; totalElements: number; totalPages: number; last: boolean };
}

// Notification
// Matches com.shopee.monolith.modules.notification.dto.response.NotificationResponse
export interface Notification {
  id: string;
  type: 'ORDER_CONFIRMED' | 'ORDER_SHIPPED' | 'ORDER_DELIVERED' | 'REVIEW_REMINDER';
  title: string;
  body: string;
  refType: string | null;
  refId: string | null;
  readAt: string | null;
  createdAt: string;
}

// Chat
// Matches com.shopee.monolith.modules.chat.dto.response.ChatRoomResponse
export interface ChatRoom {
  id: string;
  buyerId: string;
  shopId: string;
  shopName: string;
  buyerLastReadAt: string | null;
  sellerLastReadAt: string | null;
  lastMessageContent: string | null;
  lastMessageSenderId: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  createdAt: string;
}

// Matches com.shopee.monolith.modules.chat.dto.response.ChatMessageResponse
export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  content: string;
  createdAt: string;
}

// AI recommendation chat
export interface RecommendedProductResponse {
  product: ProductCardResponse;
  reasonCodes: string[];
}

// Matches com.shopee.monolith.modules.recommendation.dto.response.RecommendationResponse
// (GET /api/recommendations/home — not paginated, no page/size/totalElements)
export interface RecommendationResponse {
  items: RecommendedProductResponse[];
  degraded: boolean;
  degradedReason: string | null;
  generatedText: string | null;
}

export interface ChatRecommendResponse {
  items: RecommendedProductResponse[];
  degraded: boolean;
  degradedReason: string | null;
  generatedText: string | null;
}

// Inventory
// Matches com.shopee.monolith.modules.inventory.dto.response.InventoryResponse
export interface Inventory {
  id: string;
  variantId: string;
  availableStock: number;
  reservedStock: number;
  createdAt: string;
  updatedAt: string;
}

// Matches com.shopee.monolith.modules.inventory.dto.response.InventoryMovementResponse
export interface InventoryMovement {
  id: string;
  variantId: string;
  movementType: 'INITIAL' | 'STOCK_UPDATE' | 'RESERVE' | 'CONFIRM' | 'RELEASE';
  quantity: number;
  availableStockAfter: number;
  reservedStockAfter: number;
  createdAt: string;
}

// Seller
// Matches com.shopee.monolith.modules.product.dto.response.ProductDetailResponse
export interface SellerProduct {
  id: string;
  name: string;
  status: string;
  media: { mediaId: string; publicUrl: string; cover: boolean }[];
  minPrice: number;
  maxPrice: number;
  variants: unknown[];
  totalAvailableStock: number;
  updatedAt: string;
}

// Matches com.shopee.monolith.modules.order.dto.response.SellerOrderSummaryResponse
export interface SellerOrderSummary {
  orderId: string;
  status: OrderStatus;
  paymentStatus: OrderPaymentStatus;
  paymentMethod: string;
  fulfillmentStatus: FulfillmentStatus | null;
  totalAmount: number;
  itemCount: number;
  shippingRecipientName: string;
  createdAt: string;
}

// Matches com.shopee.monolith.modules.order.dto.response.SellerOrderDetailResponse
export interface SellerOrderDetail {
  orderId: string;
  checkoutSessionId: string;
  status: OrderStatus;
  paymentStatus: OrderPaymentStatus;
  paymentMethod: string | null;
  fulfillmentStatus: FulfillmentStatus | null;
  itemsSubtotal: number;
  shippingFee: number;
  totalAmount: number;
  shippingRecipientName: string;
  shippingPhone: string;
  shippingAddressLine: string;
  shippingWardName: string;
  shippingDistrictName: string;
  shippingProvinceName: string;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

// Matches com.shopee.monolith.modules.order.dto.response.SellerDashboardResponse
export interface SellerDashboard {
  shopId: string;
  totalProducts: number;
  activeProducts: number;
  productCountsByStatus: Record<string, number>;
  orderCountsByFulfillmentStatus: Record<string, number>;
  orderCountsByPaymentStatus: Record<string, number>;
  latestActionableOrders: SellerOrderSummary[];
}

// Matches com.shopee.monolith.modules.media.dto.response.MediaAssetResponse
export interface MediaUploadResponse {
  id: string;
  publicUrl: string;
  contentType: string;
  sizeBytes: number;
  purpose: string;
}

// Admin

// Matches com.shopee.monolith.modules.admin.dto.response.AdminUserResponse
export interface AdminUser {
  id: string;
  email: string;
  role: 'BUYER' | 'SELLER' | 'ADMIN';
  status: 'PENDING_VERIFICATION' | 'ACTIVE' | 'INACTIVE' | 'LOCKED';
  createdAt: string;
}

// Matches com.shopee.monolith.modules.admin.dto.response.AdminShopResponse
export interface AdminShop {
  id: string;
  ownerId: string;
  name: string;
  status: 'ACTIVE' | 'SUSPENDED';
  verified: boolean;
  createdAt: string;
}

// Voucher

export type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';
export type VoucherStatus = 'ACTIVE' | 'INACTIVE' | 'DELETED';

// Matches com.shopee.monolith.modules.voucher.dto.response.VoucherResponse
export interface Voucher {
  id: string;
  code: string;
  discountType: DiscountType;
  discountValue: number;
  maxDiscountAmount: number | null;
  minOrderAmount: number;
  usageLimit: number | null;
  usedCount: number;
  startsAt: string;
  expiresAt: string;
  status: VoucherStatus;
  createdAt: string;
}

// Moderation

export type ReportTargetType = 'PRODUCT' | 'SHOP';
export type ReportReasonCategory = 'COUNTERFEIT' | 'PROHIBITED' | 'MISLEADING' | 'ABUSE' | 'OTHER';
export type ReportStatus = 'PENDING' | 'RESOLVED' | 'REJECTED';

// Matches com.shopee.monolith.modules.moderation.dto.response.ReportResponse
export interface Report {
  id: string;
  reporterId: string;
  targetType: ReportTargetType;
  targetId: string;
  reasonCategory: ReportReasonCategory;
  description: string | null;
  status: ReportStatus;
  resolutionNote: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
}
