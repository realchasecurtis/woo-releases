# Review repairs 0.1.1

Preserved 0.1.0 directory and ZIP; archived prior ZIP also under task-5/evidence/Woo-Publishing-Slice-0.1.0-before-review-fixes.zip. New candidate is task-5/publishing-slice-0.1.1.

All three medium findings from 2026-10-27/task/PUBLISHING-INDEPENDENT-REVIEW.md addressed with regressions:
1. Search verifies then applies remember() for already pinned names; revocation removes retained content, divergence quarantines, and the rejected search reports safety transitions. Unadmitted search results remain non-admitting; terminal revocation for an unadmitted name is filtered but not stored. Contract explicitly narrows this promise.
2. Pins keep bounded prefix hashes. Common-prefix comparison occurs before strict-prefix rollback classification; shorter divergent valid histories quarantine and block offline open. Matching shorter prefix remains rollback-only. No trusted pin erased.
3. Keep 64 ordinary operations and allow a single bounded terminal revoke at position 65. Verifier/provider reject non-revoke operation 65 and any 66. Publisher rejects further updates before packaging/upload, with provider state unchanged in regression. Terminal continuation remains forbidden.

16/16 tests passed in permitted normal execution; no approval retry needed. Existing five vendor files are byte-identical to Browser 0.5.6. No production SDK changes, new signature format, transport, persistent credentials or release activation. Browser integration still needs independent acceptance; it must handle rejected search as a visible safety result and preserve explicit user acceptance for new scoped identities.

Fresh clients still cannot prove unseen latest state or revocations. Memory-only state is lost across restart. Snapshot-store's separately reported 15/15 result does not integrate persistence into this candidate; persistence design/integration remains separate work.
