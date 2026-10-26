# 0.3.4 security scope update

Read docs/SECURITY-REPAIRS-0.3.4.md first. It supersedes earlier statements below about HTTP Host serving and memory-only trust pins. Local consistency guards are not authenticated global ownership, tamper-proof storage or protection from full-profile/code compromise. Publisher signing, full runtime patch assurance and independent hostile-renderer evaluation remain unresolved. No production-security certification is claimed.

# Security and readiness limits

0.3 repairs the audited timing/checkpoint/restoration defects and expands production-renderer tests; it is not independently audited or production-ready.

Unknown long time gaps, OS suspend and restart pause ownership. An explicit operator resume does not add missed time. Even when the configured available-time deadline is reached, a name stays owned in `release-pending`; releasing it requires a separate explicit matching operator decision. The application has no real-name release UI. The clock monitor is conservative, not a distributed failure detector.

Checkpoint writes are validated before atomic replacement. History compaction intentionally drops old detailed events while preserving a count, active metadata and generation state. Invalid/oversized writes preserve the prior file and pause ownership. Multi-writer transactions, crash-proof fsync guarantees and authenticity against a malicious local operator are not supplied.

After restart, Host serves only a previously signed, reverified cached snapshot; signing is unavailable. Temporary demo keys remain in memory and are never written to the disabled real-identity store. Public metadata, browser state and signed site caches are stored locally without application-level encryption. The loopback Host is not confidential against other local processes.

The native renderer verifies manifest/root/file hashes; owner/generation origins and identity-checked persistent sessions separate state. New generations revoke old windows and serving. Node/native bridges, external network requests, dangerous schemes, frames, workers, popups, downloads and permissions are denied. localStorage and IndexedDB are tested across real restarts and generation transitions. Native cookies are unsupported, not promised. Arbitrary web APIs and hostile-browser robustness are not comprehensively tested.

Declarative extensions do not execute code and cannot alter the identity chrome or ownership checks. Developer source forks/SDK programs run with ordinary developer privileges and must not be automatically executed from untrusted AI output. No plugin marketplace, updater or AI API exists.

No persistent owner-key generation, encrypted identity activation, public deployment, upload, relay, DNS/router/firewall/certificate trust change, signing credentials or Apple build occurred. Legacy HTTPS certificate validation and public-only routing restrictions remain in place.

## 0.4.0 additions
The supplied shared SVG artwork is used in settings/start surfaces and the derived executable/window icon. Bookmarks store only explicitly saved HTTPS URLs/titles locally and validate on load/write. Reserved-name policy is source-controlled and cannot be changed by page IPC. Existing profile conflicts are preserved, not reassigned. Creator onboarding generates temporary in-memory demo keys only; it is not enrollment into a public ownership registry. Documentation export copies a fixed allowlisted local bundle, never a profile directory. Custom window controls accept only three fixed actions from the trusted main frame. Stop preview revokes active native sessions and destroys their windows, preventing page beforeunload from defeating the stop action. These additions do not establish production security certification.

## 0.5.0 project and release boundaries
New creation is closed by default in signed ownership, alias API, setup and demo paths. Unpackaged development fixtures are explicit; packaged flags cannot enable them. The future network is not deployed. Normal public browsing remains enabled. Recent-project metadata is local and does not create lasting owner keys. Selecting a project restores its path/context; relinking changes metadata only after a native folder selection, without copying or overwriting content. Verified embedded tabs use the same owner/generation session and protocol checks as separate native windows. Stop revokes active sessions and disposes views; closed native tabs cannot be reused as ordinary web views. code.woo routes only to fixed allowlisted internal documentation, with custom profile overrides retained. Galaxy effects are local CSS and respect reduced motion. Source modification by the local OS user is outside the gate's security boundary; the gate prevents ordinary UI/IPC/API bypass, not deliberate forks.
