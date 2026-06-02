# Model Passport + Modeling Studio — Full Scope

Goal: make ThriveIN feel **built for models from the ground up** — not "creators with a headshot field." Covers the public Passport (what casting directors / agencies see), the owner-side editor (zero-friction setup), and a new **Modeling Studio** workspace type (how models actually run a shoot or casting).

---

## Phase 1 — Model Passport (public + owner side)

### 1.1 Schema additions
New optional fields on `profiles` — only shown when `sub_roles` contains `model` (or `account_type` flags it). Nothing changes for non-models.

- `model_stats` jsonb — `{ height_cm, bust_cm, waist_cm, hips_cm, inseam_cm, shoe_eu, dress_eu, hair, eyes, skin_tone }`. Always stored metric; UI offers cm/in + EU/US/UK toggle.
- `model_unions` text[] — SAG-AFTRA, Equity, non-union, etc.
- `mother_agency` text + `mother_agency_verified` bool
- `agency_representation` jsonb[] — `[{ agency, city, contact, exclusive }]`
- `model_categories` text[] — Editorial, Commercial, Runway, Fitness, Fit, Hand, Plus, Petite, Mature, Alt, Parts, Promo, Print
- `polaroids` jsonb[] — separate from portfolio, dated, unretouched flag
- `comp_card_layout` jsonb — which 5 portfolio items make the comp card + ordering

### 1.2 Comp Card Builder (`/passport/comp-card`)
- 5-slot picker (Headshot · Profile · Full Body · Editorial · Swim/Fit) — drag-and-drop from portfolio
- Live preview at standard 5.5" × 8.5" comp-card ratio (industry standard)
- One-tap export: PDF (print-ready) + JPG (DM-ready) via existing `jsPDF` pipeline
- "Send to casting" sheet: copies pre-filled email body + attaches comp card

### 1.3 Public Model view
- When viewer hits `/epk/:id` and profile is a model → renders **ModelPassportLayout** instead of standard EPK
- Hero: full-bleed headshot + name + stats strip
- Sections: Polaroids · Tear Sheets · Portfolio (grid) · Reels · Co-signs · Agencies · Calendar/Availability
- Hides irrelevant creator-tier surfaces (Studios count, Vault size, etc.) — keeps Co-signs because casting directors want trust signals

### 1.4 Zero-friction portfolio ingest
- **Instagram** — paste handle, edge fn `ingest-instagram-feed` pulls the last 12 public posts via IG oEmbed/Graph (where allowed) into `portfolio_items` with `source='instagram'`
- **TikTok** — same pattern, `ingest-tiktok-feed`
- **Tear sheet importer** — paste a URL (Vogue, ID, Dazed, etc.) → OG-scrape cover image + credit line → adds to Tear Sheets section
- **Comp card PDF upload** — drop an existing PDF, Gemini Vision extracts photos + stats and pre-fills the builder
- All ingest paths reuse existing `fetch-link-metadata` + `extract-brief` pipelines

### 1.5 Casting-grade share
- New route `/comp/:passportId` — comp-card-only view (no nav, no marketing chrome) — what you'd send a casting director
- `?token=` variant for private/timeboxed shares
- Share toolbar adds "Comp Card link" + "Comp Card PDF" alongside existing EPK share

---

## Phase 2 — Modeling Studio (workspace_type='modeling')

A Studio template purpose-built for shoots and castings — same shell as Content / Music / Campaign Studios.

### 2.1 New workspace type
- `workspace_type='modeling'` registered in `workspaceTypes.ts`
- `ModelingStudioSection` rendered inside `StudioRoom` when type matches
- Mood gradient + cover defaults tuned for fashion (warm neutral → ink)

### 2.2 Tabs (4)
1. **Call Sheet** — date, location, call time, weather, parking, contacts (photographer, MUA, stylist, client, agency rep). One-tap "Add to Calendar" + "Get Directions" (reuses event tooling).
2. **Looks** — list of looks/outfits with reference images, wardrobe credits, accessories checklist. Drag-reorder = shooting order.
3. **Shot List** — reuses `content_shots` table with a `look_id` foreign key. AI-drafted from brief via existing `gen-content-shotlist` edge fn (prompt tuned for fashion).
4. **Wrap** — usage rights summary, image selects (client picks finals via approval flow), invoice trigger, auto-stamp credit to all collaborators.

### 2.3 New tables
- `modeling_looks` — `id, project_id, name, order_idx, wardrobe jsonb, reference_urls text[]`
- `modeling_call_sheets` — `id, project_id, shoot_date, call_time, location jsonb, contacts jsonb, weather_cache jsonb`
- `modeling_usage_rights` — `id, project_id, scope (editorial|commercial|social|OOH), territory, duration_months, exclusivity bool, rate_usd`

