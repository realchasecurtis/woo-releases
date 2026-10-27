# Extending Woo

Woo's MIT source and SDK allow custom clients, vertical applications, alternate UI, hosting tools and registry integrations. Start with `examples/custom-client.cjs` and the runnable Workshop site. You may fork the reference browser. An altered client does not get a secret registry override: an unchanged authoritative registry still verifies the owner's signatures and sequence/generation. A malicious registry operator can rewrite its own service; this prototype does not solve operator equivocation or decentralization.

## Declarative plugin SDK v1

The first in-app extension layer intentionally executes no plugin JavaScript, HTML, CSS or shell code. A JSON manifest has `apiVersion`, `id`, `title`, `capabilities`, and optional `theme`, `panel`, `shortcuts`. Unknown fields are rejected, so adding `script`, `url`, or other executable hooks is not silently accepted.

Supported capabilities:

| Permission | Allowed behavior | Boundary |
|---|---|---|
| theme | accent/background hex color tokens | Home content only; security/identity chrome unchanged |
| ui.panel | text paragraph | textContent; no HTML |
| ui.shortcuts | up to 8 labeled HTTPS or woo:// actions | Navigation only after the user clicks; core validation still applies |

`validatePlugin(manifest)` validates structure. `authorizePlugin(manifest,grantedCapabilities)` fails if any requested capability is missing. The reference client shows all requested permissions with Deny selected by default. Grants are per extension, per session; removal or app exit revokes them. This milestone enables one extension at a time. No filesystem, credentials, page DOM, cross-origin data, network fetch, OS command, background worker or ownership mutation permissions exist.

Use `examples/workshop-plugin.json` as a working manifest. The example adds a Workshop shortcut/panel and color tokens. This is not an executable plugin sandbox and is not described as an audited secure sandbox. Tests cover malformed capabilities, arbitrary styles, executable fields, unsafe navigation and privileged bridge denial. Native permission dialog interaction is not automated; its allow/deny branch is small and explicit.

## AI-assisted custom solutions

AI can generate static site files, declarative manifests or a source fork. Review those artifacts and explicitly choose a folder/extension before loading them. Static-site JavaScript runs inside the native site's isolated Chromium origin under the signed-content restrictions. SDK programs/source forks run as normal developer code with the user's environment permissions; **do not automatically execute arbitrary AI-generated programs**. No AI model/API, remote marketplace, updater, code installer or credential access is wired into Woo.
