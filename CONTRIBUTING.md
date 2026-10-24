# Contributing

Start with an issue for substantial changes. Small fixes can go straight to a
pull request. Explain the problem, behavior changed and validation. Include
screenshots for UI changes and focused recordings for interactions where possible.

Use Node 22.18+ on the 22.x line and `npm ci`. Run:

```sh
npm run format
npm run check
npm run build:site
```

Keep runtime source in TypeScript. Use Manrope and Phosphor for UI work. Prefer
existing platform APIs to new dependencies. Type external boundaries and validate
untrusted data at runtime. Avoid broad `any` or disabled checks. The migration
baseline checks all app source but still permits implicit `any` and nullable DOM
lookups in legacy UI modules; tighten these as modules change. Update logic has
an additional strict compiler check.

Test meaningful behavior and failure cases. Never call live publishing services
in tests. Publishing requires explicit current approval; stored history is not
permission. Never commit credentials, client content, local workspaces, `dist`,
or generated runtime JavaScript. Dependency updates require review and are not
automatically merged. Installation/data changes need upgrade notes.

Contributions are under Apache 2.0. Submit only work you have the right to
contribute. Be respectful and specific; harassment, threats and disclosure of
private information are not welcome.
