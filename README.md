# Recipe Composition & Management System

Inter IIT Tech Meet 15.0 — Developers Selection Task

**Name:** : Yash Jain
**Roll No.:** : 25EC10147

> This README is built up incrementally alongside the project. Sections marked
> `_TODO_` are filled in as each build step lands.

## 1. Problem recap

A system for creating, composing, and exploring recipes where a recipe's
components can be either raw ingredients or **other recipes**, nested to
arbitrary depth (e.g. Lasagna → Bolognese Sauce → Tomato Sauce → Tomatoes).

## 2. Features implemented

**Core:**
- Project scaffold (monorepo, Docker Compose, Postgres + Prisma)
- Database schema + seed from provided dataset
- Authentication (register/login/refresh/logout, JWT access + httpOnly refresh cookie)
- Recipe CRUD (create/edit/delete, ownership-scoped, public/private visibility)
- Ingredient catalogue CRUD + search
- Recipe component management (add/remove ingredient or sub-recipe, edit quantity)
- Delete protection for recipes still used as a component elsewhere
- Circular dependency prevention (write-time reachability check + self-reference guard)
- Recursive recipe expansion (consolidated ingredient totals, servings-scaled)
- Recursive composition tree endpoint + "used by" (dependents) endpoint
- Recipe explorer UI (recursive, expand/collapse, unbounded depth)
- Recipe builder UI (details form + component manager)
- Swagger API docs

**Bonus (see §9 for detail):**
- Search / category / diet-type filters on the recipe browser
- Category typeahead (type-to-filter + free entry) on the recipe form
- Inline "create a new ingredient" when a search comes up empty, from
  inside the component manager
- Vegetarian / vegan / non-vegetarian classification, computed
  **recursively** through every recipe's full ingredient closure (including
  via sub-recipes) and backfilled across all 55 seeded recipes, not just
  newly created ones
- Recursive cost, calorie, and prep/cook-time **rollup** across the full
  composition tree, extending the same traversal used for ingredient
  expansion
- Food-site visual redesign: photo cards (with offline-safe fallback),
  hero banner, hover/loading animations, warm color system

## 3. Technology stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 15 (App Router) + TypeScript + Tailwind CSS + TanStack Query |
| Backend | NestJS 10 + TypeScript + Prisma ORM |
| Database | PostgreSQL 16 (Docker) — PostgreSQL 18 (native service) also verified working, see §5 |
| Auth | JWT (short-lived access token + httpOnly-cookie refresh token) |
| Infra | Docker, Docker Compose |

See §8 "Design decisions" for why Postgres over MongoDB.

## 4. Project structure

```
recipe-system/
├── api/                    NestJS backend
│   ├── prisma/
│   │   ├── schema.prisma   data model
│   │   ├── seed.ts         loads the dataset, backfills diet classification
│   │   │                   (recursive ingredient-closure walk) and
│   │   │                   illustrative cost/kcal/time reference data
│   │   ├── seed-data/
│   │   │   ├── recipes.json / ingredients.json   provided dataset
│   │   │   └── ingredient-attributes.ts          cost/kcal/diet reference table
│   │   └── migrations/     generated SQL migrations
│   └── src/
│       ├── auth/
│       ├── users/
│       ├── ingredients/
│       ├── recipes/        recipe CRUD + component management
│       ├── graph/           cycle detection, recursive expansion, tree builder
│       ├── prisma/          PrismaService
│       └── common/
├── web/                    Next.js frontend
│   ├── app/
│   │   ├── recipes/
│   │   │   ├── page.tsx          browse/search
│   │   │   ├── new/page.tsx      create recipe (basic fields)
│   │   │   └── [id]/
│   │   │       ├── page.tsx      explorer / total ingredients / used-by tabs
│   │   │       └── edit/page.tsx details form + component manager
│   │   ├── login/, register/
│   │   └── providers.tsx         React Query + auth context
│   ├── components/
│   │   ├── TreeNode.tsx           recursive composition-tree renderer
│   │   ├── ComponentManager.tsx   add/remove/edit recipe components
│   │   ├── RecipeForm.tsx
│   │   ├── RecipeImage.tsx        photo with graceful emoji/gradient fallback
│   │   ├── DietBadge.tsx
│   │   └── NavBar.tsx
│   └── lib/                       api client, auth context, types, category-visuals
├── docker-compose.yml
├── .env.example
└── README.md
```

## 5. Setup instructions

### Option A — Docker Compose (recommended)

```bash
cp .env.example .env
docker compose up --build
```

