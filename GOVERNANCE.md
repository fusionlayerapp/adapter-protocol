# AI Adapter Protocol — Governance

This document describes how the AI Adapter Protocol (AAP) is maintained, how changes are proposed and accepted, and how decisions are made until community governance is established.

## 1. Stewardship

AAP was drafted by the FusionLayer team and is currently stewarded by them until the public repository opens to external contribution. Stewardship means:

- Accepting and reviewing pull requests.
- Publishing releases and maintaining the conformance registry.
- Enforcing the process in this document.

When at least three independent third-party implementations have reached L2+ conformance, stewardship transfers to a lightweight editor group of no fewer than three people from at least two organizations. Until then, the steward has final say on ambiguous decisions but MUST document the rationale.

## 2. Change Process

Every change lands through a pull request. Changes are categorized as:

- **Editorial** — typo, clarification, non-normative rewording. Merged at steward discretion after one review. Patch version bump.
- **Additive** — new optional field, new known vendor ID, new capability flag, new error code, new test vector, new conformance profile. Readers MUST accept unknown values in all additive extensions. Merged after two reviews from independent reviewers. Minor version bump.
- **Breaking** — anything matching §9 of the spec's versioning policy (removing a required field, removing a vendor ID, removing a capability, changing an error code value, changing normalization rules incompatibly). Requires a written rationale, a 2-week public comment window, and sign-off from the steward (or, post-transfer, two of three editors). Major version bump.

## 3. Versioning

AAP follows [Semantic Versioning 2.0.0](https://semver.org).

- **MAJOR** — breaking changes (see spec §9).
- **MINOR** — additive, backward-compatible.
- **PATCH** — editorial.

The v1.0 freeze gate is:

1. At least three independent L2+ implementations verified.
2. Zero open "breaking" issues.
3. A 4-week public-comment window on a candidate `v1.0.0-rc` release.
4. Stewardship transferred or explicitly retained with rationale.

## 4. Compatibility Guarantees

Within a major version:
- No required field is removed from `AdapterRequest` or `AdapterResponse`.
- No vendor ID is removed from `KNOWN_VENDORS`.
- No capability is removed from `CAPABILITIES`.
- No error code is removed or repurposed.

These guarantees begin at v1.0.0. Pre-1.0 drafts may break compatibility on minor bumps, and SHOULD call out breakage in the CHANGELOG.

## 5. Intellectual Property

- The spec text (`spec/`, `README.md`, `CONFORMANCE.md`, `GOVERNANCE.md`, `CHANGELOG.md`) is licensed under CC BY 4.0.
- Schemas (`schema/*.json`), test vectors (`conformance/vectors/`), and any reference code are licensed under the MIT License.
- See `LICENSE` for full text.
- Contributors certify that they have the right to contribute under these licenses (the [Developer Certificate of Origin](https://developercertificate.org) applies to all PRs; sign commits with `git commit -s`).
- The steward and contributors make **no patent claims** against conforming implementations of AAP. This is a non-assertion, not a grant — if the spec incorporates prior third-party IP, that will be disclosed in a dedicated NOTICE file before inclusion.

## 6. Security Issues

Security-relevant defects (especially in the conformance harness or error normalization logic) MUST be reported privately to the steward before public disclosure. The steward will publish a fix and coordinate the advisory within 14 days of confirmation, unless an earlier public disclosure is necessary to prevent ongoing harm.

See `SECURITY.md` for the current responsible disclosure contact.

## 7. Amending This Document

Changes to `GOVERNANCE.md` follow the "breaking" process in §2 — because governance changes are, by definition, not editorial.

---

## 8. Capability Namespace Governance

This section governs how capabilities are named, registered, and resolved across AAP adapters. See also [`CAPABILITY-REGISTRY.md`](CAPABILITY-REGISTRY.md) for the canonical list.

### §8.1 Reserved Namespaces

- `core.*` — reserved for AAP core. Only spec updates (via the breaking or additive process in §2) may add entries. No external registration is permitted.
- `<vendor>.*` where `<vendor>` is the lowercased reverse-domain of a recognized AI provider (e.g., `com.anthropic.*`, `com.openai.*`, `com.google.*`, `ai.openrouter.*`). Owned by the named vendor. Adapter authors implementing those vendors MAY use those names without registration. Authors representing other organizations MUST NOT claim these namespaces.
- All other reverse-domain namespaces require registration (see §8.2).

### §8.2 Registration

A custom capability is registered by opening a PR that adds a row to [`CAPABILITY-REGISTRY.md`](CAPABILITY-REGISTRY.md). The PR MUST include:

- The reverse-domain capability name.
- Owner identity (GitHub handle or organization).
- Capability schema: a JSON Schema fragment stored at `capabilities/<reverse-domain-name>.schema.json`.
- Semantics: what does the capability mean when a vendor reports it? What is the contract when a consumer requests it?
- One reference implementation OR test vector demonstrating usage.

Maintainers (currently `hn2`) merge after a sanity check. No design review is required for `<vendor>.*` namespaces owned by that vendor. Light review applies for all others.

### §8.3 Lifecycle

Each registered capability carries a `status` field with one of the following values:

| Status | Meaning |
|--------|---------|
| `draft` | Registered but not yet implemented by any adapter. |
| `experimental` | Implemented by at least one adapter; interface may still change. |
| `stable` | Interface frozen. Backwards-incompatible changes require a new capability name. |
| `deprecated` | Implementations SHOULD stop emitting; consumers SHOULD ignore. |

Status transitions are PR-based. Only `experimental → stable` requires explicit maintainer approval. All other transitions (including `stable → deprecated`) may be self-merged by the owner with a single review.

### §8.4 Conflict Resolution

- Two PRs registering the same name: first-merged wins. The second author must rename or claim a sub-namespace.
- A registered capability that overlaps with a later AAP core feature: the registry entry is marked `deprecated` with a pointer to the core feature. The core feature takes precedence.

### §8.5 Discovery

Consumers discover available capabilities through:

1. [`CAPABILITY-REGISTRY.md`](CAPABILITY-REGISTRY.md) — the canonical list maintained in this repository.
2. An adapter's `capabilities` array (per spec §4) — the subset that adapter declares it implements.
3. Future: `capabilities.fusionlayer.app/registry.json` — a hosted JSON mirror. This is tracked as a separate follow-up and is not in scope here.