All RLS via existing `is_project_member` SECURITY DEFINER. GRANTs to authenticated + service_role.

### 2.4 Modeling-specific Thrive Agent tools
Registered under `orch_tool_registry`:
- `draft_call_sheet` — from date + location + collaborators
- `draft_usage_rights` — from scope + territory + duration → fills modeling_usage_rights + drafts invoice line item
- `weather_for_shoot` — server-side cache for the shoot date

### 2.5 Casting flow
- New "Casting Call" template for Gigs (`opportunity.type='casting'`) — fields for height range, age range, look, union status, fitting date, shoot date, usage, rate
- Model side: one-tap "Submit" attaches comp card PDF + reel + measurements
- Casting director (Company mode) gets a **comp-board** review UI: thumbnail grid of comp cards, side-by-side compare, shortlist toggle

---

## Phase 3 — Discovery + Match tuning for models

- Match filters add: height range, categories, union, agency-repped vs. freelance, polaroid age (<6 months)
- "Models near me" surface on Scout for casting-director accounts
- Smart Match weighting boosts models with: recent polaroids, complete stats, ≥3 tear sheets, agency verification

---

## Technical Section

### Files to create
- `src/components/passport/model/ModelPassportLayout.tsx` — public model EPK
- `src/components/passport/model/CompCardBuilder.tsx` — owner editor
- `src/components/passport/model/CompCardPreview.tsx` — print-ratio render (used in preview + PDF)
- `src/components/passport/model/StatsEditor.tsx` — unit-toggle aware
- `src/components/passport/model/PolaroidsSection.tsx`
- `src/components/passport/model/TearSheetsSection.tsx`
- `src/pages/CompCard.tsx` — `/comp/:passportId` route
- `src/components/projects/modeling/ModelingStudioSection.tsx`
- `src/components/projects/modeling/CallSheetTab.tsx`
- `src/components/projects/modeling/LooksTab.tsx`
- `src/components/projects/modeling/ShotListTab.tsx` (thin wrapper over existing shot list)
- `src/components/projects/modeling/WrapTab.tsx`
- `src/components/projects/modeling/UsageRightsForm.tsx`
- `src/lib/modelUnits.ts` — cm/in + EU/US/UK conversions
- `src/lib/compCardPdf.ts` — extends existing jsPDF EPK pipeline

### Edge functions to create
- `ingest-instagram-feed` — handle → portfolio items (oEmbed first, Graph API if user OAuths IG later)
- `ingest-tiktok-feed`
- `ingest-tearsheet` — URL → OG scrape → tear sheet entry
- `extract-comp-card-pdf` — Gemini Vision (`google/gemini-2.5-flash`) extracts stats + images
- `weather-for-shoot` — cached forecast for call sheet
- `draft-call-sheet` (Thrive Agent tool handler)
- `draft-usage-rights` (Thrive Agent tool handler)

### Migrations (one migration each, with GRANTs)
1. Add model fields to `profiles` (all nullable, no default change for non-models)
2. Create `modeling_looks` + RLS + GRANTs
3. Create `modeling_call_sheets` + RLS + GRANTs
4. Create `modeling_usage_rights` + RLS + GRANTs
5. Add `'modeling'` to `workspace_type` enum/check
6. Add `'casting'` to opportunity type + casting-specific columns on `opportunities`

### Reused infrastructure (no rebuild)
- `jsPDF` EPK export → comp card PDF
- `fetch-link-metadata` → tear sheet OG scrape
- `extract-brief` Gemini pipeline → PDF comp card ingest
- `gen-content-shotlist` → fashion shot list (prompt variant)
- `is_project_member` SECURITY DEFINER → all modeling-table RLS
- `useStorageQuota` → polaroids count against tier
- Approval flow → wrap-stage image selects
- `orch_tool_registry` → register new agent tools

### Out of scope (Phase 2 candidates)
- Native IG Graph OAuth (use oEmbed first; OAuth when user wants private posts)
- Models.com / Tagwalk feed import
- Side-by-side animated polaroid timeline
- Body-measurement diff alerts ("update your stats — last set is 90 days old" → already covered by existing `epk_refresh_suggestions`)

---

## Build order (recommended)
1. Migration 1 + Stats editor + Polaroids section (1 day)
2. Comp Card builder + PDF + `/comp/:id` route (1 day)
3. IG/TikTok/Tearsheet ingest edge fns (1 day)
4. ModelPassportLayout public view (½ day)
5. Modeling Studio: migrations 2–5 + Call Sheet + Looks + Wrap (1.5 days)
6. Casting opportunity type + comp-board review UI (1 day)
7. Match filter tuning + discovery weighting (½ day)

**Total: ~6.5 dev days** to a fully model-native experience.