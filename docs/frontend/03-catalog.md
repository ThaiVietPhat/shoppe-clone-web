# 03 — Catalog: Homepage, Browse, Search, AI Recommend

> Đối chiếu lại với Swagger sống ngày phiên sửa bug lớn (xem `CLAUDE.md` đầu repo). Bản trước mô tả field tưởng tượng (`productId`, `coverImage`, `priceMin/Max`, `stockStatus`...) không khớp backend thật — đã sửa toàn bộ dưới đây theo `ProductCardResponse`/`ProductDetailResponse`/`ProductVariantDetailResponse` thật.

---

## ProductCardResponse (contract dùng chung trên mọi surface)

```ts
interface ProductCardResponse {
  id: string;                    // KHÔNG phải productId
  name: string;
  brand: string | null;
  sellerSku: string | null;
  coverImageUrl: string | null;  // string phẳng, KHÔNG phải object coverImage: {url}
  coverMediaId: string | null;
  coverObjectKey: string | null;
  coverContentType: string | null;
  minPrice: number;              // KHÔNG phải priceMin
  maxPrice: number;               // KHÔNG phải priceMax
  status: 'ACTIVE' | 'INACTIVE' | 'DRAFT' | 'DELETED';
  shopId: string;
  shopName: string;               // field phẳng, KHÔNG có object shop: {...}
  shopRating: number | null;      // rating của SHOP — sản phẩm không có rating riêng
  categoryPath: string | null;
  checkoutEligible: boolean;
  eligibilityIssues: ('PRODUCT_NOT_ACTIVE' | 'NO_ACTIVE_VARIANT' | 'NO_POSITIVE_PRICE' | 'NO_STOCK')[];
  createdAt: string;
}
```

**Không tồn tại:** `slug`, `rating` (cấp sản phẩm), `soldCount`, `reasonCode`/`reasonLabel` (đó là field của recommendation wrapper, xem mục 6). Nếu cần các field này, phải bổ sung backend trước — đừng đoán giá trị ở FE.

---

## 1. Homepage

```http
GET /api/products/homepage?page=0&size=20
```

Response (`PagedResponse<ProductCardResponse>`, field `items` — không phải `content`):
```json
{
  "code": 200,
  "data": {
    "items": [ /* ProductCardResponse[] */ ],
    "page": 0, "size": 20, "totalElements": 120, "totalPages": 6, "last": false
  }
}
```

---

## 2. Category Browse

```http
GET /api/categories
```

Trả **danh sách phẳng** (không phải cây lồng nhau), field thật: `id`, `parentId`, `name`, `path` (materialized path), `createdAt`, `updatedAt`. Không có `categoryId`, `slug`, `children`.

```http
GET /api/categories/{categoryId}/products?page=0&size=20&sort=NEWEST
```

`sort` chỉ nhận **enum viết hoa**: `NEWEST` (default) | `PRICE_ASC` | `PRICE_DESC`. Không có `soldCount,desc`/`rating,desc` kiểu comma-syntax — đó là quy ước khác (đã dùng nhầm ở version cũ). Response: `PagedResponse<ProductCardResponse>` cùng shape với homepage.

---

## 3. Product Detail

```http
GET /api/products/{productId}
```

**Chỉ trả sản phẩm `status=ACTIVE`.** Trang seller edit product phải gọi `GET /api/seller/products/{productId}` thay vì endpoint này (xem `07-seller.md`) — nếu không, mọi sản phẩm DRAFT/INACTIVE sẽ báo "không tìm thấy" khi seller cố sửa.

Response thật (`ProductDetailResponse`):
```json
{
  "code": 200,
  "data": {
    "id": "uuid",
    "shopId": "uuid",
    "status": "ACTIVE",
    "name": "Laptop Gaming ASUS TUF",
    "description": "Mô tả chi tiết...",
    "brand": "ASUS",
    "sellerSku": "ASUS-TUF-2024",
    "categoryId": "uuid",
    "categoryPath": "Điện tử/Laptop",
    "attributes": { "RAM": "16GB", "CPU": "Intel i7" },
    "minPrice": 25000000,
    "maxPrice": 35000000,
    "hasCover": true,
    "media": [
      { "mediaId": "uuid", "publicUrl": "https://...", "objectKey": "...", "contentType": "image/jpeg", "sortOrder": 0, "cover": true }
    ],
    "variants": [ /* ProductVariantDetailResponse[], xem dưới */ ],
    "eligibilityIssues": [],
    "shop": { "id": "uuid", "name": "Tech Store VN", "rating": 4.8 },
    "totalAvailableStock": 5,
    "createdAt": "2026-01-01T00:00:00Z",
    "updatedAt": "2026-01-01T00:00:00Z"
  }
}
```

Khác biệt quan trọng so với bản mô tả cũ:
- `attributes` là **object phẳng** `Record<string, unknown>` (`{"RAM": "16GB"}`), KHÔNG phải mảng `[{name, value}]`.
- `media[].publicUrl` (KHÔNG phải `url`), `media[].cover: boolean` (KHÔNG phải `isPrimary`).
- `shop` chỉ có `{id, name, rating}` — **không có `logoUrl`/`description` ở đây**.
- Không có `rating`/`soldCount` ở cấp product. Không có `checkoutEligible` ở cấp product (chỉ có ở từng variant) — suy ra "còn hàng nói chung" bằng `eligibilityIssues.length === 0`.

### Variant (`ProductVariantDetailResponse`)

