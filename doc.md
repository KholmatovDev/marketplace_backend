# NestJS Backend Prompt — Marketplace API

You are building a production-ready NestJS REST API backend for a mobile marketplace app
(Flutter frontend with Clean Architecture). Follow these exact requirements:

---

## TECH STACK
- NestJS (latest) with TypeScript
- TypeORM + PostgreSQL
- JWT authentication (access token + refresh token)
- Passport.js (local + jwt strategies)
- class-validator + class-transformer (DTOs)
- bcrypt (password hashing)
- Swagger/OpenAPI (auto-generated docs at /api)
- Role-based access control (RBAC) with Guards

---

## PROJECT STRUCTURE

```
src/
├── auth/
│   ├── strategies/        # local.strategy.ts, jwt.strategy.ts, jwt-refresh.strategy.ts
│   ├── guards/            # jwt-auth.guard.ts, local-auth.guard.ts, roles.guard.ts
│   ├── decorators/        # roles.decorator.ts, public.decorator.ts, current-user.decorator.ts
│   ├── dto/               # register.dto.ts, login.dto.ts, tokens.dto.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   └── auth.module.ts
├── users/
│   ├── entities/user.entity.ts
│   ├── dto/
│   ├── users.service.ts
│   └── users.module.ts
├── products/
│   ├── entities/product.entity.ts
│   ├── dto/               # create-product.dto.ts, update-product.dto.ts, product-query.dto.ts
│   ├── products.controller.ts
│   ├── products.service.ts
│   └── products.module.ts
├── admin/
│   ├── admin.controller.ts  # /admin/* routes, AdminGuard applied globally
│   └── admin.module.ts
├── common/
│   ├── filters/           # http-exception.filter.ts
│   ├── interceptors/      # transform.interceptor.ts (wraps all responses)
│   └── decorators/
├── config/
│   ├── database.config.ts
│   └── jwt.config.ts
├── app.module.ts
└── main.ts
```

---

## DATABASE ENTITIES

### User Entity
- id: uuid (primary key)
- email: string (unique)
- password: string (hashed, nullable — null for guests)
- name: string
- role: enum ('user' | 'admin') — default: 'user'
- isGuest: boolean — default: false
- guestToken: string (nullable, uuid) — unique identifier for guest sessions
- refreshToken: string (nullable, hashed)
- createdAt, updatedAt: timestamps

### Product Entity
- id: uuid
- title: string
- description: text
- price: decimal(10,2)
- stock: integer — default: 0
- imageUrl: string (nullable)
- category: string
- isActive: boolean — default: true
- createdBy: ManyToOne → User (admin who created it)
- createdAt, updatedAt: timestamps

---

## AUTH MODULE — 3 MODES

### 1. Register — POST /auth/register
- Body: { email, password, name }
- Hash password with bcrypt (salt rounds: 12)
- Assign role: 'user'
- Return: { accessToken, refreshToken, user: { id, email, name, role } }

### 2. Login — POST /auth/login
- Body: { email, password }
- Validate with LocalStrategy
- Return: { accessToken, refreshToken, user: { id, email, name, role } }

### 3. Guest Mode — POST /auth/guest
- No body required
- Create a temporary user record: isGuest=true, guestToken=uuid(), no email/password
- Return: { accessToken, guestToken, user: { id, role: 'user', isGuest: true } }
- Guest can browse products but CANNOT: checkout, view order history, manage profile
- Guest sessions expire: JWT exp 7 days (longer than regular users: 15 min)

### 4. Refresh Token — POST /auth/refresh
- Header: Bearer <refreshToken>
- Rotate refresh token (invalidate old, issue new)
- Return: { accessToken, refreshToken }

### 5. Logout — POST /auth/logout  [JWT required]
- Clear refreshToken in DB (set null)
- Return: { message: 'Logged out successfully' }

---

## JWT CONFIGURATION
- ACCESS_TOKEN_SECRET — from env
- REFRESH_TOKEN_SECRET — from env (different secret!)
- Access token expiry: 15 minutes (guests: 7 days)
- Refresh token expiry: 30 days
- Payload: { sub: userId, email, role, isGuest }

---

## PRODUCTS MODULE

### Public endpoints (NO auth required — accessible by everyone including guests):
- GET /products             — list all active products (pagination + filters)
- GET /products/:id         — get single product detail

### Admin endpoints — /admin/products  [ADMIN ROLE REQUIRED]
- POST   /admin/products             — create product
- PATCH  /admin/products/:id         — update product
- DELETE /admin/products/:id         — soft delete (set isActive=false)
- GET    /admin/products             — list ALL products including inactive ones
- PATCH  /admin/products/:id/stock   — update stock quantity

### ProductQueryDto (GET /products):
- page: number (default: 1)
- limit: number (default: 20, max: 100)
- category: string (optional filter)
- minPrice, maxPrice: number (optional range filter)
- search: string (optional, searches title + description)
- sortBy: 'price' | 'createdAt' | 'title' (default: 'createdAt')
- order: 'ASC' | 'DESC' (default: 'DESC')

---

## GUARDS & DECORATORS

### Guards:
- JwtAuthGuard — validates JWT, attaches user to request
- RolesGuard — checks user.role against @Roles() decorator
- GuestAllowed — custom guard: passes if route marked @Public() OR valid JWT
- AdminGuard = JwtAuthGuard + RolesGuard('admin') combined

### Decorators:
- @Public() — skip JWT check entirely (for GET /products, auth endpoints)
- @Roles('admin') — require admin role
- @CurrentUser() — extract user from request
- @GuestAllowed() — allow guest JWT tokens (default: guests blocked on write operations)

### Global setup in app.module.ts:
- Apply JwtAuthGuard globally (APP_GUARD)
- Apply RolesGuard globally (APP_GUARD)
- Mark product GET routes as @Public()

---

## RESPONSE FORMAT

All responses wrapped by TransformInterceptor:
```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2026-06-10T12:00:00Z"
}
```

Errors via HttpExceptionFilter:
```json
{
  "success": false,
  "statusCode": 401,
  "message": "Unauthorized",
  "timestamp": "2026-06-10T12:00:00Z"
}
```

---

## ENVIRONMENT VARIABLES (.env)

```
PORT=3000
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=secret
DATABASE_NAME=marketplace_db
JWT_ACCESS_SECRET=your_access_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here
BCRYPT_SALT_ROUNDS=12
```

---

## ADDITIONAL REQUIREMENTS

1. Use ConfigModule.forRoot() with validation (Joi schema)
2. Enable CORS for Flutter mobile app
3. Swagger tags: Auth, Products, Admin
4. All DTOs must have @ApiProperty() decorators
5. Add seeder: create first admin user on app start if none exists
   (email: admin@market.com, password: Admin123!)
6. Use database transactions for operations that modify multiple tables
7. Add request logging middleware (log method + url + statusCode + duration)

---

## DELIVERABLES

Generate the complete implementation for:
1. All entity files with TypeORM decorators
2. All DTO files with class-validator + Swagger decorators
3. AuthService with all 5 auth flows
4. JWT + Local + Refresh strategies
5. ProductsService with filtered pagination
6. All controllers with proper route decorators
7. Guards and custom decorators
8. app.module.ts with all providers configured
9. main.ts with Swagger, CORS, ValidationPipe, global filters setup
10. database.config.ts and jwt.config.ts

Start with entities and DTOs first, then services, then controllers.
