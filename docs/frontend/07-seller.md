# 07 — Seller: Shop, Product, Media, Inventory

---

## Seller Profile

### Xem shop của mình

```http
GET /api/shops/me
Authorization: Bearer <token>  (role SELLER)
```

Response:
```json
{
  "code": 200,
  "data": {
    "shopId": "uuid",
    "shopName": "Tech Store VN",
    "description": "Chuyên cung cấp...",
    "logoUrl": "https://...",
    "bannerUrl": "https://...",
    "status": "ACTIVE"
  }
}
```

### Cập nhật shop

```http
PATCH /api/shops/me
Authorization: Bearer <token>
X-XSRF-TOKEN: <csrf>

{
  "shopName": "Tech Store VN Pro",
  "description": "...",
  "logoMediaId": "uuid",
  "bannerMediaId": "uuid"
}
```

---

## Media Upload

**Bắt buộc upload media trước** khi tạo/cập nhật product. Backend trả `mediaId`, sau đó dùng `mediaId` trong payload tạo product.

### Upload ảnh

```http
POST /api/media/images
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <file>
purpose: PRODUCT_IMAGE  // hoặc SHOP_LOGO, SHOP_BANNER, AVATAR
```

Response:
```json
{
  "code": 200,
  "data": {
    "mediaId": "uuid",
    "url": "https://r2.example.com/object-key",
    "contentType": "image/jpeg",
    "size": 204800,
    "purpose": "PRODUCT_IMAGE"
  }
}
```

Giới hạn upload:
- Loại file: `image/jpeg`, `image/png`, `image/webp`
- Kích thước tối đa: 10MB

```ts
async function uploadImage(file: File, purpose: string) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('purpose', purpose);

  const { data } = await api.post('/api/media/images', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data.data; // { mediaId, url, ... }
}
```

**Lưu ý:** Với `multipart/form-data`, Axios tự set `Content-Type` đúng. Đừng tự set header này — sẽ thiếu boundary.

---

## Product CRUD

### Danh sách sản phẩm của seller

```http
GET /api/seller/products?page=0&size=20&status=ALL
Authorization: Bearer <token>
```

`status` filter: `ALL` | `DRAFT` | `ACTIVE` | `INACTIVE`

Response:
```json
{
  "code": 200,
  "data": {
    "items": [
      {
        "productId": "uuid",
        "name": "Laptop Gaming ASUS TUF",
        "status": "ACTIVE",
        "coverImageUrl": "https://...",
        "priceMin": 25000000,
        "priceMax": 35000000,
        "variantCount": 2,
        "totalStock": 15,
        "soldCount": 45,
        "updatedAt": "2025-06-20T08:00:00Z"
      }
    ],
    "page": 0,
    "totalElements": 15,
    "totalPages": 1,
    "last": true
  }
}
```

### Tạo product mới

```http
POST /api/products
Authorization: Bearer <token>
X-XSRF-TOKEN: <csrf>

{
  "name": "Laptop Gaming ASUS TUF A15",
  "description": "Laptop gaming mạnh mẽ với RTX 4060...",
  "brand": "ASUS",
  "categoryId": "uuid",
  "attributes": [
    { "name": "CPU", "value": "Intel Core i7-13700H" },
    { "name": "GPU", "value": "NVIDIA RTX 4060" }
  ],
  "mediaIds": ["uuid-1", "uuid-2", "uuid-3"],
  "coverMediaId": "uuid-1"
}
```

Response:
```json
{
  "code": 200,
  "data": {
    "productId": "uuid",
    "status": "DRAFT"
  }
}
```

Product tạo ra ở trạng thái `DRAFT` — chưa public. Cần thêm variants, tạo inventory, rồi mới publish.

### Cập nhật product

```http
PATCH /api/products/{productId}
Authorization: Bearer <token>
X-XSRF-TOKEN: <csrf>

{
  "name": "Laptop Gaming ASUS TUF A15 2024",
  "description": "...",
  "mediaIds": ["uuid-1", "uuid-2"],
  "coverMediaId": "uuid-1"
}
```

Chỉ cần gửi field muốn cập nhật.

---

## Variants

### Thêm variant

```http
POST /api/products/{productId}/variants
Authorization: Bearer <token>
X-XSRF-TOKEN: <csrf>

{
  "sku": "ASUS-TUF-16-512",
  "price": 25000000,
  "options": [
    { "name": "RAM", "value": "16GB" },
    { "name": "Storage", "value": "512GB SSD" }
  ]
}
```

