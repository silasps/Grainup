# GrainUp — System Architecture

> **Purpose of this document:** Complete reference for any AI agent or developer to understand, maintain, or recreate the GrainUp platform from scratch. It covers every system boundary, data model, integration, workflow, and architectural decision.

---

## 1. What Is This System?

**GrainUp** is the operating platform for **Editora Jocum**, a Brazilian Christian publishing house. It combines three distinct product areas under one codebase:

| Product | Description |
|---|---|
| **Editora** | E-commerce storefront for physical books and bundles (combos), with full ERP integration, invoicing (NF-e), shipping, and affiliate sales |
| **EAD** | Multi-tenant online learning management system (LMS) with video hosting, quizzes, certificates, and per-tenant branding |
| **Contratos** | Digital contract signing with OTP verification, IP/geolocation capture, and audit trail |

The primary domain is `editorajocum.com.br`. EAD tenants may use custom subdomains or domains resolved at request time.

---

## 2. Tech Stack

### Core Framework
| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.2.6 |
| Language | TypeScript | 5.9.3 |
| Runtime | Node.js | Server + Edge |
| UI | React | 19.2.4 |

### Database & Auth
| Service | Role |
|---|---|
| Supabase (PostgreSQL) | Primary database, 40+ tables, Row-Level Security |
| Supabase Auth | User authentication (email/password, OTP, magic links) |
| Supabase Storage | File uploads (avatars, book covers, certificates) |

### Frontend
| Library | Role |
|---|---|
| Tailwind CSS v4 | Styling (PostCSS integration) |
| shadcn/ui | Base component library |
| Base UI (Radix) | Headless primitives |
| Recharts | Charts and dashboards |
| Sonner | Toast notifications |
| React Hook Form | Form state |
| Zod | Schema validation |
| @tanstack/react-query v5 | Data fetching and caching |
| Zustand | Client-side state (cart) |

### External Services
| Service | Purpose |
|---|---|
| Mercado Pago | Payment gateway (PIX, credit, debit, boleto) |
| Bling ERP v3 | Inventory, sales orders, NF-e fiscal invoicing |
| Correios (CWS) | Freight calculation and package tracking |
| Melhor Envio | Fallback shipping aggregator |
| Bunny.net | Video hosting and CDN for EAD lessons |
| Resend | Transactional email |

### Build & Deploy
| Tool | Role |
|---|---|
| Vercel | Hosting and CI/CD |
| ESLint | Code linting |

---

## 3. Directory Structure

```
grainUp/
├── app/                          # Next.js App Router — all routes
│   ├── (editora)/                # Public storefront
│   ├── (auth)/                   # Authentication pages
│   ├── (checkout)/               # Payment flow
│   ├── (conta)/                  # Logged-in user account
│   ├── (admin)/                  # Admin dashboards (editora, ead, eifol)
│   ├── (afiliados)/              # Affiliate portal
│   ├── (ead)/                    # EAD learning platform
│   ├── (eifol)/                  # EIFOL tenant-specific pages
│   ├── (marketing)/              # Informational/CMS pages
│   ├── api/                      # API routes (webhooks, integrations)
│   ├── certificado/[code]/       # Public certificate viewer
│   ├── contrato/[token]/         # Digital contract signing
│   ├── r/[code]/                 # Affiliate referral redirect
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Redirects to /editora
│
├── components/
│   ├── ui/                       # shadcn/ui primitives (Button, Card, Skeleton…)
│   ├── admin/                    # Admin-specific tables, forms, skeletons
│   ├── editora/                  # Storefront components (BookCard, ProductGrid…)
│   ├── ead/                      # LMS components (LessonPlayer, CourseOutline…)
│   ├── checkout/                 # Payment flow components
│   ├── conta/                    # Account management components
│   └── shared/                   # Cross-cutting (Navbar, Footer, BetaFeedback)
│
├── lib/
│   ├── actions/                  # Next.js Server Actions
│   │   └── ead/                  # EAD-specific actions
│   ├── bling/                    # Bling ERP client, OAuth, sync logic
│   ├── correios/                 # Correios REST API client
│   ├── bunny/                    # Bunny.net video token generation
│   ├── email/                    # Email templates and send functions
│   ├── supabase/                 # Database clients (browser, server, middleware)
│   ├── tenant/                   # Multi-tenant hostname resolution
│   ├── contratos/                # Contract content/template logic
│   ├── utils/                    # CPF validation, currency format, PDF export
│   ├── melhor-envio.ts           # Melhor Envio API client
│   ├── mp-refund.ts              # Mercado Pago refund handling
│   └── handle-action-error.ts   # Server action error handler
│
├── types/
│   ├── database.ts               # Full Supabase-generated schema types (~1078 lines)
│   └── ead.ts                    # EAD-specific types
│
├── stores/
│   └── cart.ts                   # Zustand shopping cart store
│
├── supabase/
│   └── migrations/               # 46 numbered SQL migration files
│
├── public/                       # Static assets
├── scripts/                      # Build/utility scripts
├── Contrato/                     # Raw contract template files
├── AGENTS.md                     # Agent rules (mandatory loading.tsx pattern)
├── CLAUDE.md                     # Points to AGENTS.md
├── next.config.ts                # Next.js config (image domains, env, redirects)
├── tailwind.config.ts
└── package.json
```

---

## 4. Route Groups & Pages

