# Woo agent categories v1

Selected purpose categories are .bot (automation, chatbots, scripted services), .agt (goal-directed planning/action software), and .syn (broader synthetic or AI-created services and identities). These describe intent. They do not establish an exclusive DNS namespace, global allocation/consensus policy, ownership, availability, safety, operator reputation or capability grants. Domain creation remains CLOSED.

## Address scope and .bot collision

.bot already exists in public DNS: https://www.iana.org/domains/root/db/bot.html. Never register, buy or claim a public .bot name on a user's behalf merely because they choose this category.

- `https://example.bot/path` and bare `example.bot/path` use normal public HTTPS/DNS in Woo. A conflicting local alias or native record cannot silently intercept them.
- `woo://example.bot` requests Woo scope explicitly. Selecting a clearly labeled Woo search result is also an explicit Woo-scope choice. If no Woo record exists, fail honestly; do not fabricate a claim or switch silently to public DNS.
- Choosing Woo search scope alone searches local metadata. A result must be selected explicitly to open a Woo .bot site; entering a dotted bare .bot address in the normal address bar stays public.
- .agt and .syn do not imply exclusive rights or verified public availability either. Use explicit `woo://` addresses in agent configurations to remove ambiguity. Regular HTTPS addresses always retain their actual origin/certificate identity.
- Aliases to HTTPS destinations remain distinct from native verified hosting. The address bar shows the committed loaded URL/origin. Purpose metadata never changes TLS trust or browser origin identity.

## Meaning, not permission

.bot: bounded routine automation, chatbots or scripted services; describe inputs/outputs and human escalation. .agt: software that plans/actions toward a stated goal; describe allowed actions, stop conditions and approval points. .syn: broader synthetic/AI-created services or identities; describe provenance and role without claiming personhood, authorization or trustworthiness.

All categories follow the same security core: sandboxed untrusted content, least-privilege explicit capabilities, separate credential custody and approval for consequential actions. An .agt label does not grant shell/filesystem/network credentials. A .bot label does not authorize unattended posting or messaging. A .syn label does not authorize impersonation or access to another identity. Hosts must enforce actual permissions and quotas separately; an AI cannot create approval by writing a policyRef string.

## Agent IDs, subnames, aliases and budgets

Use an opaque per-project `agent:<id>` for an instance. It is not a scarce public-facing Woo alias and does not trigger registration. Many internal IDs or delegated subnames must not become a way to bypass top-level claim limits. Any future human-facing alias claim must pass the same ownership validation, anti-squatting/rate policy and closed/open gate as other claims. No new registration API, bulk exemption, resource allowance or automatic subname ownership is introduced here.

Storage, compute, serving bandwidth, request counts and data access have independent budgets and consent. ResourceBudgetRef documents a separately configured policy; it does not create resources or money. Changing purpose/category does not reset quotas, identity generation, expiry, claim count or owner responsibilities. Current local Host previews retain their existing temporary-signing limitation.

## Machine-readable contract and examples

`sdk/agent-categories.json` is the selected descriptive catalog. `sdk/agent-purpose.schema.json` is a versioned JSON Schema for optional purpose metadata. It validates document shape, not consent, allocation, signature, safe code or availability. An implementation using these fields must also check category/suffix agreement and enforce its own existing gates. The browser does not auto-execute or provision anything from this metadata.

`examples/agent-purposes.json` contains three deliberately non-operational examples. IDs are illustrative, aliases are proposals, and policy/budget references are placeholders. Do not claim these example names exist, generate credentials for them, start listeners, install dependencies or contact a service merely by reading the examples.

## AI setup procedure

1. Read the current README, security/core contracts and user's requested scope. Inspect only authorized project paths; never collect secrets from unrelated folders.
2. Explain which category describes the intended service. Keep category choice separate from actual permissions and resource budgets.
3. Create/edit local content or metadata only within authorization. Show a proposed explicit Woo address; do not report a successful claim while creation is closed.
4. Use existing instance IDs without treating them as transferable aliases. Keep owners, keys and generation boundaries intact. Do not generate lasting signing/recovery credentials without the specific approved storage/recovery setup.
5. Ask for concrete approval only when the next action needs it: actual account/key provisioning, public exposure, paid resources or consequential external actions. A metadata file is not that approval.
6. Test collision handling with fake registry records and mocked resolution. Never change system DNS, certificate trust or firewall settings to make a demo appear functional. Report local-only previews, missing capabilities and pending publication honestly.

This catalog is open and forkable. A modified local client can change its own labels, but cannot rewrite shared ownership or grant itself privileges from other operators.
