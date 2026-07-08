# Decision Log & Migration Traceability

This document is the **single source of truth for "why"** behind the enhancement of
`hao-backprop-test` from a raw Node.js `http` server into a production-ready Express.js
application. It exists to satisfy the project's **Explainability** rule, which requires that
every non-trivial implementation decision be recorded with rationale in a decision-log table
(never in code comments), and that a migration include a **bidirectional traceability matrix**
at 100% coverage.

The externally observable behavior of the original endpoint is preserved exactly, byte-for-byte:
`GET /` still returns HTTP `200`, the exact header `Content-Type: text/plain` (with no `charset`
suffix), and the body `Hello, World!\n`. This exact fidelity is achieved by reproducing the
original raw response calls (`res.statusCode` / `res.setHeader` / `res.end`) in the routed handler;
see the decision log below for why Express's `res.type()`/`res.send()` helpers are deliberately avoided.

## 1. Decision Log

| Decision | Alternatives Considered | Rationale | Risks |
|----------|-------------------------|-----------|-------|
| Adopt Express `^5.2.1` | Express 4.x; Koa; Fastify | Express 5 is the current default major (built-in body parsing, Router API) and Express was explicitly requested | v5 API differences vs v4; low risk given the trivial routes |
| Split `src/app.js` (Express app factory) from `server.js` (HTTP bootstrap) | Keep all logic in `server.js` | Conventional, testable structure; keeps the entry point thin and replaceable | Marginally more files; each module remains small |
| Use Morgan + Winston for logging | Morgan only; Pino | Morgan captures HTTP request logs while Winston provides leveled application logs with console + file transports; a conventional pairing | Two libraries; negligible overhead |
| Include `helmet`, `cors`, and `compression` middleware | Omit for ultra-minimalism | "add middleware" plus "prepare for production" reasonably encompass baseline security headers, CORS, and response compression | Mild scope expansion; flagged here so it can be dropped if undesired |
| Add a `GET /health` readiness route | Omit it | Standard readiness probe for PM2 / monitoring / production | One endpoint beyond the literal request; low risk |
| Preserve `GET /` using the raw response methods (`res.statusCode` / `res.setHeader` / `res.end`) | Express helpers `res.type('text/plain')` + `res.send('Hello, World!\n')`, or `res.set('Content-Type', 'text/plain')` | In Express 5, `res.type()`, `res.send()`, and `res.set()` all append `; charset=utf-8` to a `text/plain` Content-Type, yielding `text/plain; charset=utf-8` and breaking the mandatory byte-for-byte contract (AAP §0.8.1, §0.5.3). Reproducing the original `server.js` raw calls (L7-L9) verbatim yields the exact header `Content-Type: text/plain` and body `Hello, World!\n` | Slightly less idiomatic than the Express helpers; negligible given the single trivial legacy route |
| Keep route handlers inline (no controllers/services/models) | Full MVC layering | A single trivial endpoint; extra layering would violate the minimal-changes rule | Revisit if the application grows |
| Do **not** modify `README.md` | Add usage/deploy docs to `README.md` | Honors the "Do not touch!" guardrail in `README.md` and the minimal-changes rule | Usage/deploy notes are relocated to this decision log (see §3) |
| Set the PM2 `script` and `package.json` `main` to `server.js` | Introduce a new `index.js` entry point | Reconciles the pre-existing `main` mismatch (it pointed at a nonexistent `index.js`) to a real file | None significant |
| Default `HOST=127.0.0.1` (production `0.0.0.0` via PM2 `env_production`) | Always bind `0.0.0.0` | Preserves the original development bind of the source server | Production exposure requires the override to be set intentionally |
| Regenerate `package-lock.json` via `npm install` | Hand-edit the lockfile | Correctness — the package manager owns the resolved dependency tree | None |
| Simplify the `dev` npm script to `node server.js` | Keep `NODE_ENV=development node server.js` (POSIX-only inline env var); add a `cross-env` devDependency; add a JS launcher script | The POSIX inline `VAR=value` form fails on the Windows/PowerShell shell that npm uses on the target host, so the documented dev command did not run there. `src/config/index.js` already defaults `NODE_ENV` to `development` when it is unset, so a plain `node server.js` runs in development mode on every platform. `cross-env` and a launcher file were rejected to honor the Make-minimal-changes rule and the fixed dependency set (AAP 0.4 / 0.3.2); no new dependency or file is introduced | `dev` and `start` are now identical; acceptable for a single trivial service and can diverge later if a file watcher is added |
| Add `merge_logs: true` to the PM2 `apps[0]` config | Omit it (accept per-instance suffixed logs); install `pm2-logrotate`; post-process/concatenate the per-instance files | In `cluster` mode PM2 appends the worker instance id to `out_file`/`error_file` (producing `pm2-out-0.log` through `pm2-out-N.log`) unless `merge_logs: true` is set, so the declared unsuffixed `logs/pm2-out.log` / `logs/pm2-error.log` never materialize and any log shipper, rotation rule, or monitoring targeting those declared paths finds nothing. `merge_logs: true` merges every worker stream into the single declared files, fulfilling the AAP §0.6.1 "log files" contract (declared files created and written) while leaving the already-correct `log_date_format` and write behavior unchanged | None significant; `merge_logs: true` is the standard PM2 practice for a single declared log destination in cluster mode |
| Load dotenv quietly (`dotenv.config({ quiet: true })`) | Keep the default dotenv v17 startup banner/tips; set `DOTENV_CONFIG_QUIET=true` only through the PM2 environment; pin an older dotenv without the banner | dotenv v17 prints an unstructured promotional banner/tip line (rotating text that can include the words "secrets"/"auth") to stdout on every `config()` call; under the PM2 cluster it is captured into `logs/pm2-out.log` once per worker, polluting the structured Winston/Morgan stream and matching a secret-keyword (password / secret / token / key) log scan even though no real secret is exposed. `{ quiet: true }` (supported by the pinned dotenv 17.4.2) suppresses only the banner while still loading variables, so setting it in `src/config/index.js` cleans both the direct (`node server.js`) and PM2 runtimes at the source | None significant; the banner is cosmetic and its removal does not affect variable loading or the missing-`.env` tolerance |
| Exclude query strings from the 404 `path` field and from Morgan access logs | Reflect the full `req.originalUrl` (with query string) as before; redact only specific sensitive parameter values; drop the `path` field and the request URL from logs entirely | Reflecting `req.originalUrl` in the 404 body and logging the full request URL via `morgan('combined')` persisted client-supplied query parameters (e.g. `?token=...&password=...`) into API responses and `logs/combined.log`, exposing sensitive-looking data and failing the delivery-gate secret-keyword (password / secret / token / key) log scan. The 404 handler now returns `req.path` and Morgan's `:url` token is redacted to drop the query string, removing this accidental-secret vector from both responses and logs while preserving method, path, status, referrer and user-agent in the Apache combined layout; value-only redaction was rejected because the scan also matches parameter names | Access logs and 404 bodies no longer include query strings — acceptable for a public read-only service and revisitable with targeted redaction if query observability is later required |