### (editora) — Public Storefront
| Path | Purpose |
|---|---|
| `/editora/` | Homepage: featured books, combos, carousels |
| `/editora/livros/` | Book catalog |
| `/editora/livros/[slug]/` | Book detail with reviews, add to cart |
| `/editora/combos/` | Bundle catalog |
| `/editora/combos/[slug]/` | Bundle detail |
| `/editora/carrinho/` | Shopping cart |
| `/editora/novidades/` | New releases |
| `/editora/ofertas/` | Active promotions |
| `/editora/afiliados/` | Affiliate program landing page |
| `/editora/autores/` | Author directory |
| `/editora/faq/` | FAQ |
| `/editora/sac/` | Customer support form |
| `/editora/sobre/`, `/editora/contato/` | About / Contact |
| `/editora/termos-de-uso`, `/politica-de-privacidade`, etc. | Legal pages |

### (auth) — Authentication
| Path | Purpose |
|---|---|
| `/auth/login/` | Login form |
| `/auth/cadastro/` | User registration |
| `/auth/recuperar-senha/` | Password reset |
| `/auth/destino/` | Post-auth redirect handler |
| `/confirmar-afiliado/[token]/` | Affiliate leader confirmation link |

### (checkout) — Payment Flow
| Path | Purpose |
|---|---|
| `/checkout/` | Shipping + payment (Mercado Pago) |
| `/checkout/retry/[id]/` | Retry failed payment on existing order |

### (conta) — Logged-in Account
| Path | Purpose |
|---|---|
| `/minha-conta/` | Dashboard overview |
| `/minha-conta/dados/` | Profile edit |
| `/minha-conta/enderecos/` | Address CRUD |
| `/minha-conta/pedidos/` | Order history |
| `/minha-conta/pedidos/[id]/` | Order detail + tracking |
| `/minha-conta/seguranca/` | Password/security settings |

### (admin) — Admin Dashboards
**Editora admin** (`/admin/editora/`):

| Path | Purpose |
|---|---|
| `/admin/editora/` | Dashboard with KPIs |
| `/admin/editora/livros/` | Book inventory list |
| `/admin/editora/livros/novo/` | Create book |
| `/admin/editora/livros/[id]/` | Edit book |
| `/admin/editora/livros/lote/` | Batch import via XLSX |
| `/admin/editora/livros/vitrine/` | Featured book management |
| `/admin/editora/combos/` | Bundle management |
| `/admin/editora/pedidos/` | Orders list |
| `/admin/editora/pedidos/[id]/` | Order detail + fulfillment pipeline |
| `/admin/editora/afiliados/` | Affiliate management |
| `/admin/editora/cupons/` | Coupon management |
| `/admin/editora/destaques/` | Carousel / featured content |
| `/admin/editora/anuncios/` | Announcements |
| `/admin/editora/avaliacoes/` | Review moderation |
| `/admin/editora/sac/` | Support tickets |
| `/admin/editora/financeiro/` | Financial overview |
| `/admin/editora/financeiro/movimentacoes/` | Payment movements |
| `/admin/editora/fiscal/` | NF-e / fiscal status |
| `/admin/editora/contratos/` | Contract templates |
| `/admin/editora/desenvolvedor/` | API keys and webhooks |
| `/admin/editora/configuracoes/` | Store settings |
| `/admin/editora/usuarios/` | User and role management |

**EAD admin** (`/admin/ead/`):

| Path | Purpose |
|---|---|
| `/admin/ead/` | EAD dashboard |
| `/admin/ead/cursos/` | Course list |
| `/admin/ead/cursos/novo/` | Create course |
| `/admin/ead/cursos/[id]/` | Edit course (modules, lessons) |
| `/admin/ead/alunos/` | Student roster |
| `/admin/ead/relatorios/` | Analytics and completion reports |
| `/admin/ead/configuracoes/` | Tenant settings (Bunny, MP, branding) |

### (afiliados) — Affiliate Portal
| Path | Purpose |
|---|---|
| `/afiliados/painel/` | Dashboard: sales, commission balance, referral links |
| `/afiliados/inscricao/` | Affiliate signup form |

### (ead) — Learning Platform
| Path | Purpose |
|---|---|
| `/ead/` | Student dashboard |
| `/ead/cursos/` | Public course catalog |
| `/ead/cursos/[slug]/` | Course detail / sales page |
| `/ead/curso/[slug]/` | Enrolled course view (module/lesson tree) |
| `/ead/curso/[slug]/[lessonSlug]/` | Lesson player (video, text, quiz) |
| `/ead/certificados/` | Student certificate list |
| `/ead/checkout/[courseId]/` | Course purchase flow |

### Root & Utility
| Path | Purpose |
|---|---|
| `/certificado/[code]/` | Public certificate viewer (QR-code accessible) |
| `/contrato/[token]/` | Digital contract signing |
| `/contrato/[token]/obrigado/` | Contract confirmation page |
| `/r/[code]/` | Affiliate referral link redirect |

---

## 5. API Routes

| Endpoint | Method | Auth | Purpose |
|---|---|---|---|
| `/api/mp-webhook` | POST | MP signature | Mercado Pago payment status events |
| `/api/bling-webhook` | POST | Bling header | Bling stock/order change events |
| `/api/me-webhook` | POST | ME signature | Melhor Envio shipment status events |
| `/api/shipping` | POST | None | Calculate freight (Correios + Melhor Envio) |
| `/api/correios-tracking` | POST | None | Lookup Correios tracking events by code |
| `/api/bling/auth` | GET | None | Bling OAuth2 authorization code callback |
| `/api/bling/callback` | POST | None | Bling OAuth token exchange |
| `/api/bling/diagnostics` | POST | Admin | Test Bling API connection |
| `/api/bling/pull-dimensions` | POST | Admin | Sync product dimensions from Bling |
| `/api/bling/restore-fisicos` | POST | Admin | Restore physical product data to Bling |
| `/api/ead/video-progress` | POST | Auth | Track lesson video watch position/time |
| `/api/ead/mp-webhook` | POST | MP signature | Mercado Pago webhook for EAD course payments |
| `/api/ead/bunny-token` | POST | Auth | Generate signed Bunny.net video playback token |
| `/api/admin/upload` | POST | Admin | File upload (avatars, covers) to Supabase Storage |
| `/api/admin/bling-sync` | POST | Admin | Manual sync: push pending orders to Bling |
| `/api/admin/bling-debug` | POST | Admin | Debug Bling integration state |
| `/api/admin/cancel-expired-orders` | POST | Admin/Cron | Batch-cancel unpaid orders past deadline |

