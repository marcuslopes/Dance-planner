/**
 * Cloudflare Worker — Notion API CORS proxy
 *
 * Routes all /api/notion/* requests to https://api.notion.com/v1/*
 * and adds the CORS + SharedArrayBuffer headers needed by the React app.
 */

const ALLOWED_ORIGIN = '*'

function corsHeaders(): HeadersInit {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Max-Age': '86400',
    // Required for SharedArrayBuffer (FFmpeg.wasm)
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp',
  }
}

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() })
    }

    if (!url.pathname.startsWith('/api/notion/')) {
      return new Response('Not found', { status: 404 })
    }

    // Map /api/notion/<path> → https://api.notion.com/v1/<path>
    const notionPath = url.pathname.slice('/api/notion'.length)
    const notionUrl = `https://api.notion.com/v1${notionPath}${url.search}`

    // Forward request to Notion, preserving method/headers/body
    const upstreamRequest = new Request(notionUrl, {
      method: request.method,
      headers: request.headers,
      body: ['GET', 'HEAD'].includes(request.method) ? null : request.body,
    })

    let upstreamResp: Response
    try {
      upstreamResp = await fetch(upstreamRequest)
    } catch (err) {
      return new Response(
        JSON.stringify({ error: 'Failed to reach Notion API', detail: String(err) }),
        { status: 502, headers: { 'Content-Type': 'application/json', ...corsHeaders() } },
      )
    }

    // Merge upstream headers with our CORS additions
    const responseHeaders: Record<string, string> = {}
    upstreamResp.headers.forEach((value, key) => {
      responseHeaders[key] = value
    })
    Object.assign(responseHeaders, corsHeaders())

    return new Response(upstreamResp.body, {
      status: upstreamResp.status,
      statusText: upstreamResp.statusText,
      headers: responseHeaders,
    })
  },
}
