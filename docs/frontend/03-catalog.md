# 03 — Catalog: Homepage, Browse, Search, AI Recommend

---

## ProductCardResponse (contract dùng chung trên mọi surface)

Mọi endpoint listing đều trả cùng shape `ProductCardResponse`:

```ts
interface ProductCardResponse {
  productId: string;         // UUID
  name: string;
  slug: string | null;
  coverImage: MediaInfo | null;
  priceMin: number;          // VND, price range low
  priceMax: number;          // VND, price range high
  shop: ShopSummary;
  rating: number | null;     // 0–5
  soldCount: number;
  status: 'ACTIVE' | 'INACTIVE' | 'DRAFT' | 'DELETED';
  checkoutEligible: boolean; // false nếu không thể mua (hết hàng, inactive...)
  categoryPath: string | null; // "Điện tử > Laptop"
}

interface MediaInfo {
  mediaId: string;
  url: string;
  contentType: string;
}

interface ShopSummary {
  shopId: string;
  shopName: string;
  logoUrl: string | null;
}
```

---

## 1. Homepage

Trả sản phẩm nổi bật / trending cho trang chủ. Không cần auth.

```http
GET /api/products/homepage?page=0&size=20
```

Response:
```json
{
  "code": 200,
  "data": {
    "items": [ /* ProductCardResponse[] */ ],
    "page": 0,
    "size": 20,
    "totalElements": 120,
    "totalPages": 6,
    "last": false
  }
}
```

---

## 2. Category Browse

```http
GET /api/categories
```

Trả về **danh sách phẳng** (KHÔNG phải cây lồng nhau), cached 30 phút trên server. Mỗi item có `id`, `parentId`, `path` (materialized path) — tự dựng cây từ `parentId` nếu cần, hoặc hiển thị trực tiếp theo `path`:
```json
{
  "code": 200,
  "data": [
    {
      "id": "uuid",
      "parentId": null,
      "name": "Điện tử",
      "path": "Điện tử",
      "createdAt": "2026-01-01T00:00:00Z",
      "updatedAt": "2026-01-01T00:00:00Z"
    },
    {
      "id": "uuid",
      "parentId": "parent-uuid",
      "name": "Laptop",
      "path": "Điện tử > Laptop",
      "createdAt": "2026-01-01T00:00:00Z",
      "updatedAt": "2026-01-01T00:00:00Z"
    }
  ]
}
```

> ⚠️ Backend dùng field `id`/`parentId`/`path` — KHÔNG có `categoryId`, `slug`, hay `children`. Danh mục là master data do admin quản lý; hiện chưa có API tạo/sửa danh mục (seed qua migration `V22__seed_categories.sql`).

Browse sản phẩm theo category:
```http
GET /api/categories/{categoryId}/products?page=0&size=20&sort=soldCount,desc
```

Response: `Page<ProductCardResponse>` — cùng shape với homepage.

---

## 3. Product Detail

```http
GET /api/products/{productId}
```

Response:
```json
{
  "code": 200,
  "data": {
    "productId": "uuid",
    "name": "Laptop Gaming ASUS TUF",
    "description": "Mô tả chi tiết...",
    "brand": "ASUS",
    "categoryPath": "Điện tử > Laptop",
    "status": "ACTIVE",
    "checkoutEligible": true,
    "attributes": [
      { "name": "RAM", "value": "16GB" },
      { "name": "CPU", "value": "Intel i7" }
    ],
    "priceMin": 25000000,
    "priceMax": 35000000,
    "rating": 4.5,
    "soldCount": 128,
    "shop": {
      "shopId": "uuid",
      "shopName": "Tech Store VN",
      "logoUrl": "https://..."
    },
    "media": [
      { "mediaId": "uuid", "url": "https://...", "contentType": "image/jpeg", "isPrimary": true },
      { "mediaId": "uuid", "url": "https://...", "contentType": "image/jpeg", "isPrimary": false }
    ],
    "variants": [
      {
        "variantId": "uuid",
        "sku": "ASUS-TUF-16-512",
        "options": [
          { "name": "RAM", "value": "16GB" },
          { "name": "Storage", "value": "512GB SSD" }
        ],
        "price": 25000000,
        "stockStatus": "IN_STOCK",  // IN_STOCK | LOW_STOCK | OUT_OF_STOCK
        "availableStock": 5,
        "checkoutEligible": true
      },
      {
        "variantId": "uuid",
        "sku": "ASUS-TUF-32-1TB",
        "options": [
          { "name": "RAM", "value": "32GB" },
          { "name": "Storage", "value": "1TB SSD" }
        ],
        "price": 35000000,
        "stockStatus": "OUT_OF_STOCK",
        "availableStock": 0,
        "checkoutEligible": false
      }
    ]
  }
}
```