---

## 6. Database Schema

> Full TypeScript types are generated in `types/database.ts`. Below are all 38+ tables grouped by domain.

### Authentication & Profiles

```sql
profiles (
  id uuid PK,
  user_id uuid FK → auth.users,
  full_name text,
  phone text,
  cpf text,
  avatar_url text,
  created_at timestamptz,
  updated_at timestamptz
)

user_roles (
  id uuid PK,
  user_id uuid FK → auth.users,
  role text CHECK (role IN (
    'super_admin','admin_editora','admin_ead','admin_eifol',
    'cliente','afiliado_jocum','afiliado_diretor','lider_jocum','afiliado_geral'
  )),
  created_at timestamptz
)
```

### Editora — Products

```sql
authors (id, name, slug, bio, photo_url, created_at)

categories (id, name, slug, description, created_at)

books (
  id, title, subtitle, slug,
  author_id FK → authors,
  category_id FK → categories,
  cover_url, description_short, description_full,
  price numeric, price_promotional numeric,
  stock int, weight_grams int,
  height_cm numeric, width_cm numeric, length_cm numeric,
  pages int, isbn text, sku text, ncm text, cfop text,
  publisher text, published_at date,
  is_active bool, is_featured bool, is_new bool, is_bestseller bool,
  sales_count int, rating_avg numeric, rating_count int,
  bling_product_id bigint, bling_ncm_synced bool,
  created_at, updated_at
)

book_images (id, book_id FK → books, url, alt, position, created_at)
book_tags (id, name, slug, color)
book_tag_relations (book_id FK, tag_id FK)
book_events (id, book_id FK, event_type, session_id, user_id, created_at)

combos (
  id, name, slug, description, image_url,
  price_original, price_promotional, discount_type,
  is_active, is_featured, bling_product_id, created_at
)

combo_items (id, combo_id FK → combos, book_id FK → books, quantity int)
```

### Editora — Sales & Orders

```sql
carts (id, user_id FK, session_id text, created_at, updated_at)

cart_items (
  id, cart_id FK → carts,
  book_id FK → books, combo_id FK → combos,
  quantity int, unit_price numeric, created_at
)

orders (
  id, order_number text UNIQUE,
  user_id FK → auth.users,
  customer_email, customer_name, customer_cpf,
  shipping_address jsonb,  -- {street, number, city, state, zip, complement}
  subtotal, discount, shipping_cost, total,
  status text CHECK (IN 'aguardando_pagamento','pago','separando','enviado','entregue','cancelado','reembolsado','cancelamento_solicitado'),
  payment_status text CHECK (IN 'pendente','aprovado','recusado','cancelado','reembolsado','chargeback'),
  payment_method text CHECK (IN 'pix','credito','debito','boleto'),
  affiliate_id FK → affiliates,
  coupon_code text,
  notes text,
  tracking_code text,
  invoice_number text, invoice_url text,
  fiscal_status text CHECK (IN 'nao_emitida','aguardando_emissao','emitida','autorizada','rejeitada','cancelada','erro_emissao','pendencia_fiscal'),
  bling_order_id bigint,
  created_at, updated_at
)

order_items (
  id, order_id FK → orders,
  book_id FK, combo_id FK, ead_course_id FK,
  title text, quantity int, unit_price numeric, total_price numeric
)

order_fulfillment_steps (-- tracks each step in the fulfillment pipeline)

order_cancellations (
  id, order_id FK,
  initiated_by text, initiated_by_id uuid,
  previous_status text, reason text,
  status text CHECK (IN 'pendente','aprovado','recusado'),
  reviewed_by uuid, reviewed_at timestamptz,
  refund_amount numeric,
  refund_status text CHECK (IN 'pendente','processando','concluido','falhou'),
  refund_transaction_id text,
  admin_notes text, created_at, updated_at
)

payment_transactions (
  id, order_id FK,
  gateway text, gateway_tx_id text,
  status text, amount numeric, payment_method text,
  pix_code text, response_raw jsonb,
  created_at
)

financial_movements (
  id, order_id FK,
  gross_amount, discount, shipping,
  gateway_fee, affiliate_commission, net_amount,
  payment_method, gateway, gateway_transaction_id,
  status, paid_at, created_at
)

fiscal_documents (
  id, order_id FK,
  status text, document_type text,
  document_number text, document_url text, xml_url text,
  error_message text, issued_at timestamptz,
  created_at, updated_at
)
```

### Editora — Shipping & Addresses

```sql
addresses (
  id, user_id FK,
  label text, full_name text,
  zip_code text, street text, number text, complement text,
  neighborhood text, city text, state text(2),
  is_default bool, created_at
)

shipping_rates (
  id, name text, state text(2),
  min_order_value numeric, price numeric,
  estimated_days int, is_free bool, is_active bool, created_at
)
```

### Editora — Engagement & Support

