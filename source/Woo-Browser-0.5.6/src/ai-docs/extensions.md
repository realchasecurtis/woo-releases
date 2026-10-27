> RELEASE STATE 0.5.0: New domain/alias/site-identity creation is temporarily CLOSED in the packaged app. Creation examples below describe development fixtures or future approved operation, not actions an AI should enable. Normal public HTTPS browsing and explicit web search work. Existing recent projects and verified snapshots remain available; signing remains temporary.

# Extension and provider interfaces

All source is supplied under MIT with third-party notices retained. No proprietary hosting service is mandatory. The reference app is one client, not the only permitted implementation.

## Discovery

sdk/discovery.cjs exports createProvider({readRegistry,readPublished}). search(query) returns ranked metadata records with name/title/description/aliases/address/destination/source/score. Default reads only this profile's data. Query bound 256, results bound 50. Replace ranking or input adapters in a source fork; clearly label index scope. A remote adapter needs separately approved endpoint/auth/privacy/validation design. Do not silently crawl private sites or send keystrokes to it.

## Omnibox shortcuts and public web providers

sdk/search.cjs exports createSearch({includeDefaults,aliases,providers,weights}) for local advisory suggestions. includeDefaults:false removes built-ins. Alias entry: {title,names:[canonical,aliases...],url,kind}. Providers are trusted synchronous local functions; exceptions are isolated. Exact/prefix/token/typo weights are configurable. Executable providers are not declarative extension permissions.

sdk/web-search.cjs exports provider descriptors, searchURL(query,providerId) and isAddress(input). src/main.cjs chooses whether a submitted plain query uses Woo metadata or the user's chosen regular-web default. Explicit public-web selection always uses the selected provider. URLSearchParams encodes query text. URL and public-network policy still validate destinations. Source forks can add providers without using Woo-operated infrastructure.

## Tabs and internal UI

sdk/browser-tabs.cjs exposes the Electron main-process BrowserTabs component. Each tab owns a WebContentsView and state; add/select/close/navigate/home/history/reload/showSearch/layout/snapshot/destroy are local trusted APIs. Geometry is 36px tab strip +48px navigation +24px origin strip; web content begins at y=108, full width. Keep CSS and controller geometry together if changing chrome. isNative/onNative route local verified sites to their own factory; do not route them to arbitrary file:// pages.

## Guided Host and content

sdk/onboarding.cjs validates wizard drafts. src/foundation.cjs is the current reference orchestration layer, including native folder selection and local trust persistence. It is not a remote write service. For custom clients use the SDK crypto/ownership/bundle/client/guard primitives and inspect examples/custom-client.cjs. sdk/host.cjs builds/verifies static bundles; deprecated HTTP helpers reject. A future transport must authenticate peers/capabilities and preserve signed verification; none is silently substituted.

## Update providers

sdk/updates.cjs exposes UpdateChecker({config,current,fetch,clock,changed,floorFile}) and authenticate/createTransport helpers. The reference app supplies a durable floor path. Default transport enforces public HTTPS, timeout/size bounds and agent:false. Even a custom byte fetch is followed by manifest verification. Config includes endpoint, pinned publicKey, downloadOrigins and optional product/platform. Changing a user's trusted publisher is an explicit local trust decision, never a field accepted from untrusted remote metadata.

## Examples and limitations

examples/custom-providers.cjs demonstrates replacing local alias/ranking/provider inputs. examples/custom-client.cjs signs and verifies an ephemeral local bundle with no public server. examples/workshop is a static sample using browser storage. examples/lifecycle.cjs simulates policy time; it is not a live release/forfeiture service. No executable plugin marketplace, dynamic privileged extension loader, AI API or updater installer is provided. These are explicit gaps for reviewed future work, not a lock to our service.