Response:
```json
{
  "code": 200,
  "data": {
    "variantId": "uuid",
    "sku": "ASUS-TUF-16-512",
    "price": 25000000,
    "options": [...]
  }
}
```

### Cập nhật variant

```http
PATCH /api/products/{productId}/variants/{variantId}
Authorization: Bearer <token>
X-XSRF-TOKEN: <csrf>

{
  "price": 26000000,
  "sku": "ASUS-TUF-16-512-V2"
}
```

---

## Inventory

Mỗi variant có 1 inventory record. Tạo inventory sau khi tạo variant.

### Tạo inventory

```http
POST /api/inventories
Authorization: Bearer <token>
X-XSRF-TOKEN: <csrf>

{
  "variantId": "uuid",
  "initialStock": 50
}
```

### Cập nhật số lượng tồn kho

```http
PATCH /api/inventories/variants/{variantId}/stock
Authorization: Bearer <token>
X-XSRF-TOKEN: <csrf>

{
  "quantity": 100,
  "note": "Nhập thêm hàng tháng 6"
}
```

### Xem lịch sử biến động kho

```http
GET /api/inventories/variants/{variantId}/movements?page=0&size=20
Authorization: Bearer <token>
```

Response:
```json
{
  "code": 200,
  "data": {
    "items": [
      {
        "type": "STOCK_UPDATE",
        "quantity": 100,
        "note": "Nhập thêm hàng tháng 6",
        "timestamp": "2025-06-20T08:00:00Z"
      },
      {
        "type": "RESERVE",
        "quantity": -2,
        "orderId": "uuid",
        "timestamp": "2025-06-20T09:00:00Z"
      },
      {
        "type": "CONFIRM",
        "quantity": 0,
        "orderId": "uuid",
        "note": "Payment confirmed",
        "timestamp": "2025-06-20T09:05:00Z"
      }
    ]
  }
}
```

`type` values: `STOCK_UPDATE` | `RESERVE` | `CONFIRM` | `RELEASE`

---

## Publish / Unpublish

### Publish product (public hóa lên catalog)

```http
POST /api/products/{productId}/publish
Authorization: Bearer <token>
X-XSRF-TOKEN: <csrf>
```

Điều kiện publish:
- Product phải có ít nhất 1 variant active
- Variant phải có inventory với stock ≥ 0
- Product phải có cover image

Response `200`: `{ "code": 200, "data": null }`

Sau publish: product ở trạng thái `ACTIVE`, được index lên Elasticsearch và pgvector.

### Unpublish

```http
POST /api/products/{productId}/unpublish
Authorization: Bearer <token>
X-XSRF-TOKEN: <csrf>
```

Product về `INACTIVE` — ẩn khỏi catalog công khai.

---

## Flow tạo product hoàn chỉnh

```
1. Upload ảnh → nhận mediaIds
2. POST /api/products → nhận productId (DRAFT)
3. POST /api/products/{productId}/variants → nhận variantId (mỗi variant một request)
4. POST /api/inventories → tạo inventory cho mỗi variantId
5. POST /api/products/{productId}/publish → public hóa
```

```ts
async function createProductWithVariants(formData: ProductFormData) {
  // 1. Upload ảnh
  const mediaIds = await Promise.all(
    formData.images.map(file => uploadImage(file, 'PRODUCT_IMAGE').then(m => m.mediaId))
  );

  // 2. Tạo product
  const { data: productData } = await api.post('/api/products', {
    ...formData.basic,
    mediaIds,
    coverMediaId: mediaIds[0],
  });
  const productId = productData.data.productId;

  // 3. Tạo từng variant
  const variants = await Promise.all(
    formData.variants.map(v => api.post(`/api/products/${productId}/variants`, v))
  );

  // 4. Tạo inventory cho từng variant
  await Promise.all(
    variants.map((v, i) => api.post('/api/inventories', {
      variantId: v.data.data.variantId,
      initialStock: formData.variants[i].stock,
    }))
  );

  // 5. Publish
  await api.post(`/api/products/${productId}/publish`);

  return productId;
}
```

---

## Checklist seller flow

- [ ] Upload ảnh trước khi tạo product, lưu `mediaId`
- [ ] Tạo product → variants → inventories → publish (đúng thứ tự)
- [ ] Disable nút "Publish" nếu chưa có variant hoặc inventory
- [ ] Sau khi fulfill order (ship/deliver), refresh order list
- [ ] Seller dashboard: hiển thị `pendingOrders` count nổi bật