```sql
reviews (
  id, book_id FK, user_id FK, order_id FK,
  rating int CHECK (1-5), title text, body text,
  status text CHECK (IN 'pendente','aprovada','rejeitada'),
  created_at
)

support_tickets (
  id, ticket_number text UNIQUE,
  user_id FK, customer_name, customer_email, customer_phone,
  order_id FK, category text, subject text,
  status text,
  created_at, updated_at
)

support_messages (
  id, ticket_id FK,
  sender_id uuid, sender_name text,
  body text, is_admin bool, created_at
)

faqs (id, category_id FK → faq_categories, question, answer, position, is_active, is_featured, created_at)
faq_categories (id, name, slug, position, created_at)

leads (id, name, email, phone, origin, book_id FK, marketing_consent bool, created_at)
campaigns (id, title, subject, body, segment, status, sent_count, sent_at, created_at)
beta_feedback (id, page_url, message, user_id FK, user_email, user_name, status, created_at)
```

### Editora — Content & Configuration

```sql
contact_settings (id, email, whatsapp, phone, whatsapp_message, whatsapp_enabled, address, business_hours, instagram, facebook, youtube, updated_at)

legal_pages (id, type text CHECK (IN 'privacy','terms','returns','shipping','cookies','cancellation'), title, content, updated_at)

destaques (
  id, title, subtitle,
  image_url, image_mobile_url, video_url,
  focal_x numeric, focal_y numeric,
  cta_label, cta_url,
  type text CHECK (IN 'oferta','novidade','anuncio'),
  starts_at, ends_at, is_active bool, position int,
  created_at, updated_at
)

announcements (
  id, title, body, cta_label, cta_url,
  badge text, image_url,
  type text CHECK (IN 'promo','info','warning'),
  starts_at, ends_at, is_active bool,
  created_at, updated_at
)

news_posts (id, title, slug, summary, content, image_url, is_active, is_featured, published_at, created_at)

offers (
  id, name text,
  type text CHECK (IN 'book','combo','category','shipping'),
  book_id FK, combo_id FK, category_id FK,
  discount_type text, discount_value numeric,
  min_order_value numeric,
  starts_at, ends_at, is_active bool, created_at
)
```

### Affiliates

```sql
affiliates (
  id, user_id FK,
  type text CHECK (IN 'geral','jocum','diretor'),
  name, email, cpf, phone,
  status text CHECK (IN 'pendente','ativo','inativo','suspenso'),
  commission_rate numeric,
  balance numeric, balance_pending numeric,
  leader_name, leader_email, leader_phone,
  leader_token text, leader_confirmation text,
  leader_confirmation_notes text, leader_confirmed_at timestamptz,
  serving_location text,
  last_confirmed_at, requires_review bool, next_review_at,
  created_at
)

affiliate_links (id, affiliate_id FK, book_id FK, code text UNIQUE, clicks int, created_at)
affiliate_sales (id, affiliate_id FK, order_id FK, commission_amount, commission_rate, status text CHECK (IN 'pendente','confirmada','paga','cancelada'), created_at)
affiliate_coupons (id, affiliate_id FK, code text UNIQUE, discount_percent numeric, created_at, expires_at)
affiliate_withdrawals (id, affiliate_id FK, amount numeric, status text CHECK (IN 'pendente','processando','pago','recusado'), notes, paid_at, created_at)
```

### EAD (Multi-Tenant LMS)

```sql
tenants (id, slug, name, custom_domain, is_active bool, plan text, created_at)

tenant_settings (
  tenant_id FK → tenants,
  logo_url, primary_color,
  email_from_name, email_from_domain,
  bunny_library_id text, bunny_token_key text, bunny_cdn_hostname text,
  mp_access_token text, mp_public_key text,
  community_link text
)

tenant_admins (tenant_id FK, user_id FK)

ead_courses (
  id, tenant_id FK,
  title, slug, subtitle, description_short, description_full,
  thumbnail_url, cover_url, trailer_video_id,
  instructor_name, instructor_bio, instructor_photo_url,
  price numeric, price_promotional numeric,
  access_days int,
  is_active, is_featured, is_free bool,
  level text, language text,
  total_lessons int, total_duration_s int,
  certificate_enabled bool, sort_order int,
  created_by FK, created_at, updated_at
)

ead_modules (id, course_id FK, title, description, position int, is_free_preview bool, created_at, updated_at)

ead_lessons (
  id, module_id FK, course_id FK,
  title, slug,
  content_type text CHECK (IN 'video','texto','pdf','quiz','link_externo'),
  bunny_video_id text, duration_s int,
  content_body text, pdf_url text,
  external_url text, subtitle_url text,
  description text, is_free_preview bool,
  publish_at timestamptz, position int,
  created_at, updated_at
)

ead_lesson_attachments (id, lesson_id FK, label, url, type, position, created_at)

ead_enrollments (
  id, user_id FK, course_id FK, order_id FK,
  status text CHECK (IN 'ativa','expirada','suspensa','cancelada'),
  enrolled_at, expires_at, completed_at, cancelled_at,
  notes text
)

ead_lesson_progress (
  id, enrollment_id FK, lesson_id FK, user_id FK,
  completed bool, last_position_s int, watch_time_s int,
  completed_at, updated_at
)

ead_certificates (id, enrollment_id FK, user_id FK, course_id FK, certificate_code text UNIQUE, issued_at, student_name, course_title)

ead_reviews (id, course_id FK, user_id FK, rating int, body text, status text, created_at)

ead_qa_questions (id, lesson_id FK, user_id FK, body text, is_pinned bool, created_at, updated_at)
ead_qa_answers (id, question_id FK, user_id FK, body text, is_instructor bool, created_at, updated_at)

ead_quizzes (id, module_id FK, title, passing_score int, blocks_next bool, created_at)
ead_quiz_questions (id, quiz_id FK, body text, options jsonb, position int, created_at)
ead_quiz_attempts (id, quiz_id FK, user_id FK, answers jsonb, score int, passed bool, attempted_at)

ead_course_announcements (id, course_id FK, title, body text, sent_at, sent_by FK)
ead_wishlists (user_id FK, course_id FK, created_at)
```

