# Jigmesoft demo: merchant flow on Next.js + NestJS + PostgreSQL

This is the demo described in *Demo Plan* (merchant flow: enquiry → pre-costing → WIP, order entry and CAD tab),
built as the one-application layout from the *Migration Proposal*. It is a new codebase with its own new
database. It does not read or change the current CodeIgniter/MySQL system (`D:\PHP_projects\jigmesoft`);
that code was only read to carry the business rules over.

| Layer    | Technology |
|----------|------------|
| Frontend | Next.js 15 (App Router, static export), React 19, Ant Design 5, jspreadsheet CE 4 grids, TanStack Query |
| Backend  | NestJS 11 (serves `/api` and the built screens: one program) |
| Database | PostgreSQL 17 with Prisma 6; row-level security per company |
| Shared   | `src/shared`: Zod rules, grid definitions, constants used by both screens and API |

## Run it

Needs Node.js 20 or later. No PostgreSQL install is needed for local work: `npm run db:start` runs real
PostgreSQL binaries from the `embedded-postgres` package, keeping data in `.pgdata/`.

```bash
npm install
cp .env.example .env          # then put long random values in the secrets (see the comments)

# first time only: start the database once, then create tables and demo data
npm run db:start              # leave running, in its own terminal
npm run db:setup              # migrations + seed (in another terminal)
# stop db:start with Ctrl+C afterwards

npm run dev                   # database + API (port 4000) + screens (port 3000) together
```

Open http://localhost:3000.

**One program (as in production):** `npm run build` then `npm start` (with the database running).
NestJS then serves the screens and the API on http://127.0.0.1:4000.

**Managed PostgreSQL:** skip `db:start` and set `DATABASE_URL` (app role) and `DIRECT_DATABASE_URL`
(owner role, used by migrations and the seed). The app role must not be a superuser or the table owner,
otherwise row-level security does not apply to it. The RLS migration grants it data access if it is named
`azibo_app`.

### Demo users (password = `DEMO_PASSWORD` in `.env`)

| User | Company | Type | Can do |
|------|---------|------|--------|
| `merchant1` | Demo Garments (DGL) | 3 Merchandising | The whole flow |
| `merchant2` | Demo Garments (DGL) | 3 Merchandising | Own orders only; cannot see merchant1's |
| `mgmt1` | Demo Garments (DGL) | 2 Management | Sees the company's orders, read only |
| `sunrise.merchant` | Sunrise Knits (SKL) | 3 Merchandising | Another company: sees none of DGL's data |

`system.authorizer.dgl` / `.skl` are the fixed demo authorizing users. They cannot sign in.

## Look and feel

The screens follow the current PHP Jigmesoft UI: the ERP sign-in card, the navy title bar with
`| company | dept | name | designation |`, the grey top menu (Enquiry List ▾, WIP List ▾), DataTables-style
lists ("Show 50 Entries", Search, "Showing 1 to N of N Entries"), the three-column *New Enquiry Details* form
(same fields and order as `merchant/addeditenquiry.php`, Brand → Buyer/Country auto-filled), the WIP page with
*ORDER PROCESSING*, ORDER ENTRY / CAD tabs, and jExcel-style grids (jspreadsheet CE 4) with page number and SAVE.
Colours are taken from `company/template/templateheader.php` (navy `#022B61`, grey `#EBECEC`).

## The flow (demo plan section 3)

1. **Merchant login**: `merchant1`.
2. **Enquiry**: *Add New Enquiry*: Order / Enq. Ref. No (typed, unique per company), dates, style, type, mode, brand
   (buyer and country fill in), quantity, components, combos, size range, prices, request for → Save. Status `-` (new).
3. **Pre-costing**: component, cost lines (fixed dropdowns), total → SAVE. Saving **authorizes the order**.
4. **WIP list**: the order is listed with its ISR / IOR code.
5. **Order entry tabs**: open the order. Five sub-tabs, each with its own SAVE, read back when reopened.
6. **CAD tab**: CAD Requirement Details grid + remarks → SAVE. There is no CAD REQUEST button.

### What saving pre-costing does (demo plan section 4)

Done in one transaction in [authorization.service.ts](src/server/costing/authorization.service.ts),
following `Menquirymodel::fnAuthorize` in the current code:

1. Status `APPROVED` (2), authorized date/time, fixed demo user as authorizer.
2. ISR / IOR code in today's format `ISR/<mmyy>/<company prefix>-<n>`, e.g. `ISR/1126/DGL-4`. The number
   runs per company and fiscal year (April to March), as `getOrderEnquiryCount` does. It comes from an atomic
   counter, so two saves at the same moment cannot get the same number.
3. A status history row (`enquiry_status_logs`).
4. The order appears on the merchant's WIP list (approved orders of the signed-in merchant and company).

Saving the pre-costing again updates the costs but does not re-authorize or change the code. A cost sheet
with a zero total is refused, because saving it would authorize the order.

### Rules (demo plan section 6)

- **Merchant only**: only user type 3, and only the order's own merchant, can save order entry and CAD.
  Others see the order read only. The API enforces this, not only the screens.
- **Company separation**: every query filters on the company, and PostgreSQL row-level security
  ([migration](prisma/migrations/20261116070000_rls_and_grants/migration.sql)) blocks other companies' rows
  even if a filter is forgotten.
- **Order code**: given when pre-costing is saved.
- **Order data**: one record set per sub-tab (`order_entry_sheets`, `jsonb`), plus `cad_requirements`,
  validated by the shared Zod rules. Read-only columns (P.O. qty, itemized qty, countries) are recalculated
  by the API on every save.

## Checks

With the app running:

```bash
node scripts/smoke-test.mjs                 # 34 API checks: flow, roles, company separation, RLS
node scripts/ui-walkthrough.mjs             # whole flow in a headless Microsoft Edge, with screenshots
npm run typecheck
```

## Layout

```
prisma/            schema, migrations (tables + RLS), seed
scripts/           embedded-db, smoke-test, ui-walkthrough
src/shared/        constants, Zod schemas, grid definitions, ISR/IOR code format
src/server/        NestJS: auth, masters, enquiry, costing (+ authorization), wip (order entry + CAD)
src/web/           Next.js screens: login, enquiries, pre-costing, WIP list, order page
```

## Demo simplifications (on purpose, per the demo plan)

- Pre-costing is reduced to one component, cost lines and a total; the full calculations are the next step.
- Order entry and CAD grids use jspreadsheet CE 4 with the columns of the current grids; dropdowns that come from
  masters in the current system (mode of enquiry, ports, process flow) use fixed demo lists.
- One session cookie (8 hours, httpOnly, SameSite=Strict) instead of short access + rotating refresh tokens.
  CSRF is blocked by the SameSite cookie plus a required request header.
- No audit log beyond the status history, no file uploads, quota, queue or emails.
