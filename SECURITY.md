# Security Policy

## Supported Branches

- `master`: production fixes and releases.
- `dev`: staging validation before production.

## Reporting A Vulnerability

Open a private security report with:

- affected route, socket event or file;
- reproduction steps;
- expected impact;
- logs or screenshots if useful.

Do not publish exploit details in public issues.

## Secrets And Local Data

Never commit:

- `.env` or environment-specific `.env.*` files;
- `database/*.sqlite` and SQLite sidecar files;
- `notes-local/`;
- production credentials, RCON passwords or JWT secrets.

Production secrets must be supplied through environment variables on the host.
