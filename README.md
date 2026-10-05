# Maestro Deck — Jira plugin

Create Jira Cloud issues from a side panel in [Maestro Deck](https://github.com/BlueShork/maestro-deck).

Install it from **Plugins** in Maestro Deck, open the Jira panel from the toolbar,
then connect with:

- your site (`acme.atlassian.net`)
- your Atlassian email
- an API token, created at <https://id.atlassian.com/manage-profile/security/api-tokens>

The token is stored in your OS keychain. The panel lets you pick a project and an
issue type, then enter a summary and a description.

This repo is also the template for new plugins. The host API is documented in
[`docs/plugins.md`](https://github.com/BlueShork/maestro-deck/blob/main/docs/plugins.md),
and `src/sdk.ts` is the client to copy.

## Development

```bash
pnpm install
pnpm test
pnpm dev      # vite build --watch into dist/
```

In a development build of Maestro Deck, open **Plugins → Load local plugin** and
pick `dist/`. Reopen the panel after each rebuild.

## Release

1. Bump `version` in `public/manifest.json` and `package.json`, then commit.
2. Tag and push: `git tag vX.Y.Z && git push origin vX.Y.Z`.
3. The `release` workflow tests, builds and publishes `plugin.zip`, and prints its sha256 in the release notes.
4. Update the entry in [`BlueShork/maestro-deck-plugins`](https://github.com/BlueShork/maestro-deck-plugins) `registry.json` (`version`, `url`, `sha256`).
