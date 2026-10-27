# Woo publishing slice 0.1.1

Source-only vertical slice, not a release or public domain service. Built from Browser 0.5.6's unchanged crypto, host/bundle and ownership modules. See docs/CONTRACT.md first.

## Run (existing Node 22+; no install)

    node --test --test-isolation=none test/slice.test.mjs
    node demo.mjs

16 tests pass. Demo: create test-scoped name -> sign/package page -> in-memory catalogue/storage -> fresh client search -> verify/open/export -> update -> observe revocation. TEST-RESULTS.txt and DEMO-RESULTS.txt are actual Windows results. Signing keys are created only by tests/demo in RAM and never exported. Output contains only synthetic public metadata. No listeners, external providers, browser execution, files selected from a user's site, or durable data are used.

The modules use Node built-ins and file-map inputs, with no Windows-specific APIs. A future Windows publisher/Mac fresh-client test can reuse these APIs, but Mac execution and separate-process/device transfer have NOT been tested. No Mac installer or runtime installation is included.

## API example

```js
import {createMemoryProvider, createPublisher, createClient} from './src/index.mjs';
// fixtureKey is test-only and must remain RAM-only; obtain it from vendor/sdk/crypto.cjs in tests.
const provider = createMemoryProvider();
const publisher = createPublisher({provider, key: fixtureKey, label: 'garden', publicTestContent: true});
await publisher.create();
await publisher.publish({'/index.html': '<h1>Synthetic public page</h1>'});
const fresh = createClient({provider});
const choices = await fresh.search('garden'); // no trust/pin mutation
const opened = await fresh.open(choices[0].name, {retain: true});
// opened.record + opened.bundle are compatible inputs to Browser verifyBundle/NativeRenderer.
// opened.exportBytes is canonical signed bundle JSON, not an executable or ZIP.
await publisher.publish({'/index.html': '<h1>Revision 2</h1>'});
await publisher.revoke(); // terminal adapter tombstone; old Browser registry needs extension review
```

Main owns provider and publisher; renderer must never provide a signer/provider authority. Renderer search choices are untrusted until main resolves/verifies exact scoped name. Render only through existing sandboxed NativeRenderer, never innerHTML in the trusted app. This slice does not itself render HTML or write a download file; it returns verified render-ready files and export bytes.

## Boundaries and next integration

- Owner scope includes full SHA256 key fingerprint; label is a convenience within that scope. No exclusive global friendly name, registration fee, DNS operation or public namespace claim. Existing production gates unchanged.
- Catalogue is one injected provider. Its operator controls inclusion, ordering and availability. No decentralized discovery, multi-peer independence or Sybil resistance is claimed. A future GitHub adapter would be centralized storage/discovery, not a distributed-consensus solution.
- Exact Browser bundle format and signature canonicalization are reused. Mapping transports complete histories of existing claim/update signed operations. Revoke is one explicit new terminal action in the SAME signed-envelope shape; not wire-accepted by unmodified Browser OwnershipRegistry. No implicit reassignment or expiry semantics are introduced. Browser integration must review this adapter extension, never feed tombstones directly to the old registry.
- Only known history permits rollback/fork detection. Search creates no trusted records for unadmitted names. For already pinned names, search applies verified history safety checks and reports revocation/fork/rollback errors rather than swallowing them. A known divergent prefix quarantines that name, preserving its pin; normal offline/open stays blocked. No automatic reset/recovery is implemented. A valid shorter historical prefix fails rollback, without claiming fresh clients can detect it. All memory is lost on process restart.
- Explicit retention enables offline access while this client instance survives. Returned copies cannot mutate retained state. Offline freshness is unknown. Revocation observed later for an already pinned name (including search), or during explicit resolve/open, clears this client's retained copy; downloaded third-party copies cannot be recalled. Publication and revocation observations are point-in-time, not leases that prevent a later update immediately after response.
- Provider append is atomic compare-and-swap in memory. Concurrent changes fail rather than silently overwrite. Publishing uploads bytes before head commit; a failed head commit can leave an orphan, counted against the bounded memory quota. No automatic orphan deletion, retry/reconciliation after uncertain acknowledgement, compaction or permanent persistence is implemented. A fresh session resets limits. Remote adapters must bound bytes/time BEFORE decoding and honor compare-and-swap atomically; these in-memory bounds are not a hardened remote transport.
- File-map packaging is for trusted-main-selected public data. It does not replace folder containment/reparse validation. No durable identity/credential provisioning, persistence migration or real publisher UI exists here. Snapshot-store integration remains held.

Smallest next source milestone: independent review of this contract/module, then a thin Browser trusted-main adapter and inert creator/fresh-client UI using these APIs. After persistence/key design and specific approvals, implement one GitHub provider with signed history and immutable content. PC transport can fetch the SAME bundle bytes later. Public/network/TLS/firewall/GitHub publication and lasting identities need separate scopes; none is implied by passing these tests.