### Contratos (Digital Signatures)

```sql
contratos (
  id, token text UNIQUE,
  client_name, client_email,
  contract_slug text,
  status text,
  otp_hash text, otp_expires_at timestamptz,
  signed_at timestamptz,
  signer_ip text, signer_user_agent text,
  signer_latitude numeric, signer_longitude numeric,
  evidence_json jsonb,
  created_at, expires_at
)
```

### Integrations & Logs

```sql
bling_tokens (id, access_token text, refresh_token text, expires_at timestamptz, updated_at)
email_logs (id, email_type text, sent_at timestamptz)
admin_logs (id, user_id FK, action text, entity text, entity_id text, details jsonb, ip text, created_at)
```

---

## 7. Authentication & Authorization

### How Auth Works
1. Supabase Auth handles identity (email/password, magic link)
2. On signup: a `profiles` row and a `user_roles` row are created
3. All server requests use Supabase SSR client with cookie-based session
4. Middleware (`lib/supabase/middleware.ts`) refreshes sessions on every request

### Roles (9 total)
| Role | Access |
|---|---|
| `super_admin` | Full system access |
| `admin_editora` | Books, orders, affiliates, coupons, fiscal |
| `admin_ead` | EAD tenant management |
| `admin_eifol` | EIFOL-specific admin |
| `cliente` | Purchase, track orders, manage account |
| `afiliado_jocum` | Affiliate dashboard, 50% fixed commission |
| `afiliado_diretor` | Director affiliate, 50% fixed commission |
| `lider_jocum` | Team leader, approves new Jocum affiliates |
| `afiliado_geral` | General/public affiliate program, progressive commission tier (10%→50%) |

**Note on `admin`-style RLS policies:** several early policies (pre-2026-07 migrations) were written checking `role = 'admin'` — a value that has never existed in this enum. Any policy like that silently blocks every real admin. Always check against the actual enum values above, typically `role IN ('super_admin', 'admin_editora')`.

### RLS Policy Groups
| Resource | Public | Logged-in | Admin |
|---|---|---|---|
| Books, categories, authors | Read (is_active=true) | — | Full CRUD |
| Orders | — | Own rows | All rows |
| Addresses | — | Own rows | Read |
| Affiliates | — | Own row | All rows |
| Reviews | Read (aprovada) | Own rows | Moderate |
| Leads | Insert | — | Read |
| EAD courses | Read (is_active=true) | — | Tenant admin |
| Lesson progress | — | Own rows (enrolled) | — |
| Certificates | Read (by code) | Own rows | — |

---

## 8. External Integrations

### Mercado Pago
**Purpose:** Primary payment gateway.

**SDK:** `mercadopago` v3.1.0, `@mercadopago/sdk-react`

**Payment methods:** PIX, credit card (up to 12x), debit card, boleto

**Flow:**
1. Checkout initializes a payment preference via SDK
2. Customer completes payment on MP widget
3. MP calls `/api/mp-webhook` with `payment.approved` or `payment.canceled`
4. Webhook verifies signature, updates order status, triggers Bling push, sends email

**EAD:** Separate webhook at `/api/ead/mp-webhook` for course purchases (creates enrollment)

**Config:**
```env
MERCADOPAGO_ACCESS_TOKEN=APP_USR-...
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=APP_USR-...
CLIENTE_ID=...
CLIENTE_SECRET=...
```

---

### Bling ERP v3
**Purpose:** Inventory management, sales orders, NF-e fiscal invoicing (SEFAZ).

**Auth:** OAuth2. Token stored in `bling_tokens` table (single row, auto-refreshed).

**OAuth flow:**
1. Admin clicks "Conectar Bling" → redirects to Bling consent URL
2. Bling redirects to `/api/bling/auth?code={authCode}`
3. Server exchanges code for `access_token` + `refresh_token`
4. Tokens stored in `bling_tokens` (upsert, single record)
5. `lib/bling/auth.ts` auto-refreshes before expiry on each API call

**Endpoints used:**
| Operation | Bling Endpoint |
|---|---|
| Find product by SKU | `GET /produtos?codigo={sku}` |
| Create product | `POST /produtos` |
| Update product | `PUT /produtos/{id}` |
| Update stock | `POST /estoques` |
| Find contact by email | `GET /contatos?email={email}` |
| Create customer | `POST /contatos` |
| Update customer | `PUT /contatos/{id}` |
| Create sales order | `POST /pedidos/vendas` |
| Create NF-e | `POST /nfe` |
| Submit NF-e to SEFAZ | `POST /nfe/{id}/enviar` |
| Get NF-e status | `GET /nfe/{id}` |
| List payment forms | `GET /formas-pagamentos` |

**Webhook:** Bling calls `/api/bling-webhook` on stock changes → updates `books.stock`

**Config:**
```env
BLING_CATEGORIA_LIVROS_ID=...   # Product category ID in Bling
BLING_PAYMENT_FORM_PIX=...      # Bling payment form ID for PIX
BLING_PAYMENT_FORM_DEFAULT=...  # Fallback payment form
```

> **CRITICAL:** Always read Bling API v3 docs before any integration work. The API has many non-obvious details — response envelopes, required fields, pagination, and payment form resolution differ significantly from other ERPs. See memory: `feedback_bling_docs_first.md`.

---

### Correios (CWS)
**Purpose:** Freight calculation and package tracking.

**Auth:** JWT token obtained per session, cached in-memory with 20-minute TTL.

**Services:**
| Service | Code | ETA |
|---|---|---|
| PAC | 03298 | 5–14 days |
| SEDEX | 03220 | 2–8 days |
| SEDEX 10 | 03158 | 1 day |

