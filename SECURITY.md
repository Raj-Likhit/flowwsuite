# Security Policy

## Reporting a Vulnerability

We take the security of Flowwsuite seriously. If you believe you have found a security vulnerability in this project, please report it to us immediately.

### Responsible Disclosure

-   Please do **not** open a public issue for security-related reports.
-   Send an email to the maintainers (or use the contact method specified in our GitHub profile).
-   Provide as much detail as possible, including steps to reproduce and any potential impact.
-   Give us a reasonable amount of time to resolve the issue before making it public.

### Our Strategy

-   **Client-Side First**: We minimize data exposure by performing all image processing on the client's device.
-   **No Storage**: We do not store or transmit any image data converted through Flowwsuite.
-   **Audited Dependencies**: We regularly audit our dependencies for known vulnerabilities using `npm audit`.

---

## Supported Versions

Currently, only the `main` branch is supported for security updates.

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |
| < 1.0   | :x:                |

---

Thank you for helping keep Flowwsuite secure!
