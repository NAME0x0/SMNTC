# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of SMNTC seriously. If you believe you have found a security vulnerability, please report it responsibly.

**Do not open a public GitHub issue for security vulnerabilities.**

Instead, please use one of the following methods:

- **Email:** Send a detailed report to [security@smntc.dev](mailto:security@smntc.dev)
- **GitHub Security Advisories:** [Report a vulnerability](https://github.com/NAME0x0/SMNTC/security/advisories/new) via GitHub's private disclosure process

### What to Include

- A description of the vulnerability and its potential impact
- Steps to reproduce the issue
- Affected version(s)
- Any suggested fix or mitigation, if available

## Response Timeline

| Action               | Timeframe         |
| -------------------- | ----------------- |
| Acknowledgement      | Within 48 hours   |
| Initial assessment   | Within 7 days     |
| Patch release (crit) | Within 14 days    |
| Public disclosure    | Post-fix release  |

## Scope

The following are considered security issues for this project:

- **Cross-site scripting (XSS)** via the `<smntc-surface>` web component or React bindings
- **Supply chain attacks** — compromised dependencies or build artifacts
- **Dependency vulnerabilities** — known CVEs in direct or transitive dependencies
- **Arbitrary code execution** through shader inputs or material definitions
- **Prototype pollution** or injection via the semantic token pipeline

## Out of Scope

The following are **not** considered security issues and should be reported as regular issues:

- Shader rendering artifacts or visual bugs
- Performance degradation or GPU resource usage
- WebGL context loss under expected browser behavior
- Browser-specific rendering inconsistencies
- Feature requests or usability concerns

## Responsible Disclosure

We kindly ask that you:

1. Allow us reasonable time to investigate and address the issue before public disclosure.
2. Make a good-faith effort to avoid privacy violations, data destruction, or disruption of service.
3. Do not exploit the vulnerability beyond what is necessary to demonstrate it.

We are committed to acknowledging researchers who report valid vulnerabilities. With your permission, we will credit you in the release notes and `CHANGELOG.md` for the corresponding fix.

## Contact

- **Security email:** [security@smntc.dev](mailto:security@smntc.dev)
- **Repository:** [github.com/NAME0x0/SMNTC](https://github.com/NAME0x0/SMNTC)