**Endpoints used:**
- `POST /token/v1/autentica/cartaopostagem` — Get auth token
- `GET /preco/v1/nacional/{serviceCode}` — Calculate freight
- `GET /sro/rastro/v1/objetos?codigosObjetos={code}` — Track package

**Config:**
```env
CORREIOS_USUARIO=editorajocum
CORREIOS_CODIGO_ACESSO=...
CORREIOS_CEP_ORIGEM=83511000          # Origin: Almirante Tamandaré/PR
CORREIOS_CONTRATO=9912265854
CORREIOS_CARTAO_POSTAGEM=0067428134
CORREIOS_DR=36                        # Distribution region: Paraná
CORREIOS_SANDBOX=false
```

---

### Melhor Envio
**Purpose:** Fallback shipping aggregator (Jadlog, Loggi, etc.) when Correios is unavailable.

**Endpoint:** `POST /api/v2/me/shipment/calculate`

**Config:**
```env
MELHOR_ENVIO_CLIENT_ID=9727
MELHOR_ENVIO_TOKEN=...
MELHOR_ENVIO_SANDBOX=false
MELHOR_ENVIO_FROM_CEP=83511000
```

---

### Bunny.net
**Purpose:** Video hosting and CDN for EAD lessons.

**Multi-tenant:** Each EAD tenant has its own `bunny_library_id`, `bunny_token_key`, and `bunny_cdn_hostname` stored in `tenant_settings`.

**Token flow:**
1. Student accesses lesson → frontend calls `/api/ead/bunny-token`
2. Server generates signed token (expires in ~2 hours)
3. Video embedded with token-authenticated URL

---

### Resend
**Purpose:** Transactional email.

**Functions in `lib/email/`:**
- `sendOrderConfirmationEmail()` — After payment approved
- `sendOrderShippingEmail()` — When order shipped (includes tracking code)
- EAD enrollment and certificate emails

**Config:**
```env
RESEND_API_KEY=...
```

---

### Supabase
**Config:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://xefpmolwcxxfckdvnncz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...   # Safe in browser (RLS enforces access)
SUPABASE_SERVICE_ROLE_KEY=...        # Server-only — bypasses RLS
SUPABASE_ACCESS_TOKEN=...            # CLI token for migrations
```

**Clients:**
- `lib/supabase/client.ts` — Browser client (with anon key)
- `lib/supabase/server.ts` — Server client (SSR, cookie session)
- `lib/supabase/middleware.ts` — Middleware session refresh

---

## 9. Key Business Workflows

### Checkout & Order Creation
```
1. Customer adds books/combos to cart (Zustand store)
2. Goes to /checkout
3. Enters shipping address → freight calculated via /api/shipping
4. Applies coupon code (discount validated server-side)
5. MP payment widget shown → customer pays
6. Payment approval reaches the order through one of three paths:
   a. /api/mp-webhook fires with payment.approved (primary path)
   b. checkOrderPaymentStatusAction() polls MP directly from the client
      (fallback when the webhook is slow/unregistered, e.g. localhost)
   c. Admin clicks "Verificar pagamento no MP" → adminSyncPaymentAction()
      (manual reconciliation when the webhook never arrived)
7. All three call the shared, idempotent processApprovedPayment()
   (lib/orders/process-approved-payment.ts), which:
   a. Updates order status='pago', payment_status='aprovado'
   b. Calculates affiliate commission and updates affiliate_sales/balance
   c. Records financial_movement (gross, fees, affiliate commission) —
      keyed by order_id, so re-running any path is a no-op
   d. Decrements book stock (only on first run per order)
   e. Calls pushOrderToBling() → creates Bling sales order + NF-e
   f. Sends order confirmation email via Resend (only on first approval)
8. Customer sees order in /minha-conta/pedidos

> **Data-integrity note:** financial_movements must only ever be written by
> processApprovedPayment(). Any new code path that marks an order 'pago'
> has to call it instead of updating orders directly — otherwise the order
> shows up in /admin/editora/pedidos but silently vanishes from
> /admin/editora/financeiro. If historical orders are ever found missing a
> financial_movements row, /admin/editora/financeiro has a "Sincronizar
> histórico" button (backfillFinancialMovements() in
> app/(admin)/admin/editora/financeiro/actions.ts) that reconciles them.
> `financial_movements.paid_at` must come from the payment's real
> `date_approved` at Mercado Pago — never from `orders.updated_at`, which
> reflects the last edit to the order (fulfillment status, tracking code,
> etc.) and silently produces the wrong date on the revenue chart.
> All admin/reporting date buckets and "today/this month" ranges must use
> the Brasília calendar (`America/Sao_Paulo`), never the server timezone,
> browser timezone, or raw UTC ISO-string prefixes. A payment at `02:44 UTC`
> on Jul 1 is `23:44` on Jun 30 in Brasília; grouping it by a UTC prefix puts
> it in a different day/month than the business sees. Use
> `lib/utils/brasilia-time.ts` for UTC query boundaries, and prefer
> half-open ranges (`.gte(startIso).lt(endIso)`) instead of inclusive
> end-of-period timestamps. The shared chart helper
> `lib/utils/revenue-chart.ts` (`buildRevenueBuckets()`) also buckets
> day/week/month/year in Brasília and is the only place that should compute
> revenue chart buckets — used by both
> `components/admin/financeiro-dashboard.tsx` and
> `components/admin/dashboard.tsx`.
> Lead analytics follows the same rule: never group `leads.created_at` with
> `created_at.slice(0, 10)` because that is a UTC day. Use
> `getBrasiliaDateKey()`/`formatBrasiliaDayMonth()` from
> `lib/utils/brasilia-time.ts` so `/admin/editora` lead KPIs and
> `/admin/editora/leads` analytics agree.
```

### Order Fulfillment (Admin)
```
1. Admin views /admin/editora/pedidos
2. Picks and packs → updates status to 'separando'
3. Generates shipping label → enters tracking code
4. Updates status to 'enviado'
5. System sends shipping email with tracking code
6. Customer tracks package via /minha-conta/pedidos/[id]
   (Correios tracking fetched on-demand via /api/correios-tracking)
