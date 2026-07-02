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
export interface MediaInfo {
  mediaId: string;
  url: string;
  contentType: string;
}

export interface ShopSummary {
  shopId: string;
  shopName: string;
  logoUrl: string | null;
}

export interface ProductCardResponse {
  productId: string;
  name: string;
  slug: string | null;
  coverImage: MediaInfo | null;
  priceMin: number;
  priceMax: number;
  shop: ShopSummary;
  rating: number | null;
  soldCount: number;
  status: 'ACTIVE' | 'INACTIVE' | 'DRAFT' | 'DELETED';
  checkoutEligible: boolean;
  categoryPath: string | null;
  reasonCode?: string;
  reasonLabel?: string;
}

export interface VariantOption {
  name: string;
  value: string;
}

export interface ProductVariant {
  variantId: string;
  sku: string;
  options: VariantOption[];
  price: number;
  stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  availableStock: number;
  checkoutEligible: boolean;
}

export interface ProductAttribute {
  name: string;
  value: string;
}

export interface ProductDetail {
  productId: string;
  name: string;
  description: string;
  brand: string | null;
  categoryPath: string | null;
  status: string;
  checkoutEligible: boolean;
  attributes: ProductAttribute[];
  priceMin: number;
  priceMax: number;
  rating: number | null;
  soldCount: number;
  shop: ShopSummary & { description?: string; bannerUrl?: string | null };
  media: (MediaInfo & { isPrimary: boolean })[];
  variants: ProductVariant[];
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
  description: string | null;
  logo: { publicUrl: string } | null;
  rating: number;
}

// Search
export interface PriceRange {
  label: string;
  min: number;
  max: number;
  count: number;
}

export interface SearchFacets {
  brands: string[];
  priceRanges: PriceRange[];
}

export interface SearchResult extends Page<ProductCardResponse> {
  degraded: boolean;
  facets?: SearchFacets;
}

// Cart
export interface CartItem {
  variantId: string;
  productId: string;
  productName: string;
  variantOptions: VariantOption[];
  sku: string;
  price: number;
  coverImage: MediaInfo | null;
  shopId: string;
  shopName: string;
  quantity: number;
  selected: boolean;
  stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  availableStock: number;
  checkoutEligible: boolean;
}

export interface Cart {
  version: number;
  items: CartItem[];
}

// Address
export interface Address {
  addressId: string;
  recipientName: string;
  phone: string;
  street: string;
  ward: string;
  district: string;
  province: string;
  isDefault: boolean;
}

// Checkout
export interface CheckoutPreviewItem {
  variantId: string;
  productName: string;
  variantOptions: VariantOption[];
  quantity: number;
  unitPrice: number;
  subtotal: number;
  valid: boolean;
  invalidReason: string | null;
}

export interface CheckoutPreviewGroup {
  shopId: string;
  shopName: string;
  items: CheckoutPreviewItem[];
  subtotal: number;
  shippingFee: number;
}

export interface CheckoutPreview {
  valid: boolean;
  groups: CheckoutPreviewGroup[];
  subtotal: number;
  totalShippingFee: number;
  grandTotal: number;
  invalidItems: {
    variantId: string;
    productName: string;
    invalidReason: string;
    availableStock: number;
    requestedQuantity: number;
  }[];
}

export interface PlaceOrderResponse {
  checkoutSessionId: string;
  orderIds: string[];
  paymentMethod: 'VNPAY' | 'COD';
  grandTotal: number;
  expiresAt: string;
  paymentUrl?: string;
}

// Orders
// Matches com.shopee.monolith.modules.order.model.OrderStatus, plus the FulfillmentStatus
// values (READY_TO_SHIP/SHIPPED) some UI also renders as if they were an order status.
export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'CONFIRMED'
  | 'READY_TO_SHIP'
  | 'SHIPPED'
  | 'FULFILLED'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED';