- API: http://localhost:4000 (Swagger docs at `/docs`)
- Web: http://localhost:3000
- Postgres: localhost:5433 on the host (mapped from 5432 inside the
  container — see note below), reachable as `db:5432` from other containers

On first boot the `api` container runs `prisma migrate deploy` then seeds the
database from `api/prisma/seed-data/*.json` (idempotent — safe to restart).

> **Note:** `POSTGRES_PORT` defaults to `5433`, not Postgres' usual `5432`,
> because a locally-installed Postgres service commonly already owns `5432`
> on the host — which is exactly what happened in development here, causing
> Prisma to authenticate against the wrong server. Container-to-container
> traffic (`api` → `db`) always uses `5432` internally regardless of this
> setting; only the host-exposed port changes. Set `POSTGRES_PORT=5432` in
> `.env` if you know the port is free on your machine.

> **Known limitation — `api` container.** The `db` and `web` containers build
> and run cleanly. The `api` Dockerfile hit (and the project history shows
> fixed, in order): a missing `linux-musl` Prisma engine target, a missing
> `libssl` package on the Alpine base, `nest build`'s output path not
> matching a `tsconfig.json` without `rootDir` set, and a stale incremental
> build-info file silently skipping compilation. Those are fixed in the
> current `Dockerfile`/`tsconfig.json`, but the last full `docker compose up
> --build` of all three services together was not completed and reverified,
> because Docker Desktop itself became unstable (repeated engine crashes,
> unrelated to this project) partway through — at that point development
> continued directly against Postgres (Option B/C below), which is fully
> verified. If `docker compose up --build` doesn't come up clean for you,
> `docker compose logs api` plus the fixes already applied to `api/Dockerfile`
> is the place to continue from.

### Option B — Local development (Postgres via Docker)

```bash
# 1. Start Postgres only
docker compose up db -d

# 2. Backend
cd api
npm install
cp ../.env.example .env   # adjust DATABASE_URL host to localhost
npx prisma migrate dev
npm run seed
npm run start:dev

# 3. Frontend (separate terminal)
cd web
npm install
npm run dev
```

### Option C — Local development (any Postgres instance)

The app only needs a reachable Postgres and doesn't care how it got there.
If you already run Postgres natively (Windows service, Homebrew, apt, etc.)
instead of via Docker:

```bash
psql -U postgres -c "CREATE ROLE recipes WITH LOGIN PASSWORD 'recipes_dev_password';"
psql -U postgres -c "CREATE DATABASE recipes OWNER recipes;"
```

then point `api/.env`'s `DATABASE_URL` at that instance (e.g.
`postgresql://recipes:recipes_dev_password@localhost:5432/recipes?schema=public`)
and continue from step 2 above (`migrate dev`, `seed`, `start:dev`). This is
exactly how local development for this submission was done after Docker
Desktop proved unstable on the development machine (see note below) — fully
verified end-to-end against PostgreSQL 18.

## 6. Environment variables

See [.env.example](.env.example). Summary:

| Variable | Description |
|---|---|
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Postgres credentials |
| `POSTGRES_PORT` | Host-side port Postgres is published on (default `5433`; see note in §5) |
| `DATABASE_URL` | Prisma connection string |
| `PORT` | API port (default 4000) |
| `CORS_ORIGIN` | Allowed frontend origin |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | JWT signing secrets |
| `JWT_ACCESS_TTL` / `JWT_REFRESH_TTL` | Token lifetimes |
| `NEXT_PUBLIC_API_URL` | API base URL the frontend calls |

## 7. Database schema

