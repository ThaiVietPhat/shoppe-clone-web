// Backend chỉ trả message tiếng Anh (xem ErrorCode.java) — không có field code dạng
// chuỗi (vd "INSUFFICIENT_STOCK") để map an toàn, chỉ có httpStatus số + message.
// Map trực tiếp message tiếng Anh sang tiếng Việt để UI nhất quán; message lạ (chưa
// liệt kê, vd lỗi validation @Valid tự do) rơi về fallback theo ngữ cảnh của từng màn hình.
const ERROR_MESSAGE_VI: Record<string, string> = {
  'Internal server error': 'Lỗi hệ thống, vui lòng thử lại sau',
  'Invalid request': 'Yêu cầu không hợp lệ',
  'Authentication required': 'Vui lòng đăng nhập',
  'Access denied': 'Bạn không có quyền thực hiện thao tác này',
  'Resource not found': 'Không tìm thấy dữ liệu',
  'Resource already exists': 'Dữ liệu đã tồn tại',
  'Service temporarily unavailable': 'Dịch vụ tạm thời không khả dụng',
  'Too many requests — please try again later': 'Quá nhiều lần thử, vui lòng thử lại sau',

  'Invalid email or password': 'Email hoặc mật khẩu không đúng',
  'Token is invalid or expired': 'Token không hợp lệ hoặc đã hết hạn',
  'Security violation detected — please log in again': 'Phát hiện vi phạm bảo mật, vui lòng đăng nhập lại',
  'Please verify your email before logging in': 'Vui lòng xác minh email trước khi đăng nhập',
  'Account is not active': 'Tài khoản chưa được kích hoạt',
  'Verification token has expired': 'Link xác minh đã hết hạn',
  'Verification token has already been used': 'Link xác minh đã được sử dụng',
  'OAuth identity is already linked to another user': 'Tài khoản OAuth này đã liên kết với người dùng khác',

  'User not found': 'Không tìm thấy người dùng',
  'Email is already registered': 'Email đã được đăng ký',
  'Address not found': 'Không tìm thấy địa chỉ',

  'Shop not found': 'Không tìm thấy shop',
  'User already owns a shop': 'Bạn đã có shop',
  'Only the shop owner can perform this action': 'Chỉ chủ shop mới có thể thực hiện thao tác này',

  'Product not found': 'Không tìm thấy sản phẩm',
  'Product variant not found': 'Không tìm thấy phiên bản sản phẩm',
  'Category not found': 'Không tìm thấy danh mục',
  'Invalid product price': 'Giá sản phẩm không hợp lệ',
  'SKU already exists': 'SKU đã tồn tại',
  'Product cannot be published in its current state': 'Sản phẩm không thể đăng bán ở trạng thái hiện tại',
  'Product must have at least one active variant with a positive price to be published':
    'Sản phẩm cần ít nhất một phiên bản đang bán với giá hợp lệ để đăng bán',

  'Insufficient stock available': 'Không đủ hàng trong kho',
  'Inventory not found': 'Không tìm thấy tồn kho',
  'Inventory already exists for this variant': 'Tồn kho cho phiên bản này đã tồn tại',
  'Stock quantity must be non-negative': 'Số lượng tồn kho không được âm',

  'Order not found': 'Không tìm thấy đơn hàng',
  'Order cannot be cancelled in its current state': 'Đơn hàng không thể huỷ ở trạng thái hiện tại',
  'Order cannot transition fulfillment state from its current state':
    'Không thể chuyển trạng thái giao hàng từ trạng thái hiện tại',
  'Idempotency-Key header is required': 'Thiếu Idempotency-Key',
  'Checkout session not found': 'Không tìm thấy phiên thanh toán',
  'Idempotency key conflict: request payload mismatch': 'Yêu cầu bị trùng nhưng dữ liệu khác nhau',
  'An identical request is currently processing': 'Yêu cầu giống hệt đang được xử lý',

  'Payment not found': 'Không tìm thấy giao dịch thanh toán',
  'Webhook signature verification failed': 'Xác minh chữ ký webhook thất bại',
  'Another payment attempt is already in progress for this checkout session':
    'Đã có một giao dịch thanh toán khác đang xử lý cho phiên này',
  'Checkout session is not payable in its current state': 'Phiên thanh toán không thể thanh toán ở trạng thái hiện tại',

  'Voucher not found': 'Không tìm thấy voucher',
  'Voucher has expired': 'Voucher đã hết hạn',
  'Voucher usage limit has been reached': 'Voucher đã hết lượt sử dụng',

  'Cart is empty': 'Giỏ hàng trống',
  'No items selected for checkout': 'Chưa chọn sản phẩm để thanh toán',
  'No valid shipping address found': 'Không tìm thấy địa chỉ giao hàng hợp lệ',

  'Review not found': 'Không tìm thấy đánh giá',
  'This order item has already been reviewed': 'Sản phẩm này đã được đánh giá',
  'Order must be delivered or completed before reviewing': 'Đơn hàng phải được giao hoặc hoàn thành trước khi đánh giá',

  'Notification not found': 'Không tìm thấy thông báo',

  'Chat room not found': 'Không tìm thấy phòng chat',
  'You are not a participant of this chat room': 'Bạn không phải thành viên của phòng chat này',

  'File type is not allowed': 'Định dạng file không được hỗ trợ',
  'File size exceeds the maximum allowed limit': 'Kích thước file vượt quá giới hạn cho phép',
  'Media asset not found': 'Không tìm thấy tệp media',
  'Media asset does not belong to this shop': 'Tệp media không thuộc shop này',
};

/** Dịch message lỗi backend (tiếng Anh) sang tiếng Việt; message lạ dùng fallback theo ngữ cảnh. */
export function getApiErrorMessage(err: unknown, fallback: string): string {
  const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
  if (message && ERROR_MESSAGE_VI[message]) return ERROR_MESSAGE_VI[message];
  return fallback;
}
