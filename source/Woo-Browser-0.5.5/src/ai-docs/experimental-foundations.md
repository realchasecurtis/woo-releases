# Experimental foundations, API 1 — Woo 0.5.0

Off by default. Settings > Advanced: experimental foundations opens a separate trusted panel. Opening does not initialize node/agent modules. Enable lasts only while the panel/app remains open; closing or disabling revokes transient agent grants and clears retained memory. Restart is off. No settings, imported bundles or grants are saved. Normal public browsing is independent; domain claims remain closed.

| Capability | Actual state |
|---|---|
| Node 0.1.4 signature/root verification and metadata search | Explicit local import only, memory cache |
| Help/serve peers, remote discovery, delivery accounting | Unavailable; no new listener or network transport |
| Node content rendering | Unavailable; imported HTML/SVG is never executed |
| Agent 0.1.1 docs/categories | Packaged resources through read-only core |
| Agent page inspection | Fixed synthetic test page only, no real tab/project sharing |
| Claims, signing, authoring, publishing | Unavailable |

Import contract: UTF-8 JSON exact keys `version`, `record`, `bundleBase64`; version is 1. `record` is the unchanged node signed-record-v1 schema and `bundleBase64` is canonical base64 of woo-bundle-v1 bytes. See `src/experimental/vendor/node/src/protocol.mjs`. Limit: 1,500,000 envelope bytes, 1 MiB bundle, 32 files/256 KiB each; cache 4 MiB and 16 admitted records, pinned so imports never silently evict. File picker is main-owned; renderer paths/raw records are not accepted over IPC. Private descriptors, malformed signatures, tampering, stale/conflicting revisions and quota overflow reject. Same labels may represent different site IDs; rows disclose siteId/root/revision and unknown owner status. Signatures do not prove exclusive names, safe content or global freshness. Trust is session-only: closing resets high-water evidence; this cannot be used as a persistent trust service.

Adapter `src/experimental/adapter.cjs`: enable(boolean), status(), importBytes(Buffer), search(query<=256), agent(help|categories|fixture), close(). This is trusted host API, not a public extension API. Renderer gets only fixed experiment actions from a dedicated preload; main verifies exact window, main frame and file URL. No grant token, generic core execute, path, SQL, peer or transport is exposed. Imports show bounded structured text via textContent. Existing browser safety proxy is unchanged; 'no listeners' means no additional experiment listener, not zero sockets in the whole browser.

Node protocol/store and agent core/schema/categories are unchanged reviewed copies; hashes and MIT notices are in vendor. No transport/persistence/contribution/MCP/stdio modules are copied. Protocol still contains upstream fixture signing helper exports for byte identity, but production adapter never invokes them or exposes them. Test fixtures generate ephemeral keys only in process; output contains only public signed records. No persistent private key is generated.

AI instructions: distinguish this local memory experiment from a distributed network or a live agent browser. Do not infer consent from an enabled category or client label. Do not import arbitrary folders, scan browsing history or change profile files. Live sharing requires a separately reviewed committed-origin/epoch adapter, abortable extraction, explicit selected-client/tab/project consent and visible revoke. Durable node trust/accounting, networking, keys, publication and costs remain separate gates. Historical denied tests are not silently retried through this integration.
