> RELEASE STATE 0.5.0: New domain/alias/site-identity creation is temporarily CLOSED in the packaged app. Creation examples below describe development fixtures or future approved operation, not actions an AI should enable. Normal public HTTPS browsing and explicit web search work. Existing recent projects and verified snapshots remain available; signing remains temporary.

# Contracts and schemas

Versions are independent: product 0.5.0; Foundation SDK API 3; guided onboarding API 1; discovery API 1; signed bundle/envelope format 1; checkpoint format 2; registry snapshot format 1. Schema samples are examples, not live endpoints or keys. Validate at runtime; documentation is not a substitute for the implementation's bounds.

## Guided creation

sdk/onboarding.cjs exposes siteName(label, ending) and validateDraft(draft). Draft fields: label (short ASCII site label), ending (explicit single ASCII ending), title (1–120 plain-text characters), source (starter or folder), acknowledgeLocalOnly (must be true). createFoundation.createSite(draft) accepts no arbitrary filesystem path from the renderer. Folder mode requires a prior selectFolder native dialog capability held in main-process memory. A canceled selection does not grant a path. cancelSetup clears that pending selection; it cannot cancel a commit already executing. UI disables repeated creation and cancellation while committing. Duplicate names are rejected locally.

Successful createSite returns name, title, contentDirectory, localOnly:true, temporaryIdentity:true, publiclyReachable:false and an optional warning if setup preferences could not be saved after the snapshot commit. It does not return a private key. A result is not public publication. open(name) verifies the saved snapshot; start opens selected; stop closes/revokes local preview windows but retains data. refresh requires the in-memory signing key. Error messages identify missing content, name conflicts, trust recovery or unavailable signing.

## Registry snapshot v1

    {"version":1,"records":[{"name":"studio.bunker","destination":"https://example.com/","owner":"local-operator","note":"Example only","title":"Studio","description":"Local metadata example","aliases":["workshop"]}]}

At most 2,000 records and 1 MiB import size. Names canonicalize to validated lowercase dotted ASCII; internationalized labels are not supported. Destination: public HTTPS hostname, port 443, no embedded credentials, raw IP, unsafe scheme or private-address result. Owner is an administrative label, not cryptographic identity. Optional title <=160 characters, description/note <=500, aliases <=12 of <=80 characters. Controls are rejected. Duplicate/colliding imports fail as a whole; explicit replace is a separate local operator action. Registry aliases and native ownership records are different stores; the wizard refuses an already-used local alias name.

## Ownership and signed bundles

Ownership operations claim/confirm/checkin/update carry registry challenge time, canonical name, public key, generation and sequence. Ed25519 signatures, fingerprint, expected sequence/generation and policy constraints are checked. Inactivity is maintained only over observed time; unknown sleep/stall/restart pauses it. Release becomes pending and requires explicit operator confirmation. Do not forfeit real names in a test.

A signed bundle contains manifest:{payload,signature} and files keyed by safe absolute-looking logical paths such as /index.html. Manifest payload includes version:1, name, owner fingerprint, generation, revision and entries mapping paths to MIME/hash. Files contain MIME, SHA-256 and base64 bytes. The signed manifest root is pinned in ownership metadata. Verification checks signature, identity, root, revision, paths, MIME, count and total bytes before rendering. Source limits: 64 files, 4 MiB total, 1 MiB per source file, supported extensions html/css/js/json/txt/png/jpg/svg, restricted path grammar and no symlinks. Nested folders are allowed within these limits. No server-side scripts are executed.

## Checkpoint and pins

GuardedCheckpoint wraps checkpoint v2. It compares a separate digest/time/owner/generation/sequence/revision/root/status floor with the live ledger and recovery copy. Commit order is recovery copy, guard, live ledger; a partial write may block until explicit recovery. Site pins and updater floor have separate consistency markers. These are local anti-rollback consistency mechanisms, not protected hardware monotonic counters or public registry signatures. Full coherent profile rollback is outside protection.

## Trusted UI bridge

window.woo exposes action(name,payload), onState(callback) and onFocus(callback) only to trusted chrome. Main validates the exact window/main frame/file URL. Action categories include browsing/tabs; local discovery/settings; explicit registry mutation/export/import; creator setup and preview controls; trust recovery; declared extension consent; update check/manual save; docs read/copy/save. There is no raw process launch, arbitrary file-read, private-key export or generic script-execution action. Check src/preload.cjs for the current complete allowlist. Untrusted page content receives no bridge.

## Docs API

manifest.json lists known document IDs/files/titles and SHA-256 values. src/documentation.cjs list/read/combined only loads allowlisted plain Markdown/JSON chapters with bounds. The renderer displays textContent in a preformatted viewer. docs-copy copies the fixed bundle; docs-download uses a native save dialog and copies the bundled ZIP. Neither accepts a source filesystem path from page input.

## Reserved namespace policy v1
`map.woo`, `translate.woo`, `weather.woo`, and `code.woo` are reserved by sdk/namespace.cjs in this distribution. Defaults: map.woo → https://www.openstreetmap.org/; translate.woo → https://translate.google.com/; weather.woo → https://www.weather.gov/; code.woo → bundled internal AI setup guide. Navigation occurs only on user action. New signed claims, new aliases and snapshot imports reject these names. Existing profile records are preserved and flagged for operator review; their existing navigation continues without reassignment. This is not a public DNS or globally distributed reservation. Deliberate source forks/operators can replace the policy; untrusted pages cannot change it. `learn.woo` remains the Wikipedia shortcut. No migration deletes user entries.

community.woo is a reserved built-in HTTPS alias to https://x.com/. Existing saved overrides are preserved. It is not a globally registered domain or native-hosted community.
