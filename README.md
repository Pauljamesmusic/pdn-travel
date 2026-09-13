# PDN Travel

Travel agency website and admin panel for **PDN Travel** (Peace Destination Nepal). It's a redesign of pdntravel.com, built from the Figma design system.

| Part | Stack |
| --- | --- |
| Website | React 19 · Vite 7 · TypeScript · Tailwind CSS v4 (Figma tokens) · React Router 7 |
| API + admin backend | NestJS 11 · Prisma 6 · SQLite (dev) / PostgreSQL (prod) · JWT httpOnly cookies · TOTP 2FA · sharp |

## Quick start

Requirements: **Node.js 20+** and npm 10+.

```bash
cd pdn-travel
cp apps/api/.env.example apps/api/.env   # then set JWT_SECRET and ADMIN_PASSWORD
npm run setup                            # install, create the database, seed demo content
npm run dev                              # API on :3000 + website on :5173
```

| URL | What |
| --- | --- |
| http://localhost:5173 | Public website |
| http://localhost:5173/admin | Admin panel |
| http://localhost:3000/api/health | API health check |

### Admin sign-in

`npm run db:seed` creates the first **Owner** account from `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `apps/api/.env`.

- Sign in at `/admin` and turn on two-factor sign-in under **Security**.
- Add more people under **Team & roles**:
  - **Owners** can do everything.
  - **Editors** manage content.

## Scripts (run from `pdn-travel/`)

| Script | Does |
| --- | --- |
| `npm run dev` | Runs the API (watch mode) and the website (Vite) together |
| `npm run setup` | `npm install`, then `db:setup` |
| `npm run db:setup` | Creates the SQLite schema and seeds demo content |
| `npm run db:reset` | Wipes the database and re-seeds it. **Deletes admin edits.** |
| `npm run typecheck` | Type-checks both apps |
| `npm run build` | Production builds (`apps/api/dist`, `apps/web/dist`) |

Also available: `npm run db:studio -w apps/api`, which opens Prisma Studio to browse the database.

## Project structure

```
pdn-travel/
├─ apps/api                      NestJS API
│  ├─ prisma/schema.prisma       Data model (continents, countries, activity tags, trips, sections, pages…)
│  ├─ prisma/seed/               Demo content (taxonomy, trips, pages, settings)
│  ├─ src/auth/                  Login, 2FA, password, sessions
│  ├─ src/public/                Read-only website endpoints + enquiries/newsletter
│  ├─ src/admin/                 Admin CRUD (all under /api/admin, guarded)
│  └─ uploads/                   Uploaded images (WebP), served at /uploads
└─ apps/web                      React website + admin panel
   ├─ public/brand, public/media Logos, solar-system video, posters
   ├─ src/styles/index.css       Figma design tokens (light + dark) mapped into Tailwind
   ├─ src/locales/               en (source), hi, ml, fr, ar (RTL), ne
   ├─ src/pages/                 Public pages
   ├─ src/components/            Nav, footer, search overlay, cards, trip sections, CMS blocks
   └─ src/admin/                 Admin panel (lazy-loaded at /admin)
```

## What the admin panel manages

- **Trips & itineraries**
  - Overview: title, country, summary, activity tags, publish and feature switches.
  - Photos: drag-and-drop upload, reordering, alt text, cover photo.
  - Day-by-day itinerary.
  - **Page sections**: add, remove, reorder and hide the Overview, Highlights, Itinerary, Included & excluded, Dates, FAQ, Bullet list, Text, Gallery and Notice sections.
  - Pricing and departure dates, and SEO.
- **Continents, countries & activity tags**: create, edit, reorder, feature and delete. Delete protections tell you what to move first.
- **Pages**: About PDN, Within the Law, Working Together, Terms and Conditions, PDN Appeal, PDN Events, Privacy Policy, plus any new page.
  - Pages are built from blocks: text, image + text, stats, cards, team, registrations, list, legal clauses, FAQ, quote, events, gallery and call to action.
  - A switch puts a page in the navbar **Support** menu.
- **Enquiries**: status workflow (new → contacted → quoted → booked/lost), internal notes, reply by email or WhatsApp, CSV export.
- **Media library**: uploads, alt text, where-used lookup, and safe delete (images still in use can't be deleted).
- **Testimonials** and **Site settings**: contact details, social links, and every headline on the home page.
- **Security & team**: password change, TOTP 2FA, sign out everywhere, roles, audit log.

## Security notes

- **Sessions:**
  - JWT in an `httpOnly`, `SameSite=Strict` cookie.
  - 8-hour sessions, or 7 days with "trust this device".
  - Server-side revocation: "sign out everywhere" and password changes end other sessions.
- **Sign-in protection:**
  - bcrypt (cost 12).
  - Account lockout after 5 failed attempts for 15 minutes, with timing-safe unknown-user handling.
  - Optional TOTP 2FA.
  - Rate limits on login, 2FA, enquiries and the newsletter.
- **Request protection:**
  - Every `/api/admin/*` route is protected by a global guard; editor and owner roles are enforced.
  - Origin check on write requests, Helmet headers, and strict DTO validation with unknown fields stripped.
  - A honeypot on the enquiry form.
- **Data safety:**
  - Uploads are re-encoded with sharp. This proves they are images and strips embedded metadata.
  - Only relative or `https://` image URLs are accepted.
  - CSV exports are protected against formula injection.
  - The admin panel is `noindex` and signs out after 30 minutes of inactivity.

### Before going live

1. Set a long random `JWT_SECRET` (`openssl rand -hex 48`) and a strong admin password.
2. Serve over HTTPS and set `COOKIE_SECURE=true`. Set `WEB_ORIGIN` to the real site origin.
3. Switch Prisma to PostgreSQL (`provider = "postgresql"` and `DATABASE_URL`), then run `prisma migrate`.
4. Serve `apps/web/dist` and proxy `/api` and `/uploads` to the API on the same origin.
5. Keep `apps/api/uploads/` on persistent storage and back it up with the database.

> **Render persistent disk:** `render.yaml` provisions a 1GB persistent disk mounted at `/data`, with `DATABASE_URL` and `UPLOADS_DIR` pointed at it — so the database and uploaded images now survive restarts and deploys instead of resetting to the last build. This needs a **paid** plan (`plan: starter`); Render's free web services can't attach a disk at all.
>
> If this service already exists in your Render dashboard from before this disk was added, pushing `render.yaml` alone may not upgrade it — Render sometimes needs it applied manually the first time: open the service in the dashboard, change its plan off Free, and add a disk (name `pdn-data`, mount path `/data`, 1GB) if one isn't already attached, then redeploy. After that, further `render.yaml` edits should sync automatically.

## Design system

- **Colours, type and radii** come from the Figma file as CSS variables in `apps/web/src/styles/index.css`.
  - Primitives: red, ink and green ramps.
  - Semantic tokens: `canvas`, `surface`, `fg`, `brand`, `accent`, `line`…
  - Light and dark values are switched by `data-theme` on `<html>`.
- **Fonts:** DM Serif Display for headings and Sora for body text, with Noto fallbacks for Devanagari, Malayalam and Arabic.
- **Themes:** the toggle in the navbar and footer offers light, dark and system. The hero and footer stay dark in both themes, as in the design.
- **Languages:** the footer selector offers English (default), हिन्दी, മലയാളം, Français, العربية and नेपाली.
  - Arabic switches the layout to right-to-left.
  - Admin-entered content (trip and page text) is shown as written.