## 2. Bidirectional Traceability Matrix (raw `http` → Express)

This matrix demonstrates **100% coverage** of the original `server.js` constructs, mapping each
source construct to the target implementation that replaces it.

| Source Construct (`server.js`) | Target Implementation |
|--------------------------------|-----------------------|
| `const http = require('http')` (L1) | `require('express')` in `src/app.js`; `require('./src/app')` in `server.js` |
| `hostname = '127.0.0.1'`, `port = 3000` (L3-L4) | `config.host`, `config.port` in `src/config/index.js` (defaults preserve the values) |
| `http.createServer((req, res) => { ... })` (L6) | `express()` app + `express.Router()` in `src/routes/index.js` |
| `res.statusCode = 200` (L7) | `res.statusCode = 200` in the `GET /` handler (preserved verbatim) |
| `res.setHeader('Content-Type', 'text/plain')` (L8) | `res.setHeader('Content-Type', 'text/plain')` in the `GET /` handler (raw Node method; avoids the `; charset=utf-8` that Express's `res.type()`/`res.send()` would append) |
| `res.end('Hello, World!\n')` (L9) | `res.end('Hello, World!\n')` in the `GET /` handler (raw Node method; no `res.send()` body mutation) |
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
npm run dev    # node server.js  (NODE_ENV defaults to development)
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
