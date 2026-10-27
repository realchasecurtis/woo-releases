# Shared catalogue source candidate

Candidate: `candidate/Woo-Shared-Catalogue`, isolated from task-2 source.

## Exact publication payload (parent only)

Publish only these two files to `realchasecurtis/woo-releases`, proposed branch `main`:

- `network/catalogue-v1.json`
- `network/welcome.txt` (UTF-8, exactly `Hello world!` plus newline)

Expected public source URL:
`https://raw.githubusercontent.com/realchasecurtis/woo-releases/main/network/catalogue-v1.json`

Expected text URL:
`https://raw.githubusercontent.com/realchasecurtis/woo-releases/main/network/welcome.txt`

No GitHub Pages setup. Raw text/plain is intentional: the existing HTTPS browser tab displays the fetched text, not HTML source and not local replacement content. Its actual origin is `https://raw.githubusercontent.com`. The catalogue uses the existing registry snapshot v1 format; it is operator-curated metadata trusted through GitHub HTTPS/repository control, not signed ownership, DNS, or global uniqueness.

Repository/branch route is proposed, NOT independently verified here: web tool could not access GitHub API, and read-only shell curl failed DNS resolution. Parent must verify branch `main` before publishing; change the two configured URLs together if branch differs. No public write was attempted.

## Behavior and boundaries

- Built-in config enables automatic in-memory fetch on fresh startup. No import, profile setting, key, or claim required. Candidate has NOT been launched.
- Landing page lists shared entries and fetch status. Woo search includes shared entries; selected entries resolve exact names and enter existing sandboxed HTTPS browser renderer. Actual committed HTTPS origin remains displayed.
- Native local names retain first priority. Existing local aliases and builtins hide conflicting shared entries. Reserved builtins are excluded from shared display/resolution. A custom legacy registry endpoint takes precedence as a separate resolution mode, suppressing shared entries. Public `.bot` and explicit HTTPS behavior remain unchanged.
- Catalogue fetch: public HTTPS port 443, credentials/query/fragment rejected, public IPv4 DNS pin, standard TLS verification, no redirects, no compressed payload, 256 KiB / 500 records maximum, six-second deadline including DNS. Strict top-level/record fields, fatal UTF-8 decoding, existing name/URL/metadata validation, duplicates rejected. Bad/outage data clears results; no stale or synthetic success. One coalesced fetch per session; restart retries. No persistent catalogue cache.
- HTTPS destination requests use the existing public-address proxy and navigation policy. The adapter does not introduce special app privileges or alter native renderer script policy. The plain-text sample contains no scripts.
- Public claims remain closed. Download restrictions remain unchanged.

## Verification completed

`node --test test/shared-catalogue.test.cjs test/agent-categories.test.cjs test/discovery056.test.cjs test/navigation-settings.test.cjs test/web-search.test.cjs`

23/23 passed. New tests use injected byte transport and fake HTTPS request emitters: two fresh independent clients, exact-name resolution, discovery, local/native/custom-endpoint precedence, explicit HTTPS handling, malformed schema/UTF-8/size/count/URL/duplicate rejection, failure/no-stale behavior, redirected/encoded/interrupted responses, pinned DNS, TLS errors, DNS-inclusive timeout, exact publication payload/config.

Syntax checks pass for modified main/renderer/search/discovery and new adapter. No GUI runtime or network listeners launched. Full suite intentionally not run because existing core/update tests start listeners outside this source-only task.

## Next live proof (parent coordination)

1. Verify repository default/target branch and publish only the two payload files.
2. Read back both raw URLs. Require HTTP 200, no redirect, exact catalogue and sample bytes, UTF-8 text/plain sample response. Do not treat a 404/HTML error page as success.
3. Launch this candidate with an approved disposable fresh profile in the parent's bounded test environment. Confirm automatic shared status `ready`, count 1, and `welcome.woo` visible without import.
4. Click it and separately type `welcome.woo`; confirm rendered `Hello world!`, actual origin `https://raw.githubusercontent.com`, and real content URL. Capture evidence on a second fresh client/profile.
5. Exercise unavailable catalogue, conflicting local/native name, and preserved creation gate. Do not count source unit tests as a live cross-client proof.

No runtime bundle/build/distribution was made. Existing clients do not gain this adapter until an approved candidate build is distributed.
