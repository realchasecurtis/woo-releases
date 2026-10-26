> RELEASE STATE 0.5.0: New domain/alias/site-identity creation is temporarily CLOSED in the packaged app. Creation examples below describe development fixtures or future approved operation, not actions an AI should enable. Normal public HTTPS browsing and explicit web search work. Existing recent projects and verified snapshots remain available; signing remains temporary.

# Permissions and human decisions

| Action | Current permission boundary |
|---|---|
| Search Woo metadata | Local validated registry/published metadata; no crawl |
| Search regular web | Explicit submit/selection, or user-chosen Enter default |
| Pick content folder | Native user file picker; path retained in main memory/config |
| Create starter | New name-specific local directory; no overwrite of existing starter folder |
| Create preview | Explicit local-only consent; ephemeral key, signed static snapshot |
| Stop/start | Local renderer state only; no router/firewall operation |
| Refresh source | Requires existing session key and validated selected source |
| Adopt old trust baseline/recover | Explicit warning dialog; no silent pin deletion |
| Import alias snapshot | Bounded validation, conflicts rejected; no ownership grant |
| Load extension | Native picker and explicit listed-capability consent |
| Copy docs | Explicit user action writes fixed docs to clipboard |
| Save docs/update | Native save dialog; fixed trusted source bytes; no automatic execution |
| Persistent identities/public hosting | Not activated; separate specific approval required |

The currently supported extension format is declarative JSON: theme, panel text and navigation shortcuts after a permission prompt. It does not execute JavaScript, access page content, credentials, arbitrary files or network APIs. Theme changes are scoped to the trusted home panel; external pages keep their own presentation. The browser's settings theme applies only to internal chrome/pages.

Source-level provider modules run as trusted application code and are not a secure executable plugin sandbox. A user may fork the MIT-licensed source, but should understand that adding Node-capable code changes the trust boundary. Keep registry ownership validation, origin identity, signed verification and page isolation in a small reviewed core. Do not auto-load code from a registry record, search result or remote update-provider declaration.

An AI agent must distinguish permission to inspect/configure local source from permission to deploy publicly, buy/register a domain, generate lasting credentials, upload personal data or message another person. A setup guide is not blanket authorization. Ask for a concrete approval only after preparing a reviewable plan/result, and preserve existing user authorization when it already covers the action.
