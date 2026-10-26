> RELEASE STATE 0.5.0: New domain/alias/site-identity creation is temporarily CLOSED in the packaged app. Creation examples below describe development fixtures or future approved operation, not actions an AI should enable. Normal public HTTPS browsing and explicit web search work. Existing recent projects and verified snapshots remain available; signing remains temporary.

# Capability and publication states — 0.5.0

| Capability | Current state | Important limit |
|---|---|---|
| Portable Windows browser | Implemented, unsigned | No production security certification |
| Tabs and navigation | Implemented | 20 tabs, no tab restore across restart |
| Internal Woo discovery | Implemented, local metadata | No crawler or remote public index |
| General web search | Explicit choice or chosen Enter default | Provider receives submitted query |
| Guided static-site creation | Implemented for local preview | Temporary memory-only owner identity |
| Site starter | Editable HTML/CSS files | No server-side runtime or package install |
| Own static folder | Verified signed snapshot | 64 files, 4 MiB total, file/type/path limits |
| Saved preview after restart | Implemented | Viewing works; signing key is gone |
| Stop/start preview | Implemented locally | Not a public network service |
| Persistent owner key/recovery | Not configured | Requires separate human approval/design |
| Public registry/network | Not deployed | Local labels do not prove global availability |
| Native public hosting/NAT/relay | Not implemented | Planner examples are simulations |
| HTTPS aliases | Implemented | Depend on real public HTTPS destinations |
| Updates | Authenticated checker code exists | No production endpoint/key configured |
| Native Mac/iPhone app | Not built/tested | Apple tooling/signing/device work remains |

A local name is not a public DNS registration. Normal browsers will not discover Woo-only names automatically. Alias mode points at an existing HTTPS site, whereas native local mode verifies signed static bytes under a distinct owner/generation origin. Neither mode authorizes impersonating a public HTTPS origin or bypassing certificate checks.

## Endings

Existing local examples: .bunker and .woo. Historical proposed candidates, not finalized: .hab .lun .exo .ast .lgr .syn .apl .wpg .wst .svc .prg .gui. No exclusive namespace clearance is asserted for any candidate. The engine validates dotted ASCII labels; the wizard asks for a site label and a single ending. The list is a product suggestion list, not a global root policy. Selecting a proposed/custom ending affects this local preview only. A real shared network needs governance, authenticated registry rules and conflict handling before claiming globally meaningful ownership.

## Human-readable status meanings

Ready on this PC: a validated signed snapshot and local metadata were saved. Not published: no public transport/registry was deployed. Preview stopped: no local verified window is serving the snapshot; data is retained. Signing unavailable: the ephemeral key ended or no key was configured. Trust recovery required: checkpoint/pin consistency failed; do not erase files. Updater not configured: no trusted publisher endpoint is installed; this does not mean up to date.
