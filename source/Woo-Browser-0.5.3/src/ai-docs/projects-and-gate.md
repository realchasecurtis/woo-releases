# Projects, preview tabs and closed creation — API v1

Domain creation is closed in the packaged release. This chapter documents preserved project management and controlled development testing, not permission to reopen claims.

`src/projects.cjs` stores `projects-v1.json` with `{version:1,projects:[...]}`. Each project has `id` (canonical name), `name`, `title` (at most 120 characters), `source` (`starter` or `folder`), absolute `contentDirectory`, and integer `updatedAt`. The file is bounded to 1 MiB / 200 projects, validated on load and atomically replaced on explicit updates. Invalid metadata is not silently reset. Missing folders remain in the catalog. The list computes `folderAvailable` from index.html; no file content is indexed for search.

An existing Host configuration with a matching registry record can be adopted into Recents. It is labeled as an existing folder because older metadata did not reliably record starter origin. Older unselected projects with no stored path cannot be reconstructed; preserve their folders and use deliberate recovery. No folder is deleted by catalog management.

Trusted-frame IPC:
- `project-select(id)`: select an allowlisted existing project, restore name/path context and any matching session-only key. No remote request or new claim.
- `project-relink(id)`: show a native folder picker, require index.html and atomically update the path. Cancel leaves it unchanged. No copying, overwrite or publication.
- `project-preview(name)` / `preview-tab(name)`: verify the cached signed snapshot, create a sandboxed background tab or reuse its existing live preview tab. The initiating completion/project page stays active. Pending requests coalesce.
- `docs-open`: fixed internal documentation page. `code.woo` uses this route; it is not a privileged file URL.
- `motion(boolean)`: save local animation preference. OS reduced motion still overrides animation.

Preview tabs use NativeRenderer's verified protocol and per-owner/generation storage. They never become public web views: ordinary navigation from a native preview opens a normal tab. The address bar shows the actual woo-site origin. Stop revokes active sessions and disposes views. A stopped tab shows an error and cannot expose its old content. Opening another owner's generation uses different storage. Page permissions and Node access remain denied.

The root `OwnershipRegistry` defaults `allowNewClaims=false`; alias Registry defaults `allowNewRegistrations=false`; Foundation checks closure before generating a temporary key or creating files. Packaged main always supplies closure regardless of renderer payload or `--fixture-claims`. Unpackaged source can explicitly enable fixtures for tests. A deliberate source fork may change its own policy; this cannot authorize writes on another operator's registry.

Read-only public browsing and web search remain separate from native claims. Editing local project files with the user's own editor is possible; without a live signing identity those edits cannot be published as a new verified snapshot. Do not promise durable ownership, public reachability or recovery credentials that have not been configured.

## Favicon acquisition and cache
`src/favicon.cjs` v1 accepts public HTTPS paths through existing address filtering/proxy policy. Per navigation the handler admits at most three events and three candidates per event; newer events abort older work. A result applies only while its tab, sequence and committed page URL still match. Four-second timeout, 256 KiB input, 512px PNG dimensions and bounded ICO entries precede native decoding. Only allowlisted PNG chunks are accepted; animation/text/profile/unknown chunks are rejected. ICO supports embedded PNG frames; bitmap-only icons fall back. Page-provided Apple touch PNGs can be candidates. Output is normalized to a 32px PNG data URL; cached icon data is capped at 24,000 characters. Bookmark file size is bounded to 6 MiB and 200 records. No startup fetch or third-party icon service is used. SVG/data/file/private-address candidates are denied; unsupported icons do not break navigation. These bounds reduce risk but do not replace runtime image-decoder security maintenance.

## Settings trust surface
`settings-popover.html` is a separate sandboxed context-isolated child window. Main accepts its exact main-frame URL and only settings-specific actions. It cannot create claims, issue arbitrary navigation or access project data through the popup bridge. The parent page stays visible; no security-sensitive bridge is injected into it. Popover close and focus events do not reload or destroy the current page.
