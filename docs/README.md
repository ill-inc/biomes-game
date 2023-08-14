# Biomes Docs

### Local Development

```bash
$ yarn start
```

This command starts a local development server at `http://localhost:8080` and opens up a browser window. Most changes are reflected live without having to restart the server.

### Build

```bash
$ yarn build
```

This command generates static content into the `build` directory and can be served using any static contents hosting service.

### Deployment

```bash
$ GIT_USER=<Your GitHub username> yarn deploy
```

If you are using GitHub pages for hosting, this command is a convenient way to build the website and push to the `gh-pages` branch.

### Notes

- When using assets in Markdown, import via `/img/<file-name>`.
- When using assets inside of React components, import via `require(@site/static/img/<file name>).default`.
