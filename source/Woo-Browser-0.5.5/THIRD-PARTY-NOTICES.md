# Dependency and license notices

Build-only tool: Electron rcedit v2.0.0, MIT license in docs/RCEDIT-LICENSE.txt. Download: https://github.com/electron/rcedit/releases/download/v2.0.0/rcedit-x64.exe (save as downloads/rcedit-x64-v2.0.0.exe). Locally recorded SHA-256: 3e7801db1a5edbec91b49a24a094aad776cb4515488ea5a4ca2289c400eade2a. The upstream asset API did not provide a separate digest; this pin records the downloaded official HTTPS asset, not independent publisher checksum verification. The tool is not required by end users. The supplied Woo icon is embedded in the executable and shown by application windows.

Woo application source is MIT licensed; see LICENSE. It has no third-party npm application dependencies. It uses built-in Electron and Node APIs.

The portable package includes the official Electron 45.0.0 Windows x64 distribution (Chromium 156.0.8078.48; Node 24.22.0, verified against runtime test output). Electron is MIT licensed and includes separately licensed Chromium, Node, V8, codecs and other components. The original runtime `LICENSE` and `LICENSES.chromium.html` must travel with the executable; the Woo license is distributed as `WOO-LICENSE.txt` in the binary package to preserve the runtime LICENSE. Refer to the complete shipped notices for all included components and licenses.

Official sources and security guidance:
- https://github.com/electron/electron/releases/tag/v45.0.0
- https://releases.electronjs.org/
- https://www.electronjs.org/docs/latest/tutorial/security
- https://www.electronjs.org/docs/latest/api/web-contents-view
- https://www.electronjs.org/docs/latest/api/session

Downloaded runtime SHA-256: `ae53887a23bb640369c93dbd38c408a2af5c0deb86f2fa76c6c244cb444b7f47`.

No third-party artwork or fonts are embedded. The UI uses Windows system fonts and text symbols. Seeded websites are independent third-party destinations, not bundled content, endorsements or ownership claims.

## Woo 0.4.0 visual assets
src/assets/woo-logo.svg, woo-icon.svg and brand-tokens.json are copied from the shared Woo website asset output supplied for this task. The SVG paths are a manual contour reconstruction of the user's reference, not a font dependency. woo-icon.png was rasterized by the pinned Electron runtime; woo.ico was derived with Pillow. Shared asset hashes and PE resource verification are in docs. Existing Electron/Chromium and third-party licenses remain required and bundled. No code-signing certificate is present.

Experimental source checkpoint includes unchanged MIT-licensed subsets of Woo node foundation 0.1.4 and Woo agent foundation 0.1.1. Their license texts and per-file hashes are under src/experimental/vendor. These subsets are wired into the optional, off-by-default Experimental Foundations panel for bounded metadata inspection/import and synthetic agent acceptance only. No peer listeners, network service, accounting, MCP transport or live tab/project agent sharing is activated. They are Browser dependencies, not the separate Hosting or client-app projects.

