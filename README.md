# Maps Carburant FR

iOS and Android app using Expo SDK 58, Expo Router and native Expo UI.
All builds retain the starter's Template page with a native dock and circular component menu. Tap its
center action to browse components: swiping shows the page name and tapping an
icon pushes its native example. Shared components and optional service/workflow
helpers remain available for future features.

Keep it simple. Native performance is a primary requirement: load only what the
active feature needs, preserve idle/motion guards and measure before optimizing.

## Clone and run

Use Node 22.18+, 24.3+ or 26+ and npm with the committed `package-lock.json`.

```sh
npm ci
npm start
```

Install a matching development build first; Expo Go does not contain all the native
modules. Browse examples through the Components tab and Home tab.
Demo artwork works offline. No backend or `.env.local` is needed.

```sh
npm run check              # Typecheck, lint and formatting
```

Keep `testID` props on components and interactive examples. This template has no
test runner or test suites.

Edit theme colors directly in [ux.ts](src/constants/themes/ux.ts), component color
roles in [tokens.ts](src/constants/themes/tokens.ts), spacing/radii in
[layout.ts](src/constants/layout.ts), and typography in
[design.ts](src/constants/themes/design.ts). See
[theme values](docs/appearance-themes.md#theme-values) for ownership and previewing.

## Build with EAS

The app's EAS owner, project UUID, native IDs and assets live in
[config/brands/template.json](config/brands/template.json). Verify its identity
matches the selected EAS project before building. A blank project ID is supported
only for local development. The internal brand selector remains `template`.

Production uses `com.hyrkul.mapscarburantfr`; development uses
`com.hyrkul.mapscarburantfr.dev`, and preview uses
`com.hyrkul.mapscarburantfr.preview` on both platforms. Existing themes, languages,
screens, navigation and artwork are retained.

```sh
npx eas-cli@latest login
npx eas-cli@latest build --platform android --profile development
# Install the development build, then:
npm start
```

Use `development` for Android devices/iOS Simulator, `development-device` for an
iOS device, `preview` for an internal release, and `production` for store binaries.
EAS still needs account access and platform signing credentials. No cloud build is
triggered by local setup.

Android push uses `expo-notifications` with variant-specific Google services files;
see [Expo push setup](docs/eas-development-builds.md#expo-push-notifications) for
credentials and testing. Remote iOS push setup is pending. A distinct store app
needs unique native identifiers, branding and matching platform credentials.
Identity changes live in the brand manifest; changing an EAS UUID cannot change
an app's native identity.

Animations, gestures, sheets, launch transitions and reduced-motion handling remain
available through the shared UI and app component pages. Check native push/Back,
themes, dark mode and RTL on both platforms. See [EAS setup](docs/eas-development-builds.md).

## Project guidance

- [Documentation index](docs/index.md) and [development](docs/development.md)
- [Architecture](docs/architecture.md) and [native UI](docs/ui.md)
- [Agent rules](AGENTS.md), [skill index](docs/skills.md) and [documentation ownership](docs/documentation.md)

Install SDK-compatible packages with `npx expo install <package>`. Installed
dependencies remain available for future features. Component contracts belong
in their matching `.agents/skills/` files; implementation belongs in source.
