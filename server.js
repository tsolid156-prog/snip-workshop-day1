import { statSync } from "node:fs";
import { join, resolve, sep } from "node:path";

const PORT = Number(process.env.PORT) || 3000;
const BASE_URL = (
  process.env.BASE_URL ||
  (process.env.RAILWAY_PUBLIC_DOMAIN
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
    : `http://localhost:${PORT}`)
).replace(/\/+$/, "");
const PUBLIC_DIR = process.env.PUBLIC_DIR ? resolve(process.env.PUBLIC_DIR) : null;

const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const links = new Map();

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(body, status = 200) {
  return Response.json(body, { status, headers: CORS });
}

function randomCode() {
  let code = "";
  while (code.length < 6) {
    const bytes = crypto.getRandomValues(new Uint8Array(12));
    for (const b of bytes) {
      // 248 = 62 * 4; reject higher values to avoid modulo bias
      if (b < 248 && code.length < 6) code += ALPHABET[b % 62];
    }
  }
  return code;
}

function newCode() {
  let code;
  do code = randomCode();
  while (links.has(code));
  return code;
}

function isHttpUrl(value) {
  if (typeof value !== "string") return false;
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

function staticFile(pathname) {
  if (!PUBLIC_DIR) return null;
  let rel;
  try {
    rel = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (rel === "/") rel = "/index.html";
  const full = resolve(join(PUBLIC_DIR, rel));
  if (!full.startsWith(PUBLIC_DIR + sep)) return null;
  try {
    return statSync(full).isFile() ? Bun.file(full) : null;
  } catch {
    return null;
  }
}

async function createLink(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  if (!body || !isHttpUrl(body.url)) {
    return json({ error: "url must be a valid http(s) URL" }, 400);
  }
  const code = newCode();
  const link = {
    code,
    url: body.url,
    shortUrl: `${BASE_URL}/${code}`,
    hits: 0,
    createdAt: new Date().toISOString(),
  };
  links.set(code, link);
  return json(link, 201);
}

Bun.serve({
  port: PORT,
  async fetch(req) {
    const { pathname } = new URL(req.url);

    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }

    if (pathname === "/api/links") {
      if (req.method === "POST") return createLink(req);
      if (req.method === "GET") return json([...links.values()]);
      return json({ error: "Method not allowed" }, 405);
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
      return json({ error: "Method not allowed" }, 405);
    }

    // Static files take precedence over short codes.
    const file = staticFile(pathname);
    if (file) return new Response(file, { headers: CORS });

    const link = links.get(pathname.slice(1));
    if (link) {
      link.hits += 1;
      return new Response(null, {
        status: 302,
        headers: { ...CORS, Location: link.url },
      });
    }

    return json({ error: "Not found" }, 404);
  },
});

console.log(`Snip listening on port ${PORT} (${BASE_URL})`);
