> RELEASE STATE 0.5.0: New domain/alias/site-identity creation is temporarily CLOSED in the packaged app. Creation examples below describe development fixtures or future approved operation, not actions an AI should enable. Normal public HTTPS browsing and explicit web search work. Existing recent projects and verified snapshots remain available; signing remains temporary.

# Security and trust model

This is a local engineering prototype. It is not a hardened general-purpose production browser, a public naming authority, or a certified secure host. Use disposable/non-sensitive content until independent review, runtime patch assurance and release authentication are complete.

## Boundaries retained

Untrusted pages are sandboxed and context-isolated with Node disabled. HTTPS pages have no preload/native bridge. Main-process IPC validates its trusted sender. URL schemes are restricted; certificate errors are not ignored. Public-address checks and DNS pinning prevent the intended browser paths from reaching localhost/private networks through public registry data. Popups/downloads/site permissions remain restricted. Native snapshots use owner/generation-derived origins, no arbitrary filesystem protocol handler, strict CSP, no external network/forms/frames/workers/native APIs, verified file bytes and persistent per-origin storage.

Changing an ownership generation creates a different origin/storage identity and revokes old active generation serving. Same owner/generation revisions intentionally share storage. Native custom-scheme cookies are unsupported in current tests; localStorage/IndexedDB are supported. Normal browser tabs share same-origin session state as ordinary browsers do, and are not separate private profiles.

## Local authority versus ownership

The OS user controls local registry files. An alias owner label is not a cryptographic owner. Native operations use signatures, but the demo private key is memory-only. A local checkpoint and its public key are not an independently authenticated global registry. Guard floors and verification pins catch ordinary restart replay and partial file rollback; an attacker who can change all matching profile files or executable resources can defeat them. Do not describe a digest as authentication against same-user compromise.

Older unpinned profiles require explicit operator baseline adoption. Recovery restores only a copy matching the recorded floor, or stops. Do not erase guard/pin files to bypass a conflict. Keep coherent offline backups of content and approved trust state. An entire old profile restored with matching old floors is not detected. There is no real owner-key recovery service in this version.

## Hosting and files

No local HTTP bundle server is started. Verified bundles pass directly to the renderer. Stop preview closes/revokes renderer entries; it does not expose a listening public port. A separate restricted loopback CONNECT proxy is still used for browser networking; an explicit read-only registry-service mode exists for local demonstrations. Public relays/NAT traversal are not deployed. A chosen source folder may contain sensitive information; the user should select only material intended for the preview. Woo does not index file content for discovery and does not upload it, but signed snapshots persist locally in the profile.

The source walk rejects symlinks and unsupported entries. File-system reparse/race behavior and every browser-engine attack have not been exhaustively reviewed. Never broaden permissions or run a folder's package scripts automatically just because it contains a website.

## Updates and distribution

The updater validates pinned Ed25519 release manifests, expiry/product/platform/version/origin/size/hash, persists a release floor, disables idle HTTP connection reuse and requires a user save action. It does not execute/install artifacts. Its production trust configuration is empty. A new trusted publisher requires explicit local configuration and independent key verification; remote metadata cannot replace that key. Initial Windows artifacts remain unsigned and unpacked resources are mutable. Sidecar hashes alone do not authenticate a publisher against replacement of both archive and hash.

Runtime: pinned Electron 45.0.0. Source-level mitigations do not establish complete CVE clearance. Do not install an alpha or disable security controls just to change a version string. Independent security re-review and supported stable-runtime provenance/patch review are needed before broader deployment.

## Secrets and AI

Never paste private keys, passphrases, API tokens, cookies or profile contents into AI documentation. The docs bundle contains no user data. AI-generated code belongs in a reviewed source fork or supported declarative interface, not an automatically privileged plugin. A modified client cannot legitimately change shared ownership rules for other users. Persistent owner/publisher identities, paid infrastructure and public networking require specific approval and a recovery/storage plan.

0.5.0: src/browser-tabs.cjs keeps t.committed separate from t.pending and state.pendingURL. Pending targets never authorize or identify the visible document. Pending transitions hide the old view; main-frame commit must match WebContents URL before publishing identity. Error/cancel handling must not restore a requested target as actual origin. Keep these invariants in future provider/history extensions.
