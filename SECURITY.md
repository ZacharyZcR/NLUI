# Security Policy

## Supported Versions

NLUI is currently in pre-release. Security fixes are applied to the `main` branch.

| Branch | Supported |
|--------|-----------|
| main   | Yes       |

## Reporting a Vulnerability

**Do NOT open a public issue for security vulnerabilities.**

Please report security issues by emailing **ZacharyZcR1984@gmail.com** with:

1. Description of the vulnerability
2. Steps to reproduce
3. Potential impact
4. Suggested fix (if any)

You should receive a response within 72 hours. We will work with you to understand the issue and coordinate a fix before any public disclosure.

## Scope

The following are in scope:

- NLUI server (`cmd/nlui`, `server/`)
- Desktop application (`desktop/`)
- Configuration handling (`config/`, `service/`)
- API gateway and tool execution (`gateway/`, `core/toolloop/`)
- Authentication mechanisms

Out of scope:

- Vulnerabilities in third-party dependencies (report upstream, but let us know)
- Issues requiring physical access to the machine
- Social engineering attacks

## Disclosure

We follow coordinated disclosure. Once a fix is available, we will:

1. Release a patched version
2. Publish a security advisory on GitHub
3. Credit the reporter (unless they prefer anonymity)
