# Privacy and local data — Woo 0.5.4

No Woo-owned analytics SDK, telemetry collector, unique tracking ID or enabled crash-upload integration was found in the application source. This is not a zero-tracking guarantee: Chromium/OS background behavior needs runtime observation, and visited websites can track users.

New profiles use Google for submitted web queries; explicit saved choices remain unchanged. Typing suggestions are local. Homepage assets/galaxy are bundled. Visiting a site allows its normal HTTPS content and third-party requests. Page-provided favicon requests may contact external servers after navigation; the extra icon fetch omits credentials but still exposes the connection IP. No external favicon lookup service is used and saved bookmarks do not all contact sites on startup.

A configured remote registry receives requested Woo names. Its default endpoint is blank/local. Update scheduling exists, but shipped endpoint/key are unconfigured, so it fetches no production update. A future configured checker sends a generic Woo-Update/1 User-Agent; downloads require an explicit action and never silently install.

Stored locally in the existing Woo profile: cookies/site storage/cache, settings, bookmark URLs/titles/icon data, registry metadata, project names/folder paths, verified bundles and trust pins. Native owner-generation site storage is separate. No browsing-history collection service or cloud sync is configured; that does not mean Chromium stores nothing. Local ownership identifiers are not marketing tracking identifiers.

Settings > About Woo & Privacy shows version and actual executable path. It does not inspect your browsing data or send that path anywhere. To back up, close Woo yourself and copy the entire profile to your chosen private location. Do not delete data or reset settings just to resolve a version mismatch. No automatic cleanup or preference changes are made by this release. The regular profile remains %APPDATA%\Woo-Foundation-0.3.

Spellcheck/dictionary behavior is unchanged; no broad network switch was enabled or disabled to claim privacy. Do not call Woo anonymous, tracker-blocking or zero telemetry across the underlying runtime without further evidence.
