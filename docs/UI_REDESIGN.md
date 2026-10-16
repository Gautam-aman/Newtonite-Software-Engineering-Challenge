# NewtonOps interface redesign

16 October 2026. This upgrade changes the React frontend and delivery checks. Backend code, migrations and the typed API contract are unchanged from `1e9a9db`.

## Audit and response

| Original weakness | Implemented response |
| --- | --- |
| Flat hierarchy and uniform visual weight | Graphite/indigo tokens, dark and light themes, semantic metric accents, stronger typography and deliberate spacing |
| Static navigation and abrupt changes | Shared active indicators, route entrances/exits, collapsible desktop sidebar and animated modal mobile drawer |
| Dense work lists and unclear next actions | Query-backed tabs, removable filter chips, date disclosure, phone cards and a visible workflow rail |
| Generic feedback during requests and conflicts | Stable-width pending buttons, inert stale rows during page fetches, conflict-specific refresh, actionable errors and confirmed-only success feedback |
| Inconsistent small-screen and keyboard behavior | Responsive forms/layouts, touch targets, focus restoration, route heading focus, search shortcuts, reduced-motion preferences and regression tests |

## Motion and truthful data

Motion uses the existing Motion library, shared timing tokens, transform/opacity and bounded staggering. The dashboard uses actual API counts and events. In particular, **Urgent & unassigned** retains the backend's queue definition; it is not mislabeled as the total critical-item count. Numbers initially render their real value and animate only when that value changes. Comments appear after server confirmation.

The inspection browser has OS Reduce Motion enabled. System mode honors it. An explicit workspace toggle allows full motion or reduced motion without changing OS settings. The full-motion demo selector was observed with an in-flight translate transform and then its settled transform, proving an animation actually ran. Preference tests cover the system-reduced and explicit override paths.

Desktop sidebar collapse, navigation, metric/queue entrances, filter/date disclosure, modal/drawer entrances and exits, request indicators and toast expiry use the shared visual vocabulary. Toast time pauses while hovered, focused or the document is hidden. Error feedback is distinct from successful mutation feedback.

## Accessibility and performance

Radix handles modal focus trapping, Escape and scroll locking. Explicit focus restoration supports independently mounted dialog triggers. Route changes focus the arriving heading; search/filter updates preserve the user's input focus. Labels, validation associations, pressed states, screen-reader values and visible focus styles remain available. This is tested functional accessibility, not a formal WCAG certification.

Routes and the form editor load on demand. The final local production entry is about **495 kB minified / 158 kB gzip**, down from roughly 648 kB before splitting; the editor is a separate ~122 kB chunk and individual routes are ~10–13 kB. A rendering boundary offers recovery if a route chunk cannot load. No blanket throughput or animation-frame-rate claim is made.

## Validation

- Frontend: 16 regression tests, strict TypeScript and Vite production build.
- Backend: 22 real PostgreSQL integration tests, no failures/errors/skips; formatting check passed.
- Responsive inspection uses the dev-only `frontend/qa/responsive.html` fixture. Its iframe has a real CSS viewport of 1440, 1024, 768 or 390 pixels, with visible document-width diagnostics. The display is scaled only when needed to fit the inspection window.
- Keyboard checks found and fixed focus restoration after drawer/editor dismissal and heading focus after drawer navigation. Responsive checks found and fixed desktop-margin interpolation across the mobile breakpoint and removed decorative hero overlap on phones.
- Login, dashboard, explorer, detail and create form were visually inspected at all four widths; the settled document width matched its viewport each time. The fixture scales the display but preserves the iframe CSS viewport. This is not a physical-device or cross-browser matrix.
- Final container, HTTP smoke, browser workflow and CI results are recorded in [VERIFICATION.md](VERIFICATION.md).

All milestones are real changes committed and pushed normally. The redesign exceeds the requested 50-commit minimum; no empty commits or history rewriting were used. Screenshots are captures of the running application, not generated mockups.