**UI notes:**
- Render option selector từ `variants[].options` — group theo `name` để tạo matrix chọn variant
- Disable nút "Thêm vào giỏ" nếu `variant.checkoutEligible === false`
- Hiển thị `stockStatus` badge: IN_STOCK (xanh), LOW_STOCK (cam), OUT_OF_STOCK (đỏ)

---

## 4. Keyword Search

```http
GET /api/search/products?q=laptop gaming&page=0&size=20
```

Query params:
| Param | Ý nghĩa |
|---|---|
| `q` | Từ khóa tìm kiếm (bắt buộc) |
| `categoryId` | Filter theo category UUID |
| `minPrice` | Giá tối thiểu (VND) |
| `maxPrice` | Giá tối đa (VND) |
| `brand` | Filter theo brand |
| `sort` | `relevance` (default), `price,asc`, `price,desc`, `soldCount,desc`, `rating,desc` |
| `page` | Trang (0-based) |
| `size` | Số kết quả mỗi trang |

Response:
```json
{
  "code": 200,
  "data": {
    "items": [ /* ProductCardResponse[] */ ],
    "page": 0,
    "size": 20,
    "totalElements": 45,
    "totalPages": 3,
    "last": false,
    "degraded": false,
    "facets": {
      "brands": ["ASUS", "Dell", "HP"],
      "priceRanges": [
        { "label": "Dưới 10 triệu", "min": 0, "max": 10000000, "count": 12 },
        { "label": "10–25 triệu", "min": 10000000, "max": 25000000, "count": 20 }
      ]
    }
  }
}
```

Khi `degraded: true`: Elasticsearch không khả dụng, kết quả dùng PostgreSQL fallback — vẫn hoạt động nhưng thiếu facets và relevance scoring. Hiển thị banner cảnh báo nhỏ.

---

## 5. Semantic Search (AI)

```http
GET /api/search/products/semantic?q=laptop cho sinh viên thiết kế&page=0&size=10
```

Dùng pgvector để tìm sản phẩm tương đồng về ngữ nghĩa.

Response: cùng shape với keyword search. `degraded: true` nếu AI provider (Gemini) không khả dụng — khi đó trả empty hoặc fallback.

---

## 6. AI Recommendations

### Home recommendation

```http
GET /api/recommendations/home?page=0&size=20
Authorization: Bearer <token>  (optional — anonymous nhận trending fallback)
```

Response:
```json
{
  "code": 200,
  "data": {
    "items": [
      {
        /* ProductCardResponse */
        "reasonCode": "SIMILAR_TO_CART",
        "reasonLabel": "Vì bạn đã thêm vào giỏ"
      }
    ],
    "degraded": false
  }
}
```

`reasonCode` values:
- `TRENDING` — sản phẩm phổ biến (anonymous fallback)
- `RECENTLY_VIEWED` — dựa trên lịch sử xem
- `SIMILAR_TO_CART` — tương tự sản phẩm trong giỏ
- `SIMILAR_TO_ORDER` — tương tự đơn đã mua
- `AI_SEMANTIC_MATCH` — AI matching

### Chat Recommend (AI shopping assistant)

```http
POST /api/recommendations/chat
Authorization: Bearer <token>
Content-Type: application/json

{
  "query": "Tôi cần tai nghe chống ồn dưới 2 triệu để học online"
}
```

Response:
```json
{
  "code": 200,
  "data": {
    "products": [ /* ProductCardResponse[] với reasonCode */ ],
    "explanation": "Dựa trên yêu cầu của bạn, đây là những tai nghe chống ồn phù hợp trong tầm giá...",
    "degraded": false
  }
}
```

**Lưu ý:** `explanation` là text do AI generate — chỉ dùng để hiển thị, không parse thông tin giá/stock từ text này. Luôn dùng `products[].priceMin/Max` và `products[].checkoutEligible` từ DTO.

---

## 7. Shop Detail

```http
GET /api/shops/{shopId}
```

Response:
```json
{
  "code": 200,
  "data": {
    "shopId": "uuid",
    "shopName": "Tech Store VN",
    "description": "...",
    "logoUrl": "https://...",
    "bannerUrl": "https://...",
    "productCount": 45,
    "rating": 4.8,
    "followerCount": 1200
  }
}
```

Sản phẩm của shop:
```http
GET /api/shops/{shopId}/products?page=0&size=20
```

Response: `Page<ProductCardResponse>`