export interface OrderSummary {
  orderId: string;
  checkoutSessionId: string;
  shop: ShopSummary;
  status: OrderStatus;
  paymentMethod: string;
  paymentStatus: string;
  grandTotal: number;
  itemCount: number;
  coverItem: {
    productName: string;
    variantOptions: VariantOption[];
    coverImageUrl: string | null;
    quantity: number;
    unitPrice: number;
  };
  createdAt: string;
  canCancel: boolean;
  canReview: boolean;
}

export interface OrderItem {
  orderItemId: string;
  productId: string;
  variantId: string;
  productName: string;
  variantOptions: VariantOption[];
  sku: string;
  coverImageUrl: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  reviewed: boolean;
}

export interface OrderTimeline {
  status: OrderStatus;
  timestamp: string;
  label: string;
}

export interface OrderDetail {
  orderId: string;
  checkoutSessionId: string;
  status: OrderStatus;
  paymentMethod: string;
  paymentStatus: string;
  canCancel: boolean;
  canReview: boolean;
  shop: ShopSummary;
  shippingAddress: Omit<Address, 'addressId' | 'isDefault'>;
  items: OrderItem[];
  breakdown: {
    subtotal: number;
    shippingFee: number;
    grandTotal: number;
  };
  timeline: OrderTimeline[];
}

// Seller order list item
export interface SellerOrderSummary {
  orderId: string;
  status: OrderStatus;
  buyer: { userId: string; fullName: string };
  grandTotal: number;
  createdAt: string;
  canShip: boolean;
  canDeliver: boolean;
}

// Payment
export type PaymentStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'EXPIRED' | 'REQUIRES_RECONCILIATION';
export type NextAction = 'WAIT' | 'REDIRECT_TO_ORDER' | 'RETRY_PAYMENT' | 'CONTACT_SUPPORT';

export interface PaymentStatusResponse {
  checkoutSessionId: string;
  paymentAttemptId: string;
  status: PaymentStatus;
  orderIds: string[];
  nextAction: NextAction;
  expiresAt: string;
  reconciliationReason: string | null;
}

// Review
export interface Review {
  reviewId: string;
  rating: number;
  comment: string | null;
  reviewer: { userId: string; fullName: string; avatarUrl: string | null };
  orderItemSnapshot: { variantOptions: VariantOption[] };
  createdAt: string;
}

export interface ReviewSummary {
  averageRating: number;
  totalReviews: number;
  distribution: Record<string, number>;
}

// Notification
export interface Notification {
  notificationId: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  metadata: Record<string, string>;
  createdAt: string;
}

// Chat
export interface ChatRoom {
  roomId: string;
  shop: ShopSummary;
  lastMessage: {
    content: string;
    senderType: 'BUYER' | 'SELLER';
    sentAt: string;
  } | null;
  unreadCount: number;
  createdAt: string;
}

export interface ChatMessage {
  messageId: string;
  roomId: string;
  senderId: string;
  senderType: 'BUYER' | 'SELLER';
  content: string;
  sentAt: string;
  read: boolean;
}

// AI recommendation chat
export interface RecommendedProductResponse {
  product: ProductCardResponse;
  reasonCodes: string[];
}

export interface ChatRecommendResponse {
  items: RecommendedProductResponse[];
  degraded: boolean;
  degradedReason: string | null;
  generatedText: string | null;
}

// Seller
export interface SellerProduct {
  productId: string;
  name: string;
  status: string;
  coverImageUrl: string | null;
  priceMin: number;
  priceMax: number;
  variantCount: number;
  totalStock: number;
  soldCount: number;
  updatedAt: string;
}

// Matches com.shopee.monolith.modules.order.dto.response.SellerOrderSummaryResponse
export interface SellerOrderSummary {
  orderId: string;
  status: OrderStatus;
  paymentStatus: string;
  paymentMethod: string;
  fulfillmentStatus: string | null;
  totalAmount: number;
  itemCount: number;
  shippingRecipientName: string;
  createdAt: string;
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
