# BELORELLA Frontend Audit

**Audit date:** 2026-10-09  
**Workspace:** `NextFrontend-Ecommerce`  
**Status:** Full static source checks and production build passed. Browser and live-service acceptance remains open.

This report covers the customer storefront and admin dashboard. It complements [the website-wide audit](../BackEnd-Ecommerce/AUDIT_REPORT.md). Existing features and files were preserved during this audit pass; the existing worktree changes from earlier requests were left in place.

## Coverage

- Counted **282 JavaScript/JSX/TypeScript source files** under `app/` and `src/`, plus **70 page and API route files**.
- Ran lint across all app and source files, including React hook dependency checks and a separate undefined-name scan.
- Built all customer, admin, and API routes with Next.js production build.
- Reviewed the high-risk shared paths: auth and Redux hydration, cart and checkout, customer orders, product region/variant selection, admin order/inventory/POS entry, chat sockets/presence/notifications, SEO metadata, and print/email callers.
- Source inspection does not confirm real email delivery, payment provider behavior, database state, or browser/device rendering.

## Fixes verified in this pass

- Fixed the customer-orders recursive fetch path by dispatching the imported orders thunk explicitly. The fetch error no longer emits on Socket.IO's reserved `error` event.
- Fixed a real undefined `orderItem` reference in admin order inventory removal. The inventory removal request still proceeds if the local order snapshot is missing; the socket event is sent only when the related order line is available.
- Resolved the React hook dependency warnings across the app, including stale callback/listener closures in chat, order loading, POS, and admin data screens.
- Kept non-persistent browser notifications free of unsupported `actions` options.
- Fixed the not-found page's internal navigation to use Next's client-side link component.
- Verified the prior region/variant, cart, print, and email UI changes still compile across customer and admin routes.

## Verification

| Check | Result |
|---|---|
| `npm run lint` | Passed: 0 errors, 0 hook-dependency warnings, 80 `<img>` optimization warnings. |
| ESLint `no-undef` scan over `app/` and `src/` | Passed: 0 undefined-name errors. |
| `npm run build` | Passed on Next.js 15.5.27; all listed routes compiled and generated. |
| `git diff --check` | Passed; Git only reported existing CRLF normalization notices. |

The 80 `<img>` messages are optimization warnings, not runtime errors. I left the current image rendering in place to preserve dynamic and remote image behavior; migrating these safely needs visual checks for the existing host configuration and layout.

## Findings still open

| Priority | Area | Finding | Follow-up |
|---|---|---|---|
| High | Production dependencies | The current dependency audit reports 11 findings across the full graph (8 high, 3 moderate); the production graph reports 2 (1 high, 1 moderate). npm's suggested fix requires a Next.js 16 major upgrade. | Plan the major upgrade separately and validate all existing plugins/routes before applying it. |
| High | Rich HTML | Help/blog content and some product descriptions are rendered as HTML without a frontend sanitizer. This remains a stored-XSS risk if untrusted or compromised admin content is saved. | Add an HTML allowlist at the backend write boundary and sanitize legacy content on render, preserving the editor's supported formatting. |
| Medium | Image performance | The 80 raw image warnings remain. | Migrate with a remote-host allowlist and route-by-route visual/performance checks. |
| Medium | Product option edge cases | Main storefront detail, product edit, and create-order modal handle canonical `options[]`; inventory and order-edit screens still depend on legacy size/price arrays in some selectors. The backend currently mirrors options into compatibility arrays for normal product writes, but an options-only database record needs an end-to-end check. | Verify an options-only fixture through inventory create/quick scan and order edit, and align any remaining selectors and API semantics. |
| Medium | Live acceptance | No signed-in browser/device run against staging was performed. Chat presence, coupon persistence, payments, checkout rules, barcode scans, PDF layout, and email attachments need live-service verification. | Exercise customer and admin desktop/mobile flows using staging services and test accounts. |

## Limits

Static lint and compilation catch syntax, hook dependency, unresolved-name, and route-build problems; they cannot establish that every page is glitch-free in a live browser. No production order, payment, socket session, or email was submitted during this pass. No files were removed in this pass.
