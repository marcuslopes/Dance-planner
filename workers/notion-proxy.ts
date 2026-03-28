/**
 * Cloudflare Worker — Notion API CORS proxy + SPA asset server
 *
 * - Routes /api/notion/* to https://api.notion.com/v1/*
 * - Serves all other requests from the Workers Assets binding (the built SPA)
 * - Adds COOP/COEP headers on every response so SharedArrayBuffer is available
 *   for FFmpeg.wasm in the browser
 */

interface Env {
  ASSETS: Fetcher
}

const COOP_COEP: HeadersInit = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
}

function corsHeaders(): HeadersInit {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Max-Age': '86400',
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    // ── Notion API proxy ──────────────────────────────────────────────────────

    if (url.pathname.startsWith('/api/notion/')) {
      // CORS preflight
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: { ...corsHeaders(), ...COOP_COEP } })
      }

      const notionPath = url.pathname.slice('/api/notion'.length)
      const notionUrl = `https://api.notion.com/v1${notionPath}${url.search}`

      let upstreamResp: Response
      try {
        upstreamResp = await fetch(notionUrl, {
          method: request.method,
          headers: request.headers,
          body: ['GET', 'HEAD'].includes(request.method) ? null : request.body,
        })
      } catch (err) {
        return new Response(
          JSON.stringify({ error: 'Failed to reach Notion API', detail: String(err) }),
          { status: 502, headers: { 'Content-Type': 'application/json', ...corsHeaders(), ...COOP_COEP } },
        )
      }

      const responseHeaders: Record<string, string> = {}
      upstreamResp.headers.forEach((value, key) => { responseHeaders[key] = value })
      Object.assign(responseHeaders, corsHeaders(), COOP_COEP)

      return new Response(upstreamResp.body, {
        status: upstreamResp.status,
        statusText: upstreamResp.statusText,
        headers: responseHeaders,
      })
    }

    // ── Static SPA assets — add COOP/COEP headers ────────────────────────────

    const assetResp = await env.ASSETS.fetch(request)

    // Clone the response to add our security headers
    const newHeaders = new Headers(assetResp.headers)
    for (const [k, v] of Object.entries(COOP_COEP)) {
      newHeaders.set(k, v)
    }

    return new Response(assetResp.body, {
      status: assetResp.status,
      statusText: assetResp.statusText,
      headers: newHeaders,
    })
  },
}
