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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return env.ASSETS.fetch(request)
  },
}