```

### Affiliate Commission Calculation
```
Types and rates:
- geral: progressive tier (10% → 20% → 30% → 40% → 50% based on sales count)
- jocum / diretor: 50% fixed

Formula:
earnPct = commission_rate - coupon_discount_percent
commission = (earnPct / 100) * order.subtotal
Note: commission can be negative if discount > margin

Lifecycle:
1. Order paid → affiliate_sales row created (status='pendente', balance_pending += commission)
2. Admin approves → status='confirmada', balance += commission
3. Affiliate requests withdrawal → affiliate_withdrawals row created
4. Admin pays → status='pago'
```

### Affiliate Onboarding (Jocum type)
```
1. Affiliate fills /afiliados/inscricao (type=jocum/diretor)
2. System sends confirmation email to their designated leader (diretor)
3. Leader clicks /confirmar-afiliado/[token]
4. Leader confirms → affiliate status changes to 'ativo'
5. Commission tier unlocked
```

### EAD Course Purchase & Access
```
1. Student browses /ead/cursos → clicks course
2. Free course: "Enroll" button → ead_enrollments row created (no payment)
3. Paid course: redirects to Mercado Pago via /ead/checkout/[courseId]
4. /api/ead/mp-webhook fires → creates ead_enrollments row
   - expires_at = NOW() + course.access_days
5. Student accesses /ead/curso/[slug] → lesson tree visible
6. Video lessons: frontend fetches signed Bunny token → plays video
7. Watch time and position tracked via /api/ead/video-progress
8. On 100% completion → ead_certificates row auto-created
9. Certificate accessible at /certificado/[code] (public URL for QR codes)
```

### Digital Contract Signing
```
1. Admin creates contract from template, generates link with client email
2. Client opens /contrato/[token]
3. Reads contract → clicks "Aceitar e Assinar"
4. System generates OTP (6 digits, 15-minute expiry) → sends via email
5. Client enters OTP → verified
6. Signature captured:
   - IP address
   - User agent
   - Geolocation (browser permission)
   - Timestamp
   - Evidence stored as JSONB in contratos.evidence_json
7. contratos.status = 'signed', signed_at = NOW()
8. Confirmation email sent → client sees /contrato/[token]/obrigado
```

### Bling Sync (Inventory & Fiscal)
```
On order payment:
1. pushOrderToBling() called
2. For each order item:
   a. Lookup book by SKU in Bling (GET /produtos?codigo={sku})
   b. If not found: create product in Bling (POST /produtos)
   c. Store bling_product_id on books table
3. Lookup customer by email in Bling → create/update contact
4. Create sales order (POST /pedidos/vendas)
5. Generate NF-e → submit to SEFAZ
6. Store bling_order_id on orders table, update fiscal_status

Stock sync (bidirectional):
- Bling webhook → /api/bling-webhook → UPDATE books SET stock = X WHERE bling_product_id = Y
- Order payment → stock decremented in GrainUp
```

### Batch Book Import (XLSX)
```
Admin route: /admin/editora/livros/lote
1. Admin exports current book list as XLSX (with template columns)
2. Edits prices, descriptions, active status in spreadsheet
3. Uploads XLSX → server parses rows
4. Upserts books by SKU (create if new, update if exists)
5. Stock column intentionally excluded — Bling is source of truth for stock
```

---

## 10. Multi-Tenancy (EAD)

The EAD system supports multiple tenants (course providers), each with:
- Their own `tenants` row and `tenant_settings`
- Separate Bunny.net library (video isolation)
- Separate Mercado Pago credentials
- Custom branding (logo, primary color)
- Custom domain or subdomain

Tenant resolution: `lib/tenant/index.ts` → `getTenantFromHostname(hostname)` → looks up by custom domain or slug.

Tenant admins are tracked in `tenant_admins` (many-to-many). The `admin_ead` role grants access to the EAD admin panel for the user's assigned tenant.

---

## 11. Frontend Architecture

### Loading States (Mandatory Pattern)
Per `AGENTS.md`: every `page.tsx` must have a sibling `loading.tsx`. This enables instant navigation feedback — the skeleton appears the moment a route changes, before any server data fetches complete.

**Rules:**
1. Every new `page.tsx` ships with a `loading.tsx` in the same directory
2. Skeleton must mirror the actual page layout (same grid, card count, section order)
3. Use `<Skeleton className="…" />` from `@/components/ui/skeleton`
4. Skeleton renders content area only (layouts stay visible during navigation)

**By route group:**
| Group | Skeleton approach |
|---|---|
| `(admin)` | Use `<AdminLoading />` from `@/components/admin/admin-loading` |
| `(editora)` | Mirror grid/shelf layout |
| `(conta)` | Mirror cards in the main content area |
| `(checkout)` | Mirror step layout |
| `(auth)` | Simple centered card |

### State Management
- **Cart:** Zustand store (`stores/cart.ts`) — persisted to localStorage
- **Server state:** React Query v5 for data fetching with cache invalidation
- **Forms:** React Hook Form + Zod for validation

### Image Optimization
Next.js `<Image />` with these remote patterns configured in `next.config.ts`:
- Supabase Storage (project CDN)
- B-CDN (book cover CDN)
- Bunny.net CDN
- JOCUM WordPress media

---

## 12. Environment Variables Reference

```env
# === PUBLIC (exposed to browser) ===
NEXT_PUBLIC_SUPABASE_URL=https://xefpmolwcxxfckdvnncz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=APP_USR-...
NEXT_PUBLIC_APP_URL=https://editorajocum.com.br

