# Woo 0.5.7-alpha — Windows experimental release

Woo is an open-source browser and application-level naming prototype. Ordinary public HTTPS browsing and Google web search are available. Woo names do not enter public DNS. This release is an experimental alpha, not production-security certification.

## Install and use

Use the per-user Windows x64 Setup.exe. It provides a Start menu shortcut and optional desktop shortcut. The portable ZIP is optional: extract the entire folder before opening Woo.exe. Close Woo before upgrading and back up its profile while closed. Do not overwrite a running copy or assume older releases understand newer profile metadata. The installer is unsigned; no security-warning bypass is recommended. There is no Mac build in this release.

Type `welcome.woo` and press Enter. A fresh client fetches the operator-curated shared HTTPS catalogue and loads the remotely hosted Hello world text. Woo shows the actual HTTPS address and origin. This is a small shared catalogue, not a crawler, public DNS registration, signed ownership network or independent peer hosting. Arbitrary domain creation remains closed.

## What changed and what was verified

- Minimal centered-logo/search homepage, documentation button and shared-catalogue lookup.
- Tab/window transfer, bookmark folders and webpage link context-menu source are integrated. Physical dragging and native menu interaction remain manually unverified.
- Page-requested new windows require confirmation. POST replay, blank-window/opener flows and full mainstream-browser popup compatibility are not supported. Repeated popups are suppressed per document; stale actions are invalidated on navigation.
- Download history UI and guarded implementation exist, but browser downloads and Save Link As are **unavailable in this release**. Both download release gates are false pending real native Save/Cancel and Windows safety-marking verification. No automatic file opening or installation.
- Fixed graceful shutdown after window destruction and installed alpha-version handling in the authenticated update checker. Signed remote manifests still require stable versions and valid signatures. No trusted automatic-update source is configured; use the explicit manual download link.
- 216 source regression tests passed without failures/skips. Packaged fresh-profile address-input/Enter, live welcome.woo content and origin, sandbox preferences, light/dark settings and natural exit code 0 were verified.
- Installer owner verified per-user install/uninstall, all 253 payload hashes, Start menu registration and synthetic untracked-file preservation. Broader upgrades, other machines/Windows versions, optional desktop shortcut and signed reputation testing remain unverified. Existing personal profiles were not inspected.

Native supervised tests were not completed because user interaction was unavailable. This is a coverage gap, not a failed download test. No Mac, public native hosting, durable ownership keys or active peer-node capability is claimed.

## Build and test from source

The application uses Electron 45.0.0 with no npm application dependencies. Install/use a compatible Node runtime (package.json requires Node >=22; tests here used Node24.19). Run `npm test`. Electron GUI checks need an explicitly disposable profile and their documented test flags; many historical GUI harnesses are not part of the 216 unit/integration assertions.

For the Windows build, fetch the exact official Electron and rcedit assets listed in `build-tools.lock.json` into `downloads/` with the filenames expected by `tools/build.ps1`. Verify their pinned hashes. Run `powershell -File tools/build.ps1` into a fresh output directory. This creates a portable app; it does not sign it. Do not enable acceptance or download-release gates without platform validation. Existing SVG/PNG/ICO assets are included; optional artwork regeneration tools may have additional prerequisites.

`src/` is the application; `sdk/` contains reusable modules; `test/` contains synthetic tests and explicitly opted-in GUI harnesses; `examples/` provides fixtures; `tools/` contains build helpers; `docs/` and `src/ai-docs/` document contracts and limitations; `network/` contains the public demonstration catalogue payload. No runtime, private profiles, acceptance logs, credentials, node_modules or Git history are included in the source ZIP. Test fixture generation does not grant production identities or access.

The framework is modifiable under MIT. Changing a local fork does not grant shared-registry ownership or permission to access other users' data. Electron and bundled third-party licenses remain applicable; see LICENSE, THIRD-PARTY-NOTICES.md and shipped runtime notices. Security and platform limitations are in SECURITY.md and docs/.

## Optional Windows installer build

The reviewed Inno Setup recipe is in packaging/. A compatible, verified Inno Setup 7.1.0 compiler is required separately; it is not bundled. Prepare a frozen portable payload with test harnesses removed, preserve all runtime license notices, then call packaging/Build-Setup.ps1 with PayloadDir, ReleaseVersion 0.5.7-alpha, NumericVersion 0.5.7.0, a fresh OutputDir and explicit CompilerPath. ValidateOnly checks the payload without compiling or installing. This creates an unsigned per-user installer; it does not provision signing or change application download gates.
