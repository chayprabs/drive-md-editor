# Contributing to MarkDrive

Thank you for helping improve MarkDrive.

## Development setup

```bash
pnpm install
pnpm generate:icons
pnpm build
pnpm check
```

Load the `dist/` folder as an unpacked extension in Chrome. See [README.md](./README.md) and [docs/oauth-setup.md](./docs/oauth-setup.md) for OAuth configuration.

## Pull requests

1. Branch from `main`.
2. Keep changes focused and match existing TypeScript/React style.
3. Run `pnpm check` before opening a PR.
4. Use Conventional Commits when possible (`feat(app): …`, `fix(drive): …`).

## Code of conduct

Be respectful in issues and reviews. Harassment and spam are not tolerated.