# === PRIVATE (server-side only) ===

# Supabase
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_ACCESS_TOKEN=...

# Mercado Pago
MERCADOPAGO_ACCESS_TOKEN=APP_USR-...
CLIENTE_ID=...
CLIENTE_SECRET=...

# Bling (OAuth tokens stored in DB — no static key needed)
BLING_CATEGORIA_LIVROS_ID=...
BLING_PAYMENT_FORM_PIX=...
BLING_PAYMENT_FORM_DEFAULT=...

# Correios (CWS contract credentials)
CORREIOS_USUARIO=editorajocum
CORREIOS_CODIGO_ACESSO=...
CORREIOS_CEP_ORIGEM=83511000
CORREIOS_CONTRATO=9912265854
CORREIOS_CARTAO_POSTAGEM=0067428134
CORREIOS_DR=36
CORREIOS_SANDBOX=false

# Melhor Envio
MELHOR_ENVIO_CLIENT_ID=9727
MELHOR_ENVIO_TOKEN=...
MELHOR_ENVIO_SANDBOX=false
MELHOR_ENVIO_FROM_CEP=83511000

# Email
RESEND_API_KEY=...

# Runtime
NODE_ENV=production
```

---

## 13. Deployment

- **Host:** Vercel (automatic deploys from `main` branch)
- **Database:** Supabase cloud (PostgreSQL)
- **Migrations:** Nominally applied via Supabase CLI (`supabase db push`), but in practice most of this project's migration history was applied by executing SQL directly against production (there is no `supabase/config.toml` / linked project in this repo, and `supabase_migrations.schema_migrations` only tracks version `001`). **A migration file existing in `supabase/migrations/` is not proof it ran in production.**
  > On 2026-07-02 this was found to have caused real drift: migrations `003` (`admin_user_creations`), `006` (`book_events`, `campaigns`), and `026` (`promo_coupons`) were present in the repo but their tables had never been created in production — silently breaking the leads conversion funnel, email campaigns, admin-user audit log, and non-affiliate promo coupons for the entire time those features existed in the codebase, because the app code wraps tracking/coupon lookups in try/catch and never surfaced the "table does not exist" errors. Applied directly via the Supabase Management API and verified with `to_regclass('public.<table>')` (`NULL` = table genuinely absent, not an RLS/cache issue). **Before trusting that a feature backed by a table/migration works in production, verify the table actually exists** — don't assume from the migration file or from the app not throwing visible errors.
- **Webhooks:** All external webhook endpoints must be registered in their respective services (MP, Bling, Melhor Envio) pointing to the production URL

---

## 14. Coding Conventions

1. **Server Actions** for mutations (in `lib/actions/`) — avoid REST endpoints for simple data writes
2. **Server Components** by default; client components only when interactivity requires it
3. **Zod** for all input validation at system boundaries
4. **`loading.tsx`** required alongside every `page.tsx` (see section 11)
5. **No comments** unless the WHY is non-obvious — well-named identifiers suffice
6. **No premature abstraction** — duplicate logic is acceptable until a pattern is clear
7. **Supabase RLS** is the security layer — never rely solely on application-level checks
8. **`SUPABASE_SERVICE_ROLE_KEY`** is used only in server-side code where RLS must be bypassed (admin operations, webhooks)

---

## 15. Key Files Quick Reference

| File | What it does |
|---|---|
| `lib/bling/client.ts` | Bling API client (~700 lines) — all ERP operations |
| `lib/bling/sync.ts` | `pushOrderToBling()` and stock sync logic |
| `lib/bling/auth.ts` | Bling OAuth token management (refresh, store) |
| `lib/correios/client.ts` | Correios CWS REST client with in-memory token cache |
| `lib/orders/process-approved-payment.ts` | `processApprovedPayment()` — single, idempotent source of truth for marking an order paid (status, affiliate commission, `financial_movements`, stock, email, Bling). Called by the MP webhook, checkout polling, and admin manual sync — never update `orders.status='pago'` directly |
| `lib/utils/brasilia-time.ts` | Brasília calendar helpers (`America/Sao_Paulo`) for admin/reporting date ranges and chart buckets. Use these to build UTC query boundaries for "today", "this month", month offsets, and lead day keys so localhost, production, and browser rendering agree |
| `lib/utils/revenue-chart.ts` | `buildRevenueBuckets()` — shared day/week/month/year bucketing for revenue charts, using the Brasília calendar (not UTC string prefixes) so charts, KPIs, and movement tables agree. Used by `financeiro-dashboard.tsx` and `dashboard.tsx` |
| `lib/supabase/server.ts` | Server-side Supabase client factory (SSR cookies) |
| `lib/supabase/middleware.ts` | Session refresh middleware |
| `lib/email/index.ts` | All transactional email send functions |
| `lib/tenant/index.ts` | EAD tenant resolution from hostname |
| `lib/mp-refund.ts` | Mercado Pago refund handling |
| `stores/cart.ts` | Zustand cart store (client-side) |
| `types/database.ts` | Full auto-generated Supabase TypeScript types |
| `app/api/mp-webhook/route.ts` | Payment confirmation entry point (primary) — delegates to `processApprovedPayment()` |
| `app/(admin)/admin/editora/financeiro/actions.ts` | `backfillFinancialMovements()` — reconciles `orders` marked paid with missing `financial_movements` rows |
| `app/api/shipping/route.ts` | Freight calculation (Correios + Melhor Envio) |
| `app/(checkout)/checkout/actions.ts` | Checkout server actions |
| `components/admin/admin-loading/` | Reusable admin skeleton component |
| `AGENTS.md` | Mandatory agent rules (loading.tsx pattern) |
