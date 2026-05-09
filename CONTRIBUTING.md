# Contributing to the AI Adapter Protocol

## Workflow

1. **Open an issue** for any spec change before starting work. Describe the problem, the proposed change, and the normative impact (which MUST/SHOULD/MAY statements change).
2. **Add or update test vectors** in `conformance/vectors/`. Every normative change MUST have at least one valid vector exercising the new behavior and one invalid vector for any new rejection rule.
3. **Keep schemas aligned** — if you change a field in the spec, update `schema/` to match.
4. **Update the spec document** — `spec/vendor-adapter-protocol.md` is the canonical reference; README quick-start may also need updating.
5. **Open a pull request** referencing the issue. See PR requirements below.

## PR Requirements

- State the change category (editorial / additive / breaking) per `GOVERNANCE.md` §2.
- Explain normative impact: which MUST/SHOULD/MAY statements are added, changed, or removed.
- Include compatibility notes for implementations targeting the previous minor version.
- Add negative vectors (`conformance/vectors/invalid/`) for any new rejection rule.
- Sign off with `git commit -s` (Developer Certificate of Origin).

## Adding a New Vendor

1. Open an issue with: vendor name, canonical ID string, public API documentation URL, and at least one team member who can verify L2 conformance.
2. Add the vendor ID to the `KNOWN_VENDORS` table in `spec/vendor-adapter-protocol.md`.
3. PR will be reviewed as additive — minor version bump.

## Adding a New Capability

1. Open an issue with: capability name, semantics, which request/response fields it gates, and a reference implementation or example.
2. Add the capability to the capabilities table in `spec/vendor-adapter-protocol.md` and to the `schema/capabilities.schema.json` enum.
3. Add at least one test vector exercising the new capability.

## Running Validation Locally

```sh
node conformance/validate.js
```

This validates all vectors in `conformance/vectors/` against their declared schemas.
