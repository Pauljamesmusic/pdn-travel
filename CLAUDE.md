# PDN Travel — notes for Claude

npm workspaces monorepo: `apps/api` (NestJS 11 + Prisma/SQLite) and `apps/web` (React 19 + Vite 7 + Tailwind v4). See README.md for setup.

## Commands (run in `pdn-travel/`)
- `npm run dev` — API :3000 (prefix `/api`, static `/uploads`) + web :5173 (Vite proxies `/api` and `/uploads`)
- `npm run typecheck` — both apps; run after every change
- `npm run db:reset` — wipe + reseed (destroys admin edits)

## Conventions
- **Design tokens only.** Use semantic Tailwind colours (`bg-surface`, `text-fg-muted`, `border-line`, `bg-brand`, `text-fg-accent`…) and type utilities (`text-h1`…`text-meta`, `text-caps`) from `apps/web/src/styles/index.css`. No raw hex. Hero, WTD card and footer are pinned dark with `data-theme="dark"`.
- **RTL.** Use logical utilities (`ms-/me-/ps-/pe-/start-/end-`, `text-start`) and `rtl:-scale-x-100` on directional icons.
- **i18n.** UI strings live in `apps/web/src/locales/en.ts` (source of `TranslationKey`). Add every new key to `hi`, `ml`, `fr`, `ar`, `ne` too. Admin panel is English-only.
- **Icons.** lucide-react; admin-selectable icons must be registered in `src/components/Icon.tsx` (`ICONS`).
- **Security.**
  - Every admin endpoint must live under `/api/admin/*`, which is guarded globally by `AdminAuthGuard`. Owner-only endpoints also need `@Roles('OWNER')`.
  - Image/link fields use `@IsSafeUrl()`.
  - Never render CMS content as HTML: use `RichText`/`safeHref`.
- **Admin data fetching.** Use `adminApi`/`useAdminApi` (`src/admin/api.ts`) so a 401 signs the user out. Call `invalidate()` after writes so public pages refetch.

## Adding content types
- **Trip section type:**
  - `SECTION_TYPES` in `apps/api/src/admin/trips.dto.ts`
  - `SectionType` in `apps/web/src/lib/types.ts`
  - renderer in `components/trip/TripSections.tsx`
  - editor meta and content editor in `src/admin/trip-editor/model.ts` + `SectionsEditor.tsx`
- **CMS page block:**
  - renderer case in `components/BlockRenderer.tsx`
  - field definition in `src/admin/page-editor/blocks.tsx` (`BLOCK_DEFS`)
- **Settings field:** type in `lib/types.ts` (`SiteSettings`/`HomeSettings`) and a field in `src/admin/pages/SettingsPage.tsx`.

## Don'ts
- Don't commit `apps/api/.env`, `*.db` or `uploads/*`.
- Don't hard-delete via raw SQL.
- Prisma deletes are guarded: continents with countries → 409, countries with trips → 409, media still in use → 409.
