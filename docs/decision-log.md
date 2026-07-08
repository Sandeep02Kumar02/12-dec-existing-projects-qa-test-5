# Decision Log & Migration Traceability

This document is the **single source of truth for "why"** behind the enhancement of
`hao-backprop-test` from a raw Node.js `http` server into a production-ready Express.js
application. It exists to satisfy the project's **Explainability** rule, which requires that
every non-trivial implementation decision be recorded with rationale in a decision-log table
(never in code comments), and that a migration include a **bidirectional traceability matrix**
at 100% coverage.

The externally observable behavior of the original endpoint is preserved exactly: `GET /`
still returns HTTP `200`, `Content-Type: text/plain`, and the body `Hello, World!\n`.

## 1. Decision Log

| Decision | Alternatives Considered | Rationale | Risks |
|----------|-------------------------|-----------|-------|
| Adopt Express `^5.2.1` | Express 4.x; Koa; Fastify | Express 5 is the current default major (built-in body parsing, Router API) and Express was explicitly requested | v5 API differences vs v4; low risk given the trivial routes |
| Split `src/app.js` (Express app factory) from `server.js` (HTTP bootstrap) | Keep all logic in `server.js` | Conventional, testable structure; keeps the entry point thin and replaceable | Marginally more files; each module remains small |
| Use Morgan + Winston for logging | Morgan only; Pino | Morgan captures HTTP request logs while Winston provides leveled application logs with console + file transports; a conventional pairing | Two libraries; negligible overhead |
| Include `helmet`, `cors`, and `compression` middleware | Omit for ultra-minimalism | "add middleware" plus "prepare for production" reasonably encompass baseline security headers, CORS, and response compression | Mild scope expansion; flagged here so it can be dropped if undesired |
| Add a `GET /health` readiness route | Omit it | Standard readiness probe for PM2 / monitoring / production | One endpoint beyond the literal request; low risk |
| Keep route handlers inline (no controllers/services/models) | Full MVC layering | A single trivial endpoint; extra layering would violate the minimal-changes rule | Revisit if the application grows |
| Do **not** modify `README.md` | Add usage/deploy docs to `README.md` | Honors the "Do not touch!" guardrail in `README.md` and the minimal-changes rule | Usage/deploy notes are relocated to this decision log (see §3) |
| Set the PM2 `script` and `package.json` `main` to `server.js` | Introduce a new `index.js` entry point | Reconciles the pre-existing `main` mismatch (it pointed at a nonexistent `index.js`) to a real file | None significant |
| Default `HOST=127.0.0.1` (production `0.0.0.0` via PM2 `env_production`) | Always bind `0.0.0.0` | Preserves the original development bind of the source server | Production exposure requires the override to be set intentionally |
| Regenerate `package-lock.json` via `npm install` | Hand-edit the lockfile | Correctness — the package manager owns the resolved dependency tree | None |

## 2. Bidirectional Traceability Matrix (raw `http` → Express)

This matrix demonstrates **100% coverage** of the original `server.js` constructs, mapping each
source construct to the target implementation that replaces it.

| Source Construct (`server.js`) | Target Implementation |
|--------------------------------|-----------------------|
| `const http = require('http')` (L1) | `require('express')` in `src/app.js`; `require('./src/app')` in `server.js` |
| `hostname = '127.0.0.1'`, `port = 3000` (L3-L4) | `config.host`, `config.port` in `src/config/index.js` (defaults preserve the values) |
| `http.createServer((req, res) => { ... })` (L6) | `express()` app + `express.Router()` in `src/routes/index.js` |
| `res.statusCode = 200` (L7) | `res.status(200)` in the `GET /` handler |
| `res.setHeader('Content-Type', 'text/plain')` (L8) | `res.type('text/plain')` in the `GET /` handler |
| `res.end('Hello, World!\n')` (L9) | `res.send('Hello, World!\n')` in the `GET /` handler |
| `server.listen(port, hostname, cb)` (L12) | `app.listen(config.port, config.host, cb)` in `server.js` |
| `console.log('Server running at ...')` (L13) | `logger.info('Server running at ...')` via Winston |

## 3. Run & Deploy Notes

> These notes live here rather than in `README.md`, which is intentionally left unmodified per
> its "Do not touch!" guardrail.

### Prerequisites

- Node.js `>=18` (the environment provides v22.x) and npm.

### Environment configuration

- Copy the committed template to a local `.env`: `cp .env.example .env`.
- `.env` is **never committed** — it is git-ignored; only `.env.example` is tracked in version control.
- Variables: `NODE_ENV`, `PORT` (default `3000`), `HOST` (default `127.0.0.1`), and `LOG_LEVEL`
  (default `info`). All have safe defaults, so a missing `.env` is tolerated at runtime.

### Install

```bash
npm install
```

### Run locally

```bash
npm start      # node server.js
npm run dev    # NODE_ENV=development node server.js
```

The server binds to `http://127.0.0.1:3000/` by default. Verify the preserved contract and the
new readiness probe:

```bash
curl -i http://127.0.0.1:3000/         # 200, Content-Type: text/plain, body "Hello, World!"
curl -i http://127.0.0.1:3000/health   # JSON readiness status
```

### Deploy with PM2

```bash
npm run prod     # pm2 start ecosystem.config.js --env production
npm run reload   # pm2 reload ecosystem.config.js --env production  (zero-downtime reload)
npm run logs     # pm2 logs
```

PM2 runs the application in cluster mode (`instances: 'max'`), and the `env_production` block
overrides `HOST` to `0.0.0.0` for external exposure. Log output is written under `logs/`
(git-ignored; the directory itself is preserved by the tracked `logs/.gitkeep` placeholder).
