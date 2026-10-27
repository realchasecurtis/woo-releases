# Mac and iPhone delivery path

Woo 0.2 supplement: the foundation SDK now has signed native-content manifests, ownership lifecycle/checkpoint rules and generation-specific site identities. macOS can reuse the Node/Electron modules subject to native testing. iPhone needs equivalent Swift cryptographic verification and lifecycle models plus a carefully tested WKWebView custom-scheme/data-store design. Do not assume Electron's custom-protocol origin/storage behavior transfers directly to WebKit. No Apple implementation or artifact was produced in this milestone.

Requested targets: Windows, Mac and iPhone. This milestone contains only an executable Windows x64 build. On the available Windows PC, `xcodebuild`, `xcrun`, `swift` and `clang` were not found on PATH. No macOS host, Apple SDK, signing identity, provisioning profile or physical iPhone test connection was available or configured. No Apple build was produced, tested, signed, uploaded or submitted. No credentials or toolchains were installed.

## Reusable foundation already implemented

- `src/policy.cjs`: canonical names, URL constraints, registry endpoint validation and address policy.
- `src/registry.cjs`: versioned JSON snapshot contract, ownership records, collision checks, read API and remote client validation. All logic is independent of Electron.
- `src/proxy.cjs`: public IPv4 CONNECT transport; desktop-specific networking code, separate from UI.
- `src/main.cjs` and `preload.cjs`: Electron desktop adapter and narrow local-shell bridge.
- `src/index.html`, `renderer.js`, `style.css`: desktop shell, portable to Electron on macOS.
- `test/core.test.cjs`: core conformance examples. iOS should run equivalent tests against the same snapshot fixtures/API contract, rather than embedding Node into web pages.

## macOS

On an authorized Mac with an appropriate Xcode toolchain, package the same source against a maintained Electron macOS arm64 runtime (and x64 if Intel Macs are required). Give the app a stable bundle identifier, icon, Info.plist metadata and separate macOS data location. Confirm the loopback CONNECT gateway and sandbox under macOS; test every security and navigation case again. Use standard Electron packaging tooling on that host; the Windows PowerShell build is not a Mac packager.

For transfer to other Macs, obtain the user's approved Apple distribution identity, sign with the hardened runtime and appropriate entitlements, notarize and staple, then produce a signed app ZIP or DMG. No certificate/account setup or upload is authorized by this roadmap. An unsigned app directory is not an equivalent completed distributable. See [Electron code signing](https://www.electronjs.org/docs/latest/tutorial/code-signing) and [Mac distribution guidance](https://www.electronjs.org/docs/latest/tutorial/mac-app-store-submission-guide).

## iPhone

Electron is not an iOS app framework. Build a real Swift/SwiftUI application using [WKWebView](https://developer.apple.com/documentation/webkit/wkwebview), with native address/navigation controls, actual-origin display, snapshot import through the Files picker, and a URLSession remote-registry client. Port the pure validation/record contract into Swift, keeping website content isolated from administration and native APIs. Keep WebKit certificate validation intact. No privileged script-message handlers should be accessible to websites. Deny unsupported popup/download/permission behavior explicitly.

Network containment needs a separate verified iOS implementation: a pre-navigation DNS check alone does **not** match the Windows gateway's connection-level protection against rebinding, and WKWebView subresource/redirect behavior must be tested. Choose an OS-supported proxy configuration/transport design for the actual minimum supported iOS version, validate it on simulator and device, and do not claim parity until tested. A website, PWA, custom URL scheme or WKURLSchemeHandler shim is not a substitute for this trust/network design.

In Xcode: create an iOS app target and bundle ID; implement the shell, model and native storage adapter; run snapshot conformance tests, browsing/isolation tests, and physical-device tests; archive and sign using approved provisioning. Deliver initially via a user-approved device build or [TestFlight](https://developer.apple.com/testflight/) and later the App Store if requested. [Apple distribution documentation](https://developer.apple.com/documentation/xcode/distributing-your-app-for-beta-testing-and-releases) describes the build/sign/distribution flow. TestFlight/App Store actions require later approval and access. No IPA is provided now.

## Beyond HTTPS aliases

All three clients can share the operator's naming data, but normal browsers still do not resolve Woo names. Removing public-domain destination dependencies requires decisions about routing, custom origins, content addressing or hosting, trust-key distribution, TLS or equivalent authenticated transport, cookies/storage/service-worker boundaries, revocation and cross-platform enforcement. That is a new network/security design, not a certificate-validation exception or a hidden origin rewrite.
