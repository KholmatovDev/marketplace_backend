# Vue 3 Admin Panel — Marketplace

Build a production-ready Admin Panel web application for a marketplace backend using Vue 3. Connects to an existing NestJS REST API.

---

## Tech Stack

- **Framework:** Vue 3 (Composition API, `<script setup lang="ts">`)
- **Build Tool:** Vite + TypeScript
- **Router:** Vue Router 4
- **State:** Pinia + `pinia-plugin-persistedstate`
- **UI:** PrimeVue 4 + Tailwind CSS
- **HTTP:** Axios with interceptors
- **Forms:** VeeValidate + Zod
- **Charts:** Chart.js + vue-chartjs
- **Notifications:** Vue Toastification
- **Dates:** date-fns

---

## API Base & Auth

```
BASE_URL = http://localhost:3000

POST /auth/login        → { success, data: { accessToken, refreshToken, user } }
POST /auth/refresh      → { success, data: { accessToken, refreshToken } }
POST /auth/logout
GET  /auth/me
```

**Muhim:** Barcha API javobi `{ success, data, timestamp }` formatida. Axios response interceptor'da `res.data.data` ni olish kerak.

---

## Project Structure

```
src/
├── api/
│   ├── axios.ts
│   ├── auth.api.ts
│   ├── products.api.ts
│   ├── categories.api.ts
│   ├── orders.api.ts
│   └── users.api.ts
├── stores/
│   ├── auth.store.ts
│   └── ui.store.ts
├── composables/
│   ├── useProducts.ts
│   ├── useCategories.ts
│   ├── useOrders.ts
│   └── useUsers.ts
├── router/
│   └── index.ts
├── layouts/
│   └── AdminLayout.vue
├── views/
│   ├── LoginView.vue
│   ├── DashboardView.vue
│   ├── ProductsView.vue
│   ├── ProductFormView.vue
│   ├── CategoriesView.vue
│   ├── OrdersView.vue
│   └── UsersView.vue
├── components/
│   ├── products/ProductForm.vue
│   ├── shared/StatCard.vue
│   └── shared/ConfirmDialog.vue
├── App.vue
└── main.ts
```

---

## Axios Setup (`src/api/axios.ts`)

```ts
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL })

// Request: Bearer token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Response: unwrap data, handle 401 → refresh → retry
api.interceptors.response.use(
  res => res.data.data,
  async error => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true
      try {
        const rt = localStorage.getItem('refreshToken')
        const res = await axios.post(`${BASE_URL}/auth/refresh`, null, {
          headers: { Authorization: `Bearer ${rt}` }
        })
        const { accessToken, refreshToken } = res.data.data
        localStorage.setItem('accessToken', accessToken)
        localStorage.setItem('refreshToken', refreshToken)
        error.config.headers.Authorization = `Bearer ${accessToken}`
        return api(error.config)
      } catch {
        localStorage.clear()
        router.push('/login')
      }
    }
    return Promise.reject(error.response?.data)
  }
)
```

---

## API Modules

```ts
// categories.api.ts
export const categoriesApi = {
  getAll:     ()           => api.get('/admin/categories'),
  create:     (data)       => api.post('/admin/categories', data),
  update:     (id, data)   => api.patch(`/admin/categories/${id}`, data),
  delete:     (id)         => api.delete(`/admin/categories/${id}`),
  updateSort: (id, sortOrder) => api.patch(`/admin/categories/${id}/sort`, { sortOrder }),
}

// products.api.ts
export const productsApi = {
  getAll:       (params)     => api.get('/admin/products', { params }),
  getOne:       (id)         => api.get(`/admin/products/${id}`),
  create:       (data)       => api.post('/admin/products', data),
  update:       (id, data)   => api.patch(`/admin/products/${id}`, data),
  delete:       (id)         => api.patch(`/admin/products/${id}`, { isActive: false }),
  updateStock:  (id, stock)  => api.patch(`/admin/products/${id}/stock`, { stock }),
  uploadImages: (files: File[]) => {
    const form = new FormData()
    files.forEach(f => form.append('files', f))
    return api.post('/uploads/products', form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    // returns: { urls: ['/uploads/products/uuid.webp', ...] }
  },
}

// orders.api.ts
export const ordersApi = {
  getAll:       (params)       => api.get('/admin/orders', { params }),
  getOne:       (id)           => api.get(`/admin/orders/${id}`),
  updateStatus: (id, status)   => api.patch(`/admin/orders/${id}/status`, { status }),
}

// users.api.ts
export const usersApi = {
  getAll: ()    => api.get('/admin/users'),
  delete: (id)  => api.delete(`/admin/users/${id}`),
}
```

---

## Router (`src/router/index.ts`)

