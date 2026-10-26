> RELEASE STATE 0.5.0: New domain/alias/site-identity creation is temporarily CLOSED in the packaged app. Creation examples below describe development fixtures or future approved operation, not actions an AI should enable. Normal public HTTPS browsing and explicit web search work. Existing recent projects and verified snapshots remain available; signing remains temporary.

# Commands and reproducible work

Paths below are relative to a source checkout. Use Windows PowerShell and Node >=22. There are no npm application dependencies; Electron is a pinned downloaded runtime rather than a package installed into each user's PC. Read THIRD-PARTY-NOTICES.md for official runtime and resource-editor download sources/hashes.

## Build

    .\tools\build.ps1 -Output '.\staging\Woo-0.5.0-Windows-x64'

Use a new output directory. The script verifies pinned Electron/rcedit hashes, extracts the runtime, sets Woo product/version metadata and the shared icon, then copies source/runtime notices. The output remains unsigned. Do not publish it as a signed or production-security release. Rendering the source SVG icon is reproducible with tools/render-brand.cjs under the pinned official Electron runtime; tools/make-icon.py creates the multi-resolution ICO using Pillow. Original shared SVG paths/hashes are recorded in the brand provenance file.

## Local checks

    node --test --test-concurrency=1 test/core.test.cjs test/foundation.test.cjs test/repairs.test.cjs test/branding.test.cjs test/updates-search.test.cjs test/web-search.test.cjs test/hardening.test.cjs test/onboarding.test.cjs
    node examples/custom-client.cjs
    node examples/custom-providers.cjs

Use packaged UI runners with a fresh absolute test profile:

    Woo.exe --onboarding-test --data-dir=<fresh test directory>
    Woo.exe --redesign-test --data-dir=<another fresh test directory>
    Woo.exe --self-test --data-dir=<another fresh test directory>
    Woo.exe --foundation-test --data-dir=<fresh native test directory>
    Woo.exe --foundation-test --foundation-test-stage=read --data-dir=<same native test directory>

Do not paste literal angle-bracket placeholders into a real command. Run background launches with hidden windows where appropriate in automated workflows. Tests create fixture metadata/content and memory-only signing keys; they are not safe to run against a live user profile. Inspect generated JSON results and errors; launch alone is not evidence of success.

## Run a user copy

Extract the full Windows ZIP, not just Woo.exe. Keep LICENSE, LICENSES.chromium.html and application resources alongside it. Run Woo.exe. A custom --data-dir chooses a separate profile; it is not a permission bypass. Do not overwrite the running Desktop copy or user content while testing. Existing default profile remains Woo-Foundation-0.3. Starting a local preview does not change OS defaults, DNS or firewall settings.

## Registry service example

    Woo.exe --serve-registry --port=47831 --data-dir=<separate local registry profile>

This is an explicit loopback read-only alias registry demonstration. It is not public deployment or an authenticated remote ownership service. Do not port-forward it. A configured public read-only endpoint needs proper operator/authenticity/reachability design outside this prototype.

## Source exports and docs

The application documentation bundle is fixed product reference under src/ai-docs and src/ai-docs.zip. It excludes test profiles, downloaded runtimes, browsing data, private content and secrets. A source archive should likewise exclude user profiles and scratch tooling. Save checksums alongside deliverables, while recognizing that unsigned sidecars do not authenticate a publisher by themselves.
