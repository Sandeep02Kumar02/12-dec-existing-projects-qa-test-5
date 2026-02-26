# hao-backprop-test
test project for backprop integration. Do not touch!

## Security Features

This server is hardened with a comprehensive security middleware stack built on [Express.js](https://expressjs.com/) (v4.21.2):

- **Helmet.js** (v8.1.0) — Sets 13 HTTP security response headers automatically, including Content-Security-Policy, Strict-Transport-Security, X-Content-Type-Options, X-Frame-Options, and Referrer-Policy. Removes the `X-Powered-By` header to prevent server fingerprinting.
- **CORS** (v2.8.6) — Configurable Cross-Origin Resource Sharing policy with origin whitelist. Allowed methods: GET, POST, OPTIONS. Allowed headers: Content-Type, Authorization. Supports preflight handling for complex requests.
- **Rate Limiting** (v8.2.1) — IP-based request throttling with a default of 100 requests per 15-minute window per IP. Sends IETF-standard `RateLimit` headers in every response.
- **Input Validation** (v7.3.1) — Request body validation and sanitization via express-validator. Returns structured error messages for invalid input.
- **HTTPS/TLS Support** — Optional HTTPS server on port 3443 via the Node.js built-in `https` module with configurable TLS certificate paths.

## Getting Started

```bash
# Install all dependencies
npm install

# Start HTTP server on port 3000
npm start

# Start with HTTPS support (requires TLS certificates)
npm run start:https
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `HOST` | `0.0.0.0` | Server bind address |
| `PORT` | `3000` | HTTP server port |
| `HTTPS_PORT` | `3443` | HTTPS server port |
| `CORS_ORIGIN` | `*` | Allowed CORS origin(s) — set to specific origins in production |
| `SSL_CERT_PATH` | None | Path to TLS certificate file (enables HTTPS when set) |
| `SSL_KEY_PATH` | None | Path to TLS private key file (enables HTTPS when set) |

## Security Headers

The following 13 HTTP headers are managed by Helmet.js:

1. Content-Security-Policy
2. Cross-Origin-Opener-Policy
3. Cross-Origin-Resource-Policy
4. Origin-Agent-Cluster
5. Referrer-Policy
6. Strict-Transport-Security
7. X-Content-Type-Options
8. X-DNS-Prefetch-Control
9. X-Download-Options
10. X-Frame-Options
11. X-Permitted-Cross-Domain-Policies
12. X-Powered-By *(removed)*
13. X-XSS-Protection

## Security Verification

```bash
# Check security headers in the HTTP response
curl -sI http://localhost:3000/

# Run dependency vulnerability scan
npm audit
```