```ts
const routes = [
  { path: '/login', component: LoginView, meta: { public: true } },
  {
    path: '/',
    component: AdminLayout,
    meta: { requiresAuth: true },
    children: [
      { path: '',                    redirect: '/dashboard' },
      { path: 'dashboard',           component: DashboardView },
      { path: 'products',            component: ProductsView },
      { path: 'products/new',        component: ProductFormView },
      { path: 'products/:id/edit',   component: ProductFormView },
      { path: 'categories',          component: CategoriesView },
      { path: 'orders',              component: OrdersView },
      { path: 'users',               component: UsersView },
    ],
  },
]

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (!to.meta.public && !auth.accessToken) return '/login'
  if (to.path === '/login' && auth.accessToken) return '/dashboard'
})
```

---

## Pinia Auth Store (`src/stores/auth.store.ts`)

```ts
export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const accessToken = ref<string | null>(null)
  const refreshToken = ref<string | null>(null)

  async function login(email: string, password: string) {
    const data = await authApi.login({ email, password })
    accessToken.value = data.accessToken
    refreshToken.value = data.refreshToken
    user.value = data.user
    localStorage.setItem('accessToken', data.accessToken)
    localStorage.setItem('refreshToken', data.refreshToken)
  }

  function logout() {
    authApi.logout().catch(() => {})
    user.value = null
    accessToken.value = null
    refreshToken.value = null
    localStorage.clear()
    router.push('/login')
  }

  return { user, accessToken, refreshToken, login, logout }
}, { persist: true })
```

---

## AdminLayout Sidebar

```
📊 Dashboard
📦 Mahsulotlar
🏷️ Kategoriyalar
📋 Buyurtmalar
👥 Foydalanuvchilar
─────────────────
🚪 Chiqish
```

Mobile'da (`< 768px`) hamburger menyuga aylansin. Aktiv link primary rang bilan ajralib tursin.

---

## Views

### LoginView

- Centered card (400px)
- Email + password inputs, VeeValidate + Zod
- Show/hide password toggle
- Loading spinner submit paytida
- Xato bo'lsa forma ostida xabar
- Success → `auth.login()` → `/dashboard`

---

### DashboardView

`Promise.all` bilan parallel fetch:

```ts
const [productsRes, usersRes, ordersRes] = await Promise.all([
  productsApi.getAll({ limit: 1 }),
  usersApi.getAll(),
  ordersApi.getAll({ limit: 1 }),
])
```

**4 stat card:**

| Card | Qiymat |
|---|---|
| Jami mahsulotlar | `productsRes.total` |
| Aktiv mahsulotlar | `limit=100` fetch, client-da `isActive=true` filter |
| Jami buyurtmalar | `ordersRes.total` |
| Jami foydalanuvchilar | `usersRes.length` |

**Bar chart** (vue-chartjs) — kategoriyalar bo'yicha mahsulotlar soni, client-side group.

**Oxirgi 5 buyurtma** — kichik jadval: `orderNumber`, status badge, `totalAmount`, `createdAt`.

---

### ProductsView

```
[🔍 Qidiruv (debounce 400ms)]  [Kategoriya ▼]  [Status ▼]  [+ Mahsulot]
┌─────────────────────────────────────────────────────────────────────┐
│ Rasm │ Nomi        │ Kategoriya │ Narx     │ Qoldiq  │ Status │ ⚙️ │
└─────────────────────────────────────────────────────────────────────┘
[< 1 2 3 >]   10 / 20 / 50 per page
```

- Rasm: `images[0]?.url` → `BASE_URL + url`, fallback placeholder
- Kategoriya filter dropdown: `categoriesApi.getAll()` dan
- Qoldiq rangi: `< 5` qizil, `< 20` sariq, `≥ 20` yashil
- O'chirish: `ConfirmDialog` → soft delete (`PATCH /admin/products/:id` `{ isActive: false }`)
- Server-side pagination: `page`, `limit`, `search`, `category` (slug)

---

### ProductFormView

Create va Edit uchun bitta view. `route.params.id` bor bo'lsa edit rejimi.

**Forma maydonlari:**

| Maydon | Tip | Validatsiya |
|---|---|---|
| title | text input | required, min 2 |
| description | textarea | required, min 10 |
| price | number | required, > 0 |
| discountPrice | number | optional, > 0 |
| stock | number | required, ≥ 0 |
| categoryId | **PrimeVue Dropdown** | required — `GET /admin/categories` dan to'ldiriladi |
| images | **Multi-file upload** | optional — `POST /uploads/products` |
| isActive | PrimeVue Toggle | faqat edit rejimida ko'rinadi |

**Rasm yuklash logikasi:**
```ts
async function handleImageUpload(event) {
  const files = Array.from(event.target.files)
  // POST /uploads/products  multipart/form-data, field: files[]
  const result = await productsApi.uploadImages(files)
  // result.urls: ['/uploads/products/uuid.webp', ...]
  form.images = [...form.images, ...result.urls]
}
```

