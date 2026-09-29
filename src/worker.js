/**
 * Worker entry point. run_worker_first is enabled in wrangler.toml, so every
 * request lands here before any static asset is served. That lets us gate
 * /docs/* behind signed, expiring links (and watermark the PDF per requester
 * on the way out) and block hotlinked /media/* requests, while everything
 * else falls through to the static assets untouched.
 */

import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';

const ALLOWED_ORIGINS = [
  'https://themotorlist.ge',
  'https://tmlg-webapp.midjnur.workers.dev',
];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/documents') {
      return handleDocumentRequest(request, env);
    }

    if (url.pathname.startsWith('/docs/')) {
      return handleDocumentDownload(request, url, env);
    }

    if (url.pathname.startsWith('/media/')) {
      const referer = request.headers.get('Referer');
      if (!isAllowedReferer(referer)) {
        return new Response('Forbidden', { status: 403 });
      }
    }

    return env.ASSETS.fetch(request);
  },
};

function isAllowedReferer(referer) {
  if (!referer) return false;
  try {
    return ALLOWED_ORIGINS.includes(new URL(referer).origin);
  } catch {
    return false;
  }
}

/* ---------------- signed document links ---------------- */

async function hmac(secret, message) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function signDocPath(path, email, secret, ttlSeconds = 60 * 60 * 24) {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const sig = await hmac(secret, `${path}:${email}:${exp}`);
  return { exp, sig };
}

async function verifyDocRequest(url, secret) {
  const exp = Number(url.searchParams.get('exp'));
  const sig = url.searchParams.get('sig');
  const email = url.searchParams.get('email') || '';
  if (!exp || !sig) return { valid: false, email: '' };
  if (Date.now() / 1000 > exp) return { valid: false, email: '' };
  const expected = await hmac(secret, `${url.pathname}:${email}:${exp}`);
  return { valid: timingSafeEqual(sig, expected), email };
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function handleDocumentDownload(request, url, env) {
  if (!env.DOC_TOKEN_SECRET) {
    return new Response('Not configured', { status: 500 });
  }
  const { valid, email } = await verifyDocRequest(url, env.DOC_TOKEN_SECRET);
  if (!valid) {
    return new Response('This link is invalid or has expired. Request the documents again from themotorlist.ge.', {
      status: 403,
    });
  }

  const assetResponse = await env.ASSETS.fetch(new Request(url.origin + url.pathname, request));
  if (!assetResponse.ok || !url.pathname.toLowerCase().endsWith('.pdf')) {
    return assetResponse;
  }

  try {
    const watermarked = await watermarkPdf(await assetResponse.arrayBuffer(), email);
    return new Response(watermarked, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${url.pathname.split('/').pop()}"`,
      },
    });
  } catch (error) {
    console.error('PDF watermarking failed, serving original:', error);
    return assetResponse;
  }
}

async function watermarkPdf(bytes, email) {
  const pdfDoc = await PDFDocument.load(bytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();
  const stamp = `Prepared for ${email || 'requester'} · themotorlist.ge · ${new Date().toISOString().slice(0, 10)}`;

  for (const page of pages) {
    const { width, height } = page.getSize();
    page.drawText(stamp, {
      x: 24,
      y: 16,
      size: 9,
      font,
      color: rgb(0.55, 0.55, 0.55),
      opacity: 0.85,
    });
    // faint diagonal repeat across the page so a crop can't remove the footer alone
    page.drawText('themotorlist.ge', {
      x: width / 2 - 90,
      y: height / 2,
      size: 40,
      font,
      color: rgb(0.5, 0.5, 0.5),
      opacity: 0.08,
      rotate: degrees(35),
    });
  }

  return pdfDoc.save();
}

/* ---------------- document request + email ---------------- */

async function handleDocumentRequest(request, env) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { email, carId, name, files } = await request.json();

    if (!email || !carId) {
      return new Response(
        JSON.stringify({ error: 'Missing email or carId' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const db = env.DB;
    const timestamp = new Date().toISOString();

    await db
      .prepare(
        `INSERT INTO document_requests (email, car_id, visitor_name, created_at)
         VALUES (?, ?, ?, ?)`
      )
      .bind(email, carId, name || 'Anonymous', timestamp)
      .run();

    const signedDocs = await signRequestedFiles(files, email, env);

    if (env.RESEND_API_KEY) {
      await sendConfirmationEmail(email, carId, signedDocs, env.RESEND_API_KEY);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Request received. Check your email for documents.',
        documents: signedDocs,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process request' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// files: array of relative paths like "docs/CAR0000001/MB-GLS450d.pdf",
// as embedded in the page's own data. Only ever sign paths under docs/ —
// anything else is ignored so this can't be used to sign arbitrary assets.
async function signRequestedFiles(files, email, env) {
  if (!Array.isArray(files) || !env.DOC_TOKEN_SECRET) return [];
  const out = [];
  for (const f of files) {
    if (typeof f !== 'string') continue;
    const path = '/' + f.replace(/^\/+/, '');
    if (!path.startsWith('/docs/') || path.includes('..')) continue;
    const { exp, sig } = await signDocPath(path, email, env.DOC_TOKEN_SECRET);
    out.push({
      path: f.replace(/^\/+/, ''),
      url: `${path}?email=${encodeURIComponent(email)}&exp=${exp}&sig=${sig}`,
    });
  }
  return out;
}

async function sendConfirmationEmail(email, carId, signedDocs, apiKey) {
  try {
    const links = signedDocs
      .map((d) => `<li><a href="https://themotorlist.ge${d.url}">${d.path.split('/').pop()}</a></li>`)
      .join('');
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: 'noreply@themotorlist.ge',
        to: email,
        subject: `Your car documents from TMLG`,
        html: `
          <h2>Thank you for your interest!</h2>
          <p>We've received your document request for car <strong>${carId}</strong>.</p>
          ${links ? `<p>Your documents (links expire in 24 hours):</p><ul>${links}</ul>` : ''}
          <p>The seller will send you detailed information within 24 hours.</p>
          <hr />
          <p><a href="https://themotorlist.ge">Back to themotorlist.ge</a></p>
        `,
      }),
    });

    if (!response.ok) {
      console.error('Resend API error:', await response.text());
    }
  } catch (error) {
    console.error('Email sending failed (non-blocking):', error);
  }
}
