# Snip backend

A tiny URL shortener: a single-file Bun server (`server.js`) with zero npm dependencies. Links live in an in-memory `Map`, so a restart clears them.

## Run

```bash
bun start
```

## API

| Method | Path | Body | Response |
|--------|------|------|----------|
| `POST` | `/api/links` | `{ "url": "https://…" }` | `201` `{ code, url, shortUrl, hits, createdAt }` · `400` on invalid JSON or non-http(s) URL |
| `GET`  | `/api/links` | — | `200` array of all links |
| `GET`  | `/:code` | — | `302` to the original URL (+1 hit) · `404` if unknown |

CORS is open and `OPTIONS` preflight is handled.

## Environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `3000` | Listen port |
| `BASE_URL` | `https://$RAILWAY_PUBLIC_DOMAIN` if set, else `http://localhost:$PORT` | Origin used in `shortUrl` |
| `PUBLIC_DIR` | unset | When set, also serves static files from this folder (`/` → `index.html`); an existing file wins over a same-named short code |
