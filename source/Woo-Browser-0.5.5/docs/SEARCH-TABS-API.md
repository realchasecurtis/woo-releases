# Search and tabs interfaces v1

sdk/web-search.cjs exports providers, searchURL(query, providerId) and isAddress(input). Runtime provider selection is an explicit user setting. To add another provider in a source fork, edit src/web-search.cjs: name, HTTPS origin, path and query parameter. The URL builder encodes query text with URLSearchParams and passes the destination policy. No per-keystroke network callback exists. The local ranking SDK still produces advisory suggestions; main-process routing now supplies general web search when a submitted input is not an address. Existing local-provider code/config remains replaceable.

sdk/browser-tabs.cjs exports BrowserTabs for an Electron main process. Constructor inputs: win, session, resolve(input) => Promise<{url,name?}>, onChange, onNative, maxTabs. Public methods: add, select(id), close(id), navigate(input, optionalTab), home, history(direction), reload, layout, snapshot and destroy. active/state refer to the selected tab. Each page handler captures its own tab record; closed/sequence checks reject late resolution. Replacements must retain safe URL validation, sandbox/context isolation, no Node/native bridge, navigation guards, permission/download controls and honest origins. Native Host origins still use their separate renderer factory.

Normal web session storage is shared by origin, not by tab; this is not a private-tab design. Tabs are in-memory and not restored on restart. Snapshot exposes safe tab UI metadata, not arbitrary native methods to websites. Main-process methods are available only to trusted app code; declarative extensions cannot execute them or change shared registry ownership rules.

The default source remains openly editable. Provider responses, registry records and web pages cannot change the user's configured search provider or update trust. Custom source forks can deliberately change their own implementation, with responsibility for preserving security and third-party licenses.

Official provider references checked 2026-10-26:
- https://support.microsoft.com/en-us/bing/how-bing-delivers-search-results
- https://duckduckgo.com/duckduckgo-help-pages/settings/params

Live acceptance tests inspect actual Bing result links for Facebook and two unrelated multiword queries, rather than only asserting a search URL was constructed. Other selectable providers may vary with network, region and anti-bot policies; live result acceptance was performed against the default Bing provider.
