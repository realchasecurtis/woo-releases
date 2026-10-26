# Replaceable provider interfaces v1

Woo source is MIT licensed. Forks may replace modules and UI, preserving dependency notices. These APIs are local building blocks, not a hosted proprietary service. This revision does not rewrite unrelated registry/Host interfaces.

## Search: sdk/search.cjs (apiVersion 1)

createSearch({includeDefaults, aliases, providers, weights}) returns suggest(input, records) and decision(input, records). Defaults are optional: includeDefaults:false removes curated X and the Workshop lab entry. aliases is an array of {title,names:[canonical,alias...],url,kind}; providers is an array of synchronous trusted local functions (normalizedQuery, localRecords) => entry[]. Provider exceptions are isolated. weights supplies positive numeric exact/prefix/token/typo scores. A new client can replace the entire ranking function; the default browser calls the shared search.js implementation. The browser build uses createSearch() defaults; to customize it, pass your configuration at that construction point and rebuild. Run node examples/custom-providers.cjs for a working custom solution.

No remote provider is invoked by default. No plugin gets an executable provider permission. Browser-side providers remain within the trusted shell CSP, with no network permission or Node access. Native/main-process providers in a fork are trusted application code and are not sandboxed plugins; audit them before enabling. Any future external search provider must require explicit submission and label the recipient, rather than forwarding keystrokes. Current declarative extensions cannot install these code hooks or change trust settings.

Results are text, not executable markup. Navigation still passes through the main process URL policy, DNS/public-address restrictions, native-site ownership checks and actual-origin display. Aliases never grant name ownership and cannot mutate another operator's registry. There is no bookmark/history collection subsystem.

## Updates: sdk/updates.cjs (apiVersion 1)

new UpdateChecker({config,current,fetch,clock,changed}) exposes start/stop, check, snapshot and explicit download. config holds endpoint/publicKey/downloadOrigins plus optional product/platform defaults woo/win32-x64. fetch(url,maxBytes) is an injectable trusted byte transport; default transport enforces public HTTPS and limits. authenticate always verifies the pinned signature and release constraints after a custom fetch. Clock and changed callback support custom UI/testing. A fork can replace this module entirely, accepting responsibility for its own trust model.

Users building their own Woo client may deliberately choose another publisher by editing the bundled update-trust.json and rebuilding after verifying that publisher's public-key fingerprint independently. This is an explicit local trust decision. Remote manifests, website content, aliases and declarative extensions have no operation to replace a trust root. Changing the client never transfers registry ownership. There is no automatic trust migration, key provisioning or provider-discovery network.

Current limitations: no in-app provider editor, dynamic executable-plugin loader, key-rotation UI, remote marketplace or executable extension sandbox. Configuration is source/build-time. Those are explicit gaps, not vendor lock-in. The source and example are supplied so others can build these features with their own reviewed permission boundaries.
