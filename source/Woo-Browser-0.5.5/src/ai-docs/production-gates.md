# Production gates — Woo 0.5.0

Status: engineering preview, NOT production-ready. Native domain creation is CLOSED by default. Public HTTPS browsing and explicit general web search remain enabled. Independent review of the stable source and exact release hashes is required before public distribution.

## Evidence already available

- Default closure in OwnershipRegistry, alias Registry and Foundation, with IPC tests; packaged build cannot enable development fixtures by flag. Existing profiles are not deleted.
- Sandboxed/context-isolated untrusted pages; narrow trusted-frame IPC; no Node bridge; denied permissions/downloads/popups; TLS validation and public-address checks.
- Verified static content, durable owner/generation/revision pins and guarded checkpoint recovery; outage time does not cause forfeiture. Same-user full-profile/code compromise remains outside this model.
- Recents persistence, path recovery, separate project files, native preview tab isolation, secret-free fixed documentation export, local bookmarks and no history collector.
- Authenticated updater verifier and rollback floor exist. Production endpoint/trust root are intentionally absent. No auto-install or trust-root replacement.
- Pinned runtime/resource-editor hashes, included licenses and component inventory. The inventory is not a complete transitive vulnerability clearance.

## Required engineering and independent acceptance gates

1. Review source plus packaged bytes independently: renderer escape paths, custom protocol, native tab lifecycle, IPC sender checks, proxy/DNS rebinding, import bounds, project paths, update trust and creation closure. Fuzz malformed signed records, bundles, snapshots and URL parsers. Threat-model operator compromise and dishonest nodes. Gate: no unresolved critical/high release finding; documented lower-risk exceptions approved.
2. Test on a separate clean Windows machine/account, not only this development PC: extraction, launch, resize/scaling, screen readers, offline failures, proxy/VPN environments, low disk, locked files, crash/power-loss checkpoints, backup/restore and upgrade/downgrade. Gate: recover existing projects/bookmarks without hidden data loss. Source fixture tests are not independent-device evidence.
3. Complete dependency/SBOM and license verification for the precise Electron/Chromium/Node binaries and resources. Monitor official security advisories and release cadence. Rebuild on an approved patched runtime and rerun regression/security tests. Gate: reviewed advisory disposition and reproducible artifact provenance; no claim current runtime is vulnerability-free.
4. Establish release signing and authenticated update operation: publisher identity, protected signing storage, offline backup/recovery, key rotation/revocation, expiring manifests, staged rollouts and downgrade policy. Gate: independent tamper/replay tests against a real configured distribution path. No credentials or certificates created yet.
5. Define private/public hosting and distribution policy, privacy notice and download-integrity experience. No telemetry is implemented; adding crash reporting requires explicit privacy decisions and consent. Public websites receive normal network metadata on navigation. Gate: documented data flows and permissions, accessible support/error guidance and reviewed public download instructions.
6. Harden owner identity before reopening claims: approved key lifecycle, recovery, signing authorization, operator-vs-owner semantics, anti-squatting policy and adversarial claim tests. Do not reuse demo keys or labels as ownership. Gate: approved design and independent verification, not merely a successful local preview.
7. Integrate the separately developed node adapter only after contract review. Require independently operated nodes, authenticated snapshots, conflict/rollback handling, quorum/availability policy, node loss and partition recovery tests. Gate: real multi-device/network evidence, not only a process simulation. No shared registry or distributed consensus is claimed here.
8. macOS/iPhone require their own maintained platform architecture, toolchains, signing/provisioning and on-device verification. No Apple binaries exist. Avoid claiming a webpage is a native iPhone app.

## Approval dependencies (not performed)

- Choosing and obtaining Windows publisher signing credentials/certificate and deciding protected storage/backups.
- Creating lasting owner/recovery keys, with explicit scope and storage/recovery approval.
- Configuring a real authenticated release/update endpoint and any public download hosting, storage cost or billing.
- Public deployment, DNS/router/firewall/certificate-trust changes or relay/network exposure.
- Apple signing/provisioning or installation of additional system toolchains.

Continue source hardening and tests without these approvals. Do not generate credentials as a convenience. Existing source forks remain allowed; a fork cannot rewrite shared ownership for other operators.

## Rollout and rollback plan

Keep 0.4.0 and earlier archives intact. Back up a closed profile as a complete unit, including trust files and native site storage; never combine mismatched checkpoints/pins. Install the new portable folder alongside the old one. Verify a copy of the profile first. A full attacker-controlled profile rollback is not detected reliably; backups require operator trust. No automatic migration deletes user records. Recents catalog failure must be surfaced rather than reset silently. A future release should offer transactional, tested UI backup/restore before broad public adoption; that UI is not implemented in this revision.

## Independent node work status
The separate task-5 node foundation is experimental and undergoing its own review. Its builder has reported loopback tests only. No code or listener from that project is integrated in this browser release. Adapter integration awaits reviewed contracts and separate multi-device/network acceptance evidence.
