'use strict';

const { BASE_URL } = require('../../config/env');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36';

function generateDid() {
  return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

// Fungsi ringan untuk Vercel tanpa memanggil Puppeteer / Stealth API Eksternal
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

async function getCookieHeader() {
  // Di mode serverless Vercel, kita buat cookie tiruan agar IDLIX tidak menolak request
  const did = process.env.DID || generateDid();
  const locale = process.env.NEXT_LOCALE || 'en';
  const cf = process.env.CF_CLEARANCE ? `cf_clearance=${process.env.CF_CLEARANCE}; ` : '';
  return `${cf}did=${did}; NEXT_LOCALE=${locale}`;
}

// Ekspor dummy invalidate agar fungsi lama yang memanggil ini tidak error
async function invalidate() {
  return Promise.resolve();
}

module.exports = { browserFetch, fetchHtml, getCookieHeader, invalidate };
