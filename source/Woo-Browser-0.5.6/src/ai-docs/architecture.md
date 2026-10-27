> RELEASE STATE 0.5.0: New domain/alias/site-identity creation is temporarily CLOSED in the packaged app. Creation examples below describe development fixtures or future approved operation, not actions an AI should enable. Normal public HTTPS browsing and explicit web search work. Existing recent projects and verified snapshots remain available; signing remains temporary.

# Architecture and directory layout

Woo is an MIT-licensed reference application built with Electron 45.0.0. The main process has ordinary OS-user authority. Trusted chrome runs from local application files with a narrow preload/IPC bridge. Untrusted HTTPS pages use WebContentsView with sandbox/contextIsolation, no Node and no preload. Native static snapshots use a custom secure scheme, isolated owner/generation origins and persistent origin-specific storage.

## Source map

- src/main.cjs: app lifecycle, settings, trusted-sender IPC, safe routing, optional update scheduling, menu/shortcut integration.
- src/browser-tabs.cjs: per-tab view/state/history, active visibility, safe navigation and shortcut dispatch.
- src/index.html, renderer.js, style.css: human chrome, wizard, internal discovery, documentation viewer and themes.
- src/preload.cjs: explicit allowed action names and state/focus callbacks. No generic execute/read-file API.
- src/foundation.cjs: selected local Host, guided creation, source-folder consent, publish/open/stop/start, guarded registry and temporary signing session.
- src/native-renderer.cjs: verified bundles to protocol responses, storage identity binding, CSP/permissions and generation revocation.
- src/registry.cjs: local operator-managed HTTPS aliases and metadata, atomic JSON persistence, snapshot transfer and optional read-only registry service.
- src/policy.cjs and proxy.cjs: URL/public IPv4 validation and the loopback CONNECT proxy used to constrain browsing.
- src/updates.cjs and update-trust.json: signed manifest verification, bounded transport, durable floor; empty production trust configuration.
- src/documentation.cjs, ai-docs/, ai-docs.zip: allowlisted local docs and export, not profile data.
- src/assets/: shared user logo SVG, W icon SVG/PNG/ICO and brand tokens.
- sdk/: reusable crypto, ownership, checkpoint guards, verified client, static bundle, onboarding validation and discovery/provider interfaces.
- examples/: static Workshop example, local lifecycle simulation and custom clients/providers.
- test/: unit tests and explicit packaged UI runners. Do not run against a live profile.
- tools/: reproducible build, asset rendering and local preview helper.
- docs/: implementation reports and detailed historical specifications. Current 0.5.0 README and this bundle supersede older behavior descriptions.

## Profile map

Default profile: %APPDATA%\Woo-Foundation-0.3, retained for compatibility. --data-dir can select another absolute path. registry.json stores local aliases. settings.json stores resolution endpoint, web provider, theme and Enter-search choice. ownership-public-v2.json stores public local ownership state. trust/checkpoint-floor.json and latest-checkpoint.json detect partial rollback and support explicit recovery. trust/site-pins.json and its marker preserve observed owner/generation/revision pins. host-config-v1.json records the selected content directory/name and preview state. verified-bundles/<root>.json stores signed static snapshots. sites/<name>/ holds generated starter source. site-data/<identity-hash>/ holds native localStorage/IndexedDB; normal web session data lives in Electron's browser session directories. A whole profile may contain sensitive user data even though signing keys are not saved.

## Data flow

Wizard input -> validate label/ending/title/consent -> native folder selection or starter creation -> validate bounded static bytes -> temporary key signs a bundle -> guarded ownership metadata commits -> explicit preview opens -> VerifiedSiteClient enforces identity/revision pins -> NativeRenderer serves only verified files. No HTTP bundle listener is involved. Stopping revokes active renderer entries; starting re-verifies the snapshot.

For an HTTPS alias: text -> canonical name -> local or explicitly configured remote read-only resolution -> destination policy/DNS validation -> pinned public-address proxy -> sandboxed web view. The real HTTPS origin remains visible. For discovery: a submitted query -> local metadata provider -> ranked text results -> the same navigation gate on selection. Web search is separate and explicit.

0.5.0 adds src/navigation-journal.cjs (API v1), a per-tab, session-only bounded history bridge for trusted internal surfaces and Chromium navigation indices. src/settings.cjs (API v1) owns conservative default migration. Neither accepts remote executable providers or remote history state. Public web queries default to Google on new profiles; saved ambiguous older provider choices are preserved.
