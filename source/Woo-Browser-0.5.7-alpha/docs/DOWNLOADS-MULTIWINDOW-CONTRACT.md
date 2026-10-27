# Download controller integration boundary

Source: src/downloads.cjs. Keep exactly one controller and one will-download listener per shared browsing session, owned by the application lifecycle. Do not construct a new controller on tear-off or reattachment. DownloadItem remains associated with its original webContents; moving the existing WebContentsView must not restart it or replay a URL.

The injected owns(webContents) predicate must consult the current trusted tab-owner registry, exclude closed/detached/native/privileged views, and determine whether this source is eligible. Controller additionally requires the exact main frame, matching initiating HTTPS origin, user gesture, destination-chain validation, limits and platform activation. Ownership transfer alone grants no download permission.

Each trusted Downloads UI must be bound to its BrowserWindow, main frame and exact downloads.html URL. Its allowlist is state/downloads-close/downloads-clear/download-cancel only. Main chrome can open its own Downloads UI. Window closing closes that UI; it must not cancel unrelated windows' downloads. Application shutdown calls shared controller.close once. Renderer never chooses owner IDs, filesystem destinations or URLs via download IPC.

State broadcast: {theme,downloads:controller.snapshot(),downloadStatus:controller.status()}. Snapshot exposes IDs, sanitized filenames, timestamps, received/total bytes and state only. Clear is application-wide finished-history removal, not file deletion. Cancel takes an opaque existing download ID; source window/tab movement must not invalidate a valid active ID. Review whether all trusted chrome windows may cancel shared downloads; default is yes within the same local profile, never remote page content.

Current main.cjs wiring is SINGLE-WINDOW scaffolding and must be replaced by the window worker's owner registry. Do not present this document as implemented multiwindow behavior. Controller platformApproved remains false pending safety review and native marking tests. The worker must not turn that gate on as part of window integration.

Required merge tests: start from window A, move tab to B with identical webContents, progress remains one item; close A leaves transfer intact; B cancellation works; forged source/frame rejected after move; close application cancels all; popup state and theme update to correct owner; no duplicate listeners/history writes after repeated detach/reattach.
