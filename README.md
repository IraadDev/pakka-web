# pakka-web

Next.js frontend for PAKKA. Installable PWA, shipped to Play Store via TWA.

## Run

```bash
cp .env.example .env.local
npm run dev      # :3000
npm run build
```

## Design system

`public/styles/*.css` are **copied verbatim** from the design-system project
(`../Design System shan`). 200 classes, 65 tokens, 5 width tiers.

**Do not edit them here.** Change the design-system project, then re-copy:

```bash
DS="../Design System shan"
cp "$DS"/{pinlink,fh-shell,mam-components,mam-categories}.css public/styles/
```

`components/ui/` are thin wrappers that apply those class names. They introduce
no styling of their own — if a style is missing, add it upstream.

## Layout

```
app/(public)/    home, browse, item, storefront, invite — SSG/SSR, indexable
app/(auth)/      login, onboarding, kyc
app/(app)/       sell, vault, deals, messages, earnings, settings
app/(admin)/     disputes, moderation
components/ui/   design-system wrappers
components/capture/  camera + signature (to build)
lib/api.ts       typed client; status→DS class maps
lib/offline.ts   IndexedDB queue for handover photos
```

## Rules

1. **The invite route `/d/[token]` must work with no install and no login.**
   It is the growth loop — test it on a low-end Android on mobile data.
2. **Public pages stay server-rendered.** They must be crawlable.
3. **Photo capture must work offline.** See `lib/offline.ts` — request persistent
   storage, upload per-photo not per-booking, handle `QuotaExceededError` loudly.
4. Money arrives as integer paise. Use `inr()` to display; never do float maths.
