/**
 * Cloudflare Worker — SPA asset server
 *
 * Serves all requests from the Workers Assets binding (the built SPA).
 * Adds COOP/COEP headers on every response so SharedArrayBuffer is available
 * for FFmpeg.wasm in the browser.
 */

interface Env {
  ASSETS: Fetcher
}

const COOP_COEP: HeadersInit = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
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
