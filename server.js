/**
 * server.js — Express Application with Comprehensive Security Middleware Stack
 *
 * This server replaces the original bare Node.js HTTP server implementation with
 * an Express-based application featuring defense-in-depth security controls:
 *
 *   - Helmet.js:          13 HTTP security response headers (CWE-693 mitigation)
 *   - CORS middleware:     Configurable cross-origin resource sharing (CWE-942 mitigation)
 *   - express-rate-limit:  IP-based request throttling (CWE-770 mitigation)
 *   - express-validator:   Request input validation and sanitization (CWE-20 mitigation)
 *   - HTTPS support:       Optional TLS encryption via Node.js https module (CWE-319 mitigation)
 *
 * Configuration is driven by environment variables with sensible defaults.
 * The GET / endpoint returns "Hello, World!\n" for backward compatibility.
 */

// --- External Dependencies (npm packages) ---
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { rateLimit } = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

// --- Node.js Built-in Modules (used conditionally for HTTPS) ---
const https = require('https');
const fs = require('fs');

// --- Express Application Instance ---
const app = express();

// --- Configuration via Environment Variables with Defaults ---
const HOST = process.env.HOST || '0.0.0.0';
const PORT = process.env.PORT || 3000;
const HTTPS_PORT = process.env.HTTPS_PORT || 3443;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

// =============================================================================
// MIDDLEWARE STACK — Applied in strict order per security best practices:
//   1. Helmet (security headers)
//   2. CORS (cross-origin policy)
//   3. Rate Limiter (request throttling)
//   4. Body Parser (JSON parsing for validation)
// =============================================================================

/**
 * 1. Helmet — Security Headers (FIRST)
 *
 * Automatically sets 13 HTTP security response headers including:
 *   Content-Security-Policy, Cross-Origin-Opener-Policy, Cross-Origin-Resource-Policy,
 *   Origin-Agent-Cluster, Referrer-Policy, Strict-Transport-Security,
 *   X-Content-Type-Options, X-DNS-Prefetch-Control, X-Download-Options,
 *   X-Frame-Options, X-Permitted-Cross-Domain-Policies, X-XSS-Protection (disabled).
 * Also removes the X-Powered-By header.
 *
 * Applied first so every response (including errors) includes security headers.
 */
app.use(helmet());

/**
 * 2. CORS — Cross-Origin Resource Sharing Policy (SECOND)
 *
 * Enforces a configurable origin whitelist. In development, CORS_ORIGIN defaults
 * to '*' (all origins). In production, set CORS_ORIGIN to specific allowed origins.
 * Allowed methods are restricted to GET, POST, and OPTIONS.
 * Allowed headers are restricted to Content-Type and Authorization.
 */
app.use(cors({
  origin: CORS_ORIGIN,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

/**
 * 3. Rate Limiter — IP-Based Request Throttling (THIRD)
 *
 * Limits each IP address to 100 requests per 15-minute window.
 * Uses the IETF draft-8 standard RateLimit header format.
 * Legacy X-RateLimit-* headers are disabled.
 *
 * Runs after CORS so disallowed origins are rejected before rate accounting,
 * and before route handlers so excessive requests are blocked early.
 */
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15-minute window
  max: 100,                     // Maximum 100 requests per window per IP
  standardHeaders: 'draft-8',  // IETF draft-8 RateLimit combined header
  legacyHeaders: false          // Disable deprecated X-RateLimit-* headers
});
app.use(limiter);

/**
 * 4. Body Parser — JSON Request Body Parsing (FOURTH)
 *
 * Parses incoming JSON request bodies (Content-Type: application/json)
 * and populates req.body. Required before express-validator can validate
 * request body fields.
 */
app.use(express.json());

// =============================================================================
// ROUTE HANDLERS
// =============================================================================

/**
 * GET / — Root Endpoint (Backward Compatible)
 *
 * Returns the original "Hello, World!\n" response with status 200 and
 * Content-Type text/plain. This preserves the behavior of the original
 * bare Node.js HTTP server implementation.
 */
app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.status(200).send('Hello, World!\n');
});

/**
 * POST /data — Sample Endpoint with Input Validation
 *
 * Demonstrates express-validator integration for request body validation:
 *   - name:  optional string, trimmed and HTML-escaped
 *   - email: optional, must be valid email format, normalized
 *   - value: optional, must be numeric
 *
 * Returns 400 with structured validation errors for invalid data.
 * Returns 200 with success status and validated data for valid requests.
 */
app.post('/data',
  [
    body('name').optional().isString().trim().escape(),
    body('email').optional().isEmail().normalizeEmail(),
    body('value').optional().isNumeric()
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    res.status(200).json({ status: 'success', data: req.body });
  }
);

// =============================================================================
// ERROR HANDLING MIDDLEWARE — Must be the LAST middleware registered
// =============================================================================

/**
 * Centralized Error Handler
 *
 * Catches all unhandled errors propagated through the middleware chain.
 * Logs the error stack for debugging and returns a safe generic error
 * response to the client. The 4-parameter signature (err, req, res, next)
 * is required for Express to identify this as an error-handling middleware.
 */
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

// =============================================================================
// SERVER STARTUP — HTTP (always) + HTTPS (conditional on TLS certificates)
// =============================================================================

/**
 * HTTP Server
 *
 * Starts listening on the configured HOST and PORT (defaults: 0.0.0.0:3000).
 * Express internally creates an http.Server instance via app.listen().
 */
app.listen(PORT, HOST, () => {
  console.log(`HTTP Server running at http://${HOST}:${PORT}/`);
});

/**
 * HTTPS Server (Conditional)
 *
 * If SSL_KEY_PATH and SSL_CERT_PATH environment variables are both set,
 * an HTTPS server is created using Node.js built-in https module with
 * the Express app as the request handler. Runs on HTTPS_PORT (default: 3443)
 * alongside the HTTP server.
 *
 * To enable: set SSL_KEY_PATH and SSL_CERT_PATH to valid TLS file paths.
 * If not set, the server operates in HTTP-only mode.
 */
if (process.env.SSL_KEY_PATH && process.env.SSL_CERT_PATH) {
  const sslOptions = {
    key: fs.readFileSync(process.env.SSL_KEY_PATH),
    cert: fs.readFileSync(process.env.SSL_CERT_PATH)
  };
  https.createServer(sslOptions, app).listen(HTTPS_PORT, HOST, () => {
    console.log(`HTTPS Server running at https://${HOST}:${HTTPS_PORT}/`);
  });
}