Yuklangan rasmlarni preview: `http://localhost:3000` + url. Har biriga ✕ tugma (arraydan o'chirish).

**Submit:**
```ts
// Create: POST /admin/products
// Edit:   PATCH /admin/products/:id
body: { title, description, price, discountPrice?, stock, categoryId, images: string[] }
```

Success → toast + `router.push('/products')`. Xato → toast bilan API xabarini ko'rsatish.

---

### CategoriesView

```
[+ Kategoriya qo'shish]
┌─────────────────────────────────────────────┐
│ Tartib │ Nomi        │ Slug   │ Status │ ⚙️ │
│  ↕ 1   │ Elektronika │ elec.. │  ✅    │    │
└─────────────────────────────────────────────┘
```

- Qo'shish/tahrirlash: PrimeVue `Dialog` ichida forma
- Forma: `name`, `slug` (name'dan avtomatik generate: `name.toLowerCase().replace(/ /g, '-')`), `imageUrl` (optional)
- ↑↓ tugmalar yoki `sortOrder` input → `PATCH /admin/categories/:id/sort { sortOrder }`
- O'chirish: confirm dialog → `DELETE /admin/categories/:id`

---

### OrdersView

```
[Status filter ▼]
┌──────────────────────────────────────────────────────────────┐
│ Raqam          │ Foydalanuvchi │ Summa    │ Status    │ Sana │
│ ORD-20260611-… │ John Doe      │ $499.99  │ 🟡 Kutish │ …    │
└──────────────────────────────────────────────────────────────┘
```

**Status badge ranglari:**

| Status | Rang |
|---|---|
| `pending` | sariq |
| `confirmed` / `processing` | ko'k |
| `shipped` | binafsha |
| `delivered` | yashil |
| `cancelled` | qizil |

Qatorga bosish → **Detail modal** ochiladi:
- Mahsulotlar ro'yxati (snapshot: `productTitle`, `productImage`, `price`, `quantity`)
- Manzil snapshot (`addressSnapshot`)
- Status o'zgartirish dropdown → `PATCH /admin/orders/:id/status { status }`
- Modal yopilganda jadval yangilanadi

Server-side pagination + status filter: `GET /admin/orders?status=pending&page=1&limit=20`

---

### UsersView

```
[🔍 Ism/Email qidiruv]  [Rol filter ▼]
┌──────────────────────────────────────────────────────┐
│ Ism       │ Email            │ Rol   │ Tur    │ ⚙️   │
│ John Doe  │ john@example.com │ User  │ Oddiy  │ 🗑️  │
└──────────────────────────────────────────────────────┘
```

- Client-side filter (API barcha userlarni qaytaradi)
- Rol badge: Admin → binafsha, User → ko'k
- Tur badge: Regular → kulrang, Guest → to'q sariq
- O'chirish: confirm dialog → `DELETE /admin/users/:id`

---

## Environment Variables

```env
VITE_API_URL=http://localhost:3000
```

---

## O'rnatish

```bash
npm create vue@latest marketplace-admin -- --typescript
cd marketplace-admin

npm install \
  axios \
  pinia pinia-plugin-persistedstate \
  vue-router \
  primevue @primevue/themes primeicons \
  tailwindcss @tailwindcss/vite \
  vee-validate @vee-validate/zod zod \
  chart.js vue-chartjs \
  vue-toastification \
  date-fns \
  lucide-vue-next
```

---

## Deliverables — tartib bilan

1. `src/api/axios.ts` — interceptorlar bilan Axios instance
2. `src/api/auth.api.ts`
3. `src/api/products.api.ts` — `uploadImages` bilan
4. `src/api/categories.api.ts`
5. `src/api/orders.api.ts`
6. `src/api/users.api.ts`
7. `src/stores/auth.store.ts` — persist bilan
8. `src/stores/ui.store.ts` — sidebar holati
9. `src/router/index.ts` — navigation guards
10. `src/layouts/AdminLayout.vue` — sidebar + header + mobile hamburger
11. `src/views/LoginView.vue`
12. `src/views/DashboardView.vue` — stat cards + bar chart + oxirgi buyurtmalar
13. `src/views/ProductsView.vue` — DataTable + server-side filter/pagination
14. `src/views/ProductFormView.vue` — create/edit + category dropdown + multi-image upload
15. `src/views/CategoriesView.vue` — CRUD + sort
16. `src/views/OrdersView.vue` — jadval + detail/status modal
17. `src/views/UsersView.vue` — client-side filter
18. `src/components/products/ProductForm.vue` — reusable forma
19. `src/components/shared/StatCard.vue`
20. `src/components/shared/ConfirmDialog.vue`
21. `src/main.ts` — PrimeVue, Pinia, Router, Toastification setup

Har bir `.vue` fayl `<script setup lang="ts">` sintaksisida yozilsin.
