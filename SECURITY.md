# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.0.x   | Yes       |

## Reporting a Vulnerability

Report vulnerabilities privately to `security@fusionlayer.app`.

Do **not** open a public GitHub issue for security vulnerabilities.

Include in your report:
- Affected version or commit
- Description of the vulnerability and its potential impact
- Reproduction steps
- Any suggested fix (optional)

The steward will acknowledge receipt within 3 business days and publish a fix within 14 days of confirmation, unless an earlier disclosure is necessary to prevent ongoing harm.

## Scope

Issues that are in scope for this policy:

- **Schema inconsistencies** that allow a malformed payload to pass validation and cause unsafe ingestion by a conforming implementation.
- **Conformance harness bypasses** — logic flaws that allow a non-conforming adapter to be certified as conforming.
- **Error normalization weaknesses** — cases where a vendor error is mapped to a code that causes a caller to take an unsafe action (e.g., silently retrying after `invalid_api_key`).

Out of scope:

- Vulnerabilities in third-party adapter implementations (report to those maintainers).
- Rate-limiting or DoS concerns in adapter implementations (implementation-level, not spec-level).