```ts
interface ProductVariantDetailResponse {
  id: string;                          // KHÔNG phải variantId
  productId: string;
  sku: string;
  name: string;
  price: number;
  optionLabels: Record<string, string>; // { "RAM": "16GB", "Storage": "512GB SSD" } — map, KHÔNG phải options: [{name,value}]
  active: boolean;
  availableStock: number;
  checkoutEligible: boolean;
  coverMedia: ProductMediaSummary | null;
  createdAt: string;
  updatedAt: string;
}
```

**Không có `stockStatus` từ backend.** Tự tính ở FE bằng `getStockStatus(availableStock)` (`lib/utils.ts`, ngưỡng low-stock ≤ 5 là quy ước FE tự chọn, không phải hợp đồng backend).

**UI notes:**
- Group variant theo từng key của `optionLabels` để dựng option-selector (không phải group theo `options[].name`).
- Disable nút "Thêm vào giỏ" nếu `variant.checkoutEligible === false`.

---

## 4. Keyword Search

```http
GET /api/search/products?q=laptop gaming&page=0&size=20&priceMin=0&priceMax=30000000&sort=RELEVANCE
```

| Param | Ý nghĩa |
|---|---|
| `q` | Từ khóa (optional) |
| `categoryId` | Filter theo category UUID (bao gồm subtree) |
| `priceMin` / `priceMax` | Giá — **tên field đúng chính tả này**, không phải `minPrice`/`maxPrice` ở query string (khác với field trả về trên `ProductCardResponse`!) |
| `brand` | Filter theo brand |
| `sort` | `RELEVANCE` (default) \| `PRICE_ASC` \| `PRICE_DESC` \| `NEWEST` — **enum viết hoa**, không có `soldCount,desc`/`rating,desc` |
| `page`, `size` | Phân trang, `size` tối đa 50 |

**Response lồng một cấp khác với homepage** — không phải `{items,...}` phẳng ở `data`:
```json
{
  "code": 200,
  "data": {
    "products": {
      "items": [ /* ProductCardResponse[] */ ],
      "page": 0, "size": 20, "totalElements": 45, "totalPages": 3, "last": false
    },
    "degraded": false,
    "degradedReason": null
  }
}
```

Đọc bằng `data.products.items`, không phải `data.items`. **Không có `facets`** (brands/priceRanges) trong response thật — nếu FE có UI facet, đó là suy diễn phía client, không phải dữ liệu backend trả về.

Khi `degraded: true`: Elasticsearch không khả dụng, kết quả dùng PostgreSQL fallback (`degradedReason: "ELASTICSEARCH_UNAVAILABLE"`).

---

## 5. Semantic Search (AI)

```http
GET /api/search/products/semantic?q=laptop cho sinh viên thiết kế&page=0&size=10
```

`q` là **bắt buộc** ở endpoint này (khác keyword search). Response cùng shape `SearchResponse` như mục 4 (`data.products.items`). `degraded: true`, `degradedReason: "AI_PROVIDER_UNAVAILABLE"` khi Gemini không khả dụng.

---

## 6. AI Recommendations

### Home recommendation

```http
GET /api/recommendations/home?page=0&size=20
Authorization: Bearer <token>  (optional — anonymous nhận trending fallback)
```

Response **không phân trang** (`RecommendationResponse`, không có `page/size/totalElements`):
```json
{
  "code": 200,
  "data": {
    "items": [
      {
        "product": { /* ProductCardResponse đầy đủ */ },
        "reasonCodes": ["SIMILAR_TO_CART"]
      }
    ],
    "degraded": false,
    "degradedReason": null,
    "generatedText": null
  }
}
```

Mỗi phần tử là `{product, reasonCodes}` — **không phải `ProductCardResponse` phẳng có thêm `reasonCode`/`reasonLabel`**. Luôn đọc `item.product.id`, không phải `item.id`. `reasonCodes` (số nhiều, mảng) values thật: `TRENDING | RECENTLY_VIEWED | SIMILAR_TO_CART | SIMILAR_TO_ORDER | WISHLIST_RELATED | AI_SEMANTIC_MATCH`.

### Chat Recommend (AI shopping assistant — widget nổi)

```http
POST /api/recommendations/chat
{ "query": "Tôi cần tai nghe chống ồn dưới 2 triệu để học online" }
```

Response `ChatRecommendResponse` — **cùng shape `{items: [{product, reasonCodes}], degraded, degradedReason, generatedText}`** như home recommendation ở trên, không phải `{products, explanation}`. `generatedText` là lời giải thích AI generate — chỉ hiển thị, không parse giá/tồn kho từ đó; luôn lấy từ `item.product`.

---

## 7. Shop Detail

```http
GET /api/shops/{shopId}
```

Response thật (`ShopResponse`) — **field ít hơn nhiều so với mô tả cũ**:
```json
{
  "code": 200,
  "data": {
    "id": "uuid",
    "ownerId": "uuid",
    "name": "Tech Store VN",
    "description": "...",
    "rating": 4.8,
    "logo": { "id": "uuid", "publicUrl": "https://...", "contentType": "image/png", "...": "..." },
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

**Không có** `shopName` (là `name`), `logoUrl` phẳng (là `logo.publicUrl`, `logo` có thể `null`), `bannerUrl`, `productCount`, `followerCount` — các field này chưa được backend track, đừng hiển thị UI dựa trên chúng cho tới khi có API thật.

Sản phẩm của shop:
```http
GET /api/shops/{shopId}/products?page=0&size=20
```

Response: `PagedResponse<ProductCardResponse>` (field `items`, giống mục 1).
