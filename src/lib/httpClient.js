'use strict';

// Ambil BASE_URL dari environment Vercel, fallback ke URL default
const BASE_URL = process.env.BASE_URL || 'https://z2.idlixku.com';

const { getStreamData, getEpisodeStreamData } = require('./streamClient');

// ─── Lightweight Fetch (Pengganti cookieHarvester yang bikin error) ───
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36';

async function browserFetch(url, { method = 'GET', body, headers = {} } = {}) {
  try {
    const opts = {
      method,
      headers: {
        'User-Agent': UA,
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
        'Referer': BASE_URL,
        'Cache-Control': 'no-cache',
        ...headers,
      },
    };
    if (body !== undefined) opts.body = body;

    const res = await fetch(url, opts);
    const text = await res.text();
    return { status: res.status, ok: res.ok, text };
  } catch (err) {
    console.error(`[browserFetch] Fetch error on ${url}:`, err.message);
    return { status: 500, ok: false, text: err.message };
  }
}

async function fetchHtml(url) {
  const res = await browserFetch(url, {
    headers: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    }
  });
  if (!res.ok) {
    console.warn(`[browserFetch] fetchHtml warning: HTTP ${res.status} on ${url}`);
  }
  return res.text || '';
}
// ──────────────────────────────────────────────────────────────────────

// In-flight deduplication cache
const _pendingRequests = new Map();

function deduplicatedFetch(key, fn) {
  if (_pendingRequests.has(key)) {
    return _pendingRequests.get(key);
  }

  const promise = (async () => {
    try {
      return await fn();
    } finally {
      _pendingRequests.delete(key);
    }
  })();

  _pendingRequests.set(key, promise);
  return promise;
}

// ── Public API ──────────────────────────────────────────────────────────────────

const httpClient = {
  async get(path) {
    const url = `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
    return deduplicatedFetch(`html:${url}`, async () => {
      const data = await fetchHtml(url);
      return { data };
    });
  },

  async getJson(path) {
    const url = `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
    return deduplicatedFetch(`json:${url}`, async () => {
      const res = await browserFetch(url, {
        headers: { accept: 'application/json' },
      });
      if (!res.ok) return null;
      try { return JSON.parse(res.text); } catch (_) { return null; }
    });
  },

  async getStreamData(slug) {
    return getStreamData(slug);
  },

  async getEpisodeStreamData(slug, season, episode) {
    return getEpisodeStreamData(slug, season, episode);
  },

  async close() {}
};

module.exports = httpClient;