Generated and applied against PostgreSQL 16/18; full SQL in
`api/prisma/migrations/` (four migrations: `init` from `prisma/schema.prisma`,
a hand-written `component_constraints` migration adding the CHECK
constraints and `pg_trgm` search indexes Prisma's schema language can't
express — see inline comment in that file — a `diet_type` column addition,
and a `restore_trgm_indexes` migration fixing a real gotcha hit along the
way: running `prisma migrate dev` after the hand-written migration silently
*dropped* the trigram indexes, because they're invisible to Prisma's schema
diff and it treats anything it doesn't recognize as drift to reconcile
away. Worth knowing before adding more hand-written SQL here.

Core tables: `users`, `units`, `ingredients`, `recipes`, `recipe_components`.

```mermaid
erDiagram
    USERS ||--o{ RECIPES : owns
    UNITS ||--o{ INGREDIENTS : "default unit"
    UNITS ||--o{ RECIPE_COMPONENTS : "quantity unit"
    INGREDIENTS ||--o{ RECIPE_COMPONENTS : "used as"
    RECIPES ||--o{ RECIPE_COMPONENTS : "has components (parent)"
    RECIPES ||--o{ RECIPE_COMPONENTS : "used as sub-recipe (child)"

    USERS {
        uuid id PK
        text email
        text password_hash
        text display_name
    }
    UNITS {
        text code PK
        text dimension
    }
    INGREDIENTS {
        uuid id PK
        text name
        text default_unit_code FK
    }
    RECIPES {
        uuid id PK
        uuid owner_id FK
        text name
        int servings
        int prep_min
        int cook_min
        text diet_type
        bool is_public
    }
    RECIPE_COMPONENTS {
        uuid id PK
        uuid parent_id FK
        text kind
        uuid ingredient_id FK
        uuid child_recipe_id FK
        decimal quantity
        text unit_code FK
    }
```

- **`recipe_components`** is the single edge table representing the recipe
  DAG: each row is one child (`kind = 'ingredient' | 'recipe'`) of a parent
  recipe, with an XOR constraint ensuring exactly one of `ingredient_id` /
  `child_recipe_id` is set.
- **`units`** stores only the unit code and its physical dimension
  (`mass`/`volume`/`count`). The provided dataset uses only `g`, `ml`,
  `piece` — each already a base unit — so no conversion-factor column is
  needed; this is simpler than a `to_base` design and can be revisited if a
  future dataset introduces mixed units (e.g. `kg`, `tsp`).
- Deleting a recipe that another recipe depends on is blocked
  (`ON DELETE RESTRICT` on `child_recipe_id`) to protect reuse integrity.
- **`ingredients`** also carries `cost_per_unit`, `kcal_per_unit`,
  `is_vegetarian`, `is_vegan` — all nullable (unknown by default for
  ingredients a user adds themselves), populated for the seeded catalogue
  via `prisma/seed-data/ingredient-attributes.ts`.
- **`recipes.diet_type`** is a plain nullable string (`vegetarian` /
  `vegan` / `non-vegetarian`), stored rather than derived on every read.
  For the seeded dataset it's computed once by recursively walking each
  recipe's full ingredient closure (through sub-recipes) and taking the
  strictest classification found — see `classifyRecipeDiet` in `seed.ts`.
  For recipes created through the app, the user sets it directly on the
  recipe form (auto-deriving it from a live, still-changing component list
  would need re-running that same recursive walk on every component add/
  remove — a reasonable follow-up, not done here; noted as an assumption
  in §10).

## 8. Design decisions

- **PostgreSQL over MongoDB.** The data is fundamentally a DAG (recipes
  referencing recipes), not a document tree — embedding would defeat the
  "edit once, update everywhere" reuse requirement. Postgres gives
  referential integrity on component references and `WITH RECURSIVE` CTEs
  for expansion/cycle-detection in a single query.
- **Adjacency-list model (`recipe_components`), not nested JSON.** Keeps
  depth unbounded by construction; no code path assumes a fixed number of
  levels.
- **Sub-recipe quantity = servings consumed**, not a raw amount — the
  expansion scales a child recipe's ingredients by
  `component.quantity / child.servings`.
- **Cycle prevention at write time** (reachability check before inserting a
  recipe-type component) **and** defensive containment at read time
  (visited-path tracking + depth cap in every recursive traversal), so a
  cycle can never be created through the API and can never hang a query even
  if one existed in imported data.
- **Cost/kcal/time rollup reuses the expansion traversal**, not a second
  recursive pass — `GraphService.expand()` already visits every node in the
  tree to flatten ingredient quantities, so it also accumulates cost, kcal,
  and each visited recipe's own `prepMin`/`cookMin` in the same walk.
  Quantity-scaled fields (cost, kcal) use the same `factor` as ingredient
  totals; time fields don't scale with quantity (a recipe's prep/cook time
  doesn't change because you made 3× the sub-recipe), so they're summed
  once per node visited instead.
- **Food photos degrade gracefully.** `RecipeImage` requests a real photo
  from a free, keyless, tag-based source and swaps to a deterministic warm
  gradient + category emoji on load failure (`onError`), so the UI never
  shows a broken-image icon even without internet access to that service —
  only the photo is best-effort; the rest of the app has no external
  runtime dependency.

## 9. Bonus features

**Recipe features**

- **Search / filter UI**: the recipe browser (`/recipes`) has a live search
  box plus category and diet-type dropdowns, all backed by real API query
  params (`?q=&category=&dietType=`).
- **Category typeahead**: the recipe form's Category field is a native
  `<input list>` + `<datalist>` combo backed by `GET /recipes/meta/categories`
  — it suggests existing categories as you type but still accepts free text
  for a new one.
- **Vegetarian / non-vegetarian / vegan classification**, computed
  *recursively* (see §8) and applied to **all 55 seeded recipes**, not just
  ones created after the feature landed — 10 vegan, 29 vegetarian, 18
  non-vegetarian in the current seed.
- **Estimated cost & nutritional information**, recursively summed across
  the full composition tree (`GET /recipes/:id/expand` now returns
  `{ ingredients, totals: { totalCost, totalKcal, totalPrepMin,
  totalCookMin } }`), shown as stat chips on the recipe page and a
  per-ingredient + total breakdown on the "Total ingredients" tab. The
  dataset has no real pricing/nutrition data, so these are illustrative
  reference values (see §10).
- **Prep/cook time**: already-existing fields, now also rolled up
  *recursively* the same way — a composed dish's total time includes every
  sub-recipe's time, not just its own.
- Inline **"add a new ingredient"** from the component picker: searching for
  an ingredient that doesn't exist surfaces a "+ Add … as a new ingredient"
  option that creates it (`POST /ingredients`) and attaches it in one step,
  instead of forcing a trip to a separate ingredient-management screen.

**Engineering / UI**

- Rate limiting (`@nestjs/throttler`, global, 120 req/min per IP) — see the
  honest answer on reverse proxy / caching in §14.
- Visual redesign: warm food-site color system, real food photos per
  category with an offline-safe fallback, hover/scroll animations, loading
  skeletons, a hero banner with a live "fresh off the pass" teaser strip.

**Not done** (see §15 for the fuller prioritized list of what's left):
dependency graph visualization, recipe duplication/import-export/versioning,
shopping-list export, reverse proxy, server-side caching, automated tests.

## 10. Assumptions

- A recipe can be marked public/private; public recipes can be reused as
  components by other users, but a public recipe cannot be deleted while
  other recipes depend on it (regardless of owner).
- The provided dataset's `components[].quantity` for a `type: "recipe"`
  component (when present) is interpreted as "servings of the child recipe
  consumed"; when absent it defaults to `1`.
- All seeded recipes are attached to a single demo user
  (`demo@recipes.local`) and marked public.
- **Cost, calorie, and prep/cook-time figures are illustrative, not real
  data.** The provided dataset has no pricing, nutrition, or timing fields.
  `prisma/seed-data/ingredient-attributes.ts` assigns each of the 71
  ingredients a plausible cost-per-unit and kcal-per-unit (standard
  nutrition-database order of magnitude), and `seed.ts` assigns each recipe
  a category-based prep/cook time estimate — purely so the recursive
  rollup feature (§9) has real numbers to demonstrate on, not as an
  accurate price list or nutrition label.
- A recipe's `dietType` is auto-computed (recursively) only for the seeded
  dataset; recipes created through the app have the user set it directly on
  the form rather than it being re-derived live as components change.
- Cost/kcal roll-up assumes a `recipe_component`'s `unitCode` matches the
  ingredient's own `defaultUnitCode` (true throughout the seeded data) —
  `estimatedCost`/`estimatedKcal` are simply `quantity × ingredient's
  per-unit rate`, with no cross-unit conversion.

## 11. API documentation

Interactive Swagger UI is served at `/docs` once the API is running.

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | — | Create account; sets refresh cookie, returns access token |
| POST | `/auth/login` | — | |
| POST | `/auth/refresh` | refresh cookie | Rotate access token |
| POST | `/auth/logout` | — | Clears refresh cookie |
| GET | `/auth/me` | required | |
| GET | `/ingredients?q=` | — | Search the ingredient catalogue |
| POST / PUT / DELETE | `/ingredients(/:id)` | required | Delete blocked if the ingredient is in use |
| GET | `/recipes?q=&category=&dietType=` | optional | Public recipes + the caller's own private ones |
| GET | `/recipes/meta/categories` | — | Distinct category list (filter dropdown / form typeahead) |
| GET | `/recipes/:id` | optional | Shallow — direct components only |
| GET | `/recipes/:id/tree` | optional | Full nested composition (Recipe Explorer data source) |
| GET | `/recipes/:id/expand?servings=` | optional | `{ ingredients[], totals: { totalCost, totalKcal, totalPrepMin, totalCookMin } }` — recursively flattened |
| GET | `/recipes/:id/dependents` | optional | Recipes using this one, directly or transitively |
| POST | `/recipes` | required | |
| PUT / DELETE | `/recipes/:id` | required, owner | Delete blocked (409) if another recipe depends on it |
| POST | `/recipes/:id/components` | required, owner | Add ingredient or sub-recipe; rejects cycles (409) |
| PUT / DELETE | `/recipes/:id/components/:componentId` | required, owner | |

Full request/response schemas, including the DTO validation rules, are in
Swagger at `/docs`.

## 12. Infrastructure capabilities

Honest status on three commonly-expected pieces, since they're easy to
claim and easy to get wrong:

| Capability | Status |
|---|---|
| Rate limiting | ✅ Implemented — `@nestjs/throttler`, global guard, 120 requests/minute per IP (`app.module.ts`) |
| Reverse proxy | ❌ Not implemented — `nginx` is listed as a possible piece in the task brief but isn't in `docker-compose.yml`; `web` and `api` are each exposed directly on their own port |
| Server-side caching | ❌ Not implemented — no Redis, no HTTP `Cache-Control` headers. TanStack Query does client-side caching in the browser, which is not the same thing |
| Health checks | ✅ `GET /health` (checks DB connectivity via `SELECT 1`), used by the `db` container's Compose healthcheck |

## 13. Deployment

_TODO._

## 14. Verification

The backend was exercised end-to-end against a real Postgres instance
seeded from the provided dataset (55 recipes / 71 ingredients), not just
read through — notably:

- **Recursive tree** (`GET /recipes/:id/tree`) on `Chicken Lasagna` correctly
  reproduces 5 levels of nesting
  (`Chicken Lasagna → Lasagna Sauce → Bolognese Sauce → {Bolognese Base,
  Tomato Sauce}`), matching the pattern in the problem statement's own
  Lasagna example.
- **Recursive expansion** (`GET /recipes/:id/expand`) on the same recipe
  produces correct servings-scaled totals, e.g. *Beef 100 g* at the base of
  a `÷6 → ÷4 → ÷4` serving chain correctly flattens to `1.0417 g`.
- **Circular dependency prevention**: built a 3-recipe chain `A → B → C`,
  then confirmed `POST /recipes/C/components` with `childRecipeId: A` is
  rejected `409` *before* any row is written, and a direct
  self-reference (`A → A`) is rejected the same way.
- **Delete protection**: `DELETE /recipes/B` while `A` still depends on it
  returns `409` with the blocking recipe listed, rather than cascading or
  silently failing.
- Auth (register/login/`/auth/me`), ownership checks, and ingredient search
  were all verified against live HTTP responses, not mocked.
- **Recursive diet classification**: after seeding, all 55 recipes are
  classified (0 left `null`) — 10 vegan / 29 vegetarian / 18 non-vegetarian
  — and `Chicken Lasagna` is correctly `non-vegetarian`, which only holds if
  the classifier actually walked into its sub-recipes (`Chicken` and `Beef`
  don't appear directly on the root recipe, only several levels down).
- **Recursive cost/kcal/time rollup**: `Chicken Lasagna`'s own `prepMin`/
  `cookMin` are 17/22, but `GET /recipes/:id/expand`'s `totals` reports
  `totalPrepMin: 73, totalCookMin: 103` — correctly larger, since it's
  summing every sub-recipe's time across `Lasagna Sauce → Bolognese Sauce →
  {Bolognese Base, Tomato Sauce}` and `White Sauce`, not just the root's.
  `totalCost`/`totalKcal` were spot-checked by hand against the per-line
  `estimatedCost`/`estimatedKcal` values for the same recipe.
- **Homepage CTA fix**: the "Start cooking — it's free" button linked to
  `/register` unconditionally, including for already-logged-in users; it's
  now auth-aware (`/recipes/new` + "Create a recipe" when logged in).

The frontend was run against this live API (`next dev` + `nest start:dev`):
all core routes (`/`, `/recipes`, `/recipes/:id`, `/recipes/:id/edit`,
`/login`, `/register`, `/recipes/new`) compile and server-render without
errors, and `npx tsc --noEmit` is clean on both `api` and `web` after every
change in this session.

## 15. What's left

Roughly in priority order, not yet built:

- **Tier 2 bonus**: visual dependency graph (e.g. React Flow), recipe
  duplication, recipe import/export as JSON, shopping-list export
- Reverse proxy (nginx) and server-side caching (§12)
- Automated tests — correctness so far has been verified manually against
  live HTTP responses and a real seeded database (see §14), not via a test
  suite
- A full, verified `docker compose up --build` of all three services
  together (see the known-limitation note in §5)
- Deployment to a live host (§13)
