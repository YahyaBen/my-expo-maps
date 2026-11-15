# Application architecture

All build variants start at the full-screen Google Map through `/`. Its native
controls select street/satellite mode, center on the current location and open
`/settings`. The template, discovery, component demos and tab dock are removed.
Unknown URLs redirect to `/`.

Settings uses the existing native page composition and preference owners. Stack
transitions follow the current LTR/RTL direction and reduced-motion preference;
Back returns to the retained map with its camera and selected mode. The `index`
anchor supplies the map beneath a Settings deep link.

The map uses the configured Google provider on iOS and Android. It reuses
`useDeviceLocation` for foreground permission checks, app opt-outs, disabled
services and one-shot position requests. Camera centering waits for map readiness
and a visible, active page. The native location dot is disabled when hidden or
inactive. Native map availability is checked before evaluating its JavaScript
module, allowing older development builds to show a recovery message and Settings.

| Responsibility                          | Owner                                                                           |
| --------------------------------------- | ------------------------------------------------------------------------------- |
| Routes and native stack                 | `src/app/`                                                                      |
| Google Maps home and camera controls    | `src/features/map/`                                                             |
| App settings and native device controls | `src/features/settings/`                                                        |
| Shared native presentation              | `src/components/ui/`                                                            |
| Preferences, language and direction     | Existing contexts, hooks and storage owners                                     |
| Optional auth/form workflow kit         | `src/features/auth/`, `src/context/auth.context.tsx`, `src/guards/`             |
| Entity data access                      | `src/services/<entity>/<entity>.repository.ts`                                  |
| HTTP, queries and session lifecycle     | `src/services/`, `src/lib/api-query-keys.ts`                                    |
| Validation and DTOs                     | `src/validation/`, `src/types/`                                                 |
| Build-time identity                     | `config/brand.js`, `config/brands/`, `app.config.js`                            |
| Public brand/asset metadata             | `src/config/brand.ts`, `src/config/brand-assets.ts`, `config/brand-assets.json` |

## Startup

The root restores fonts, appearance, motion preferences, language and device
feature preferences. It waits for the initial usable page layout before completing
the configured minimal/branded launch. `app-ready` follows resource readiness,
layout and overlay exit. Readiness does not wait for an auth session, backend,
permission response or store-update check. Reduced motion and activity state
remain shared native capabilities. Native stack transitions use the existing
platform options.

After launch, the root checks notification permission on iOS and Android and checks
again after each background-to-active transition. Missing permission is requested
through the native system dialog whenever the OS allows another prompt. Granted
or blocked permission shows no prompt. No custom reminder or automatic settings
redirect is presented. Returning from a system dialog alone does not repeat the
request. Android creates the notification channel before requesting permission.
Android builds with push configured also set Expo's notification presentation
handler after launch without fetching a token. Settings reads a
selectable Expo push token while visible after notification permission is granted.
The app uses `expo-notifications` and Expo Push Service; Expo manages the native
transport and device-token mapping. Configured Android development and production
installs also join their Firebase project's `all-testing-maps` topic through Expo's
topic API after OS permission is granted, on launch/resume and during Settings
registration. The launch attempt waits for the
permission request to finish. No custom messaging service, receiver or
JavaScript background task is configured. Settings is a separate route;
the map does not import its screen or notification controls. Settings reads
permission state while visible, and requests
OS access or a one-shot location only after the matching action.

Optional auth/query/service helpers are retained for future features and are not
mounted by the starter. A consuming auth flow supplies its own verification
navigation callback. Add providers only when building an actual backend feature.
Shared UI receives data and callbacks, and never imports services or fixtures.

Feature workflows and query options call a feature-specific repository. The
repository exposes typed data operations through the existing HTTP client;
TanStack Query owns cache state and the auth lifecycle owns session state.
`authRepository` is the current implementation. Repository contracts are colocated
with their implementation; new entities add only their supported operations.
See [repository boundaries](api-services.md#repository-boundaries).

## Enforced import boundaries

`eslint.config.js` composes scoped policies with `restrictImports`; flat-config
rule replacement must preserve the shared restrictions.

- Routes/features consume the public `@components/ui` API and do not own raw HTTP,
  secure storage or query transport configuration.
- Services do not depend on feature presentation, UI components or UI contexts.
- Entity repositories do not own React rendering, navigation, cache policy or native storage.
- Schemas, DTOs, mappers and query keys remain pure.
- UI implementations import concrete siblings, avoiding their own public barrel.
- Auth refresh keeps its raw transport independent of authenticated interceptors and the auth repository.

Feature screens use public UI directly. Verify both native graphs
after entry/Metro changes to keep developer tooling out of releases.

## Brand and services

The Node brand resolver validates assets and native references; app modules read
only its public projection. Static asset registries keep Metro imports literal.
The root palette comes from the manifest; preview theme providers are isolated.
Language/device switches in Settings persist actual settings.

API helpers retain validated contracts, request cancellation, secure session
storage, generation guards, token rotation and cache maintenance. Backend URLs
are optional for the starter. Do not bypass those owners when adding real features.
See [API services](api-services.md), [auth kit](auth-forms.md),
[appearance](appearance-themes.md) and [brand setup](development.md#brand-and-environment-configuration).
