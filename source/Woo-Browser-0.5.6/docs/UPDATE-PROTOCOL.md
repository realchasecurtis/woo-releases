# Release manifest protocol v1

Implementation: src/updates.cjs. Trusted configuration: src/update-trust.json, bundled with the app and never accepted from web content or registry records. Fields: endpoint (public HTTPS manifest URL), publicKey (Ed25519 SPKI PEM), downloadOrigins (explicit HTTPS origin allowlist). No end-user trust override UI is provided. Empty configuration means no network checks and not-configured status.

The response is JSON with payload (an exact UTF-8 JSON string) and signature (base64 Ed25519 signature of those exact payload bytes). Payload fields:

    {"schema":1,"product":"woo","platform":"win32-x64","version":"0.5.0","issued":1800000000000,"expires":1800086400000,"url":"https://downloads.example.com/woo.zip","size":163000000,"sha256":"<64 lowercase hex characters>"}

The example is not a live release. Stable versions use three bounded nonnegative integer components, compared numerically; prereleases and leading-zero versions are refused. issued/expires are epoch milliseconds, lifetime <=7 days, future issue tolerance five minutes. Incorrect clocks can cause unavailable status. Same/older-than-installed releases never offer installation. Session-local highest-version tracking rejects rollback during a run. Across restart, freshness is bounded by expiry and installed version; there is no persisted transparency log or key rotation mechanism. A compromised signing authority could authorize malicious code; signatures authenticate publisher approval, not code safety.

Downloaded bytes must match signed size/hash and are saved only after explicit user action. Updater does not extract or execute them. Release-signing keys are distinct from site-owner identity keys.

Production activation remains pending: choose and authorize an HTTPS manifest/artifact hosting location; approve creation or use of a lasting release-signing key with an offline backup and controlled signing workflow; then bundle only its public key and approved origins. No credentials were generated or server deployed. Test keys exist only in process memory. No production endpoint is invented.

Test-only createTransport dependency injection connects to a temporary loopback HTTP fixture to test response handling. Production construction has no localhost bypass; it uses the fixed HTTPS/public-address transport. Local fixtures are not a deployable update source.
