/**
 * Notion API client for Dance Planner.
 *
 * All requests go through the /api/notion/* Cloudflare Worker proxy because
 * the Notion API does not support browser CORS requests directly.
 *
 * Hierarchy maintained in Notion:
 *   Dance Planner Videos (user's root page)
 *   └── {Dance Style}  (e.g. "Zouk")
 *       └── {Package}  (e.g. "Wednesday Zouk · Maria")
 *           └── [video block] Class · Jan 15 2025
 */

import { DANCE_STYLES } from '../types'
import type { Package } from '../types'
import { format } from 'date-fns'

const NOTION_VERSION = '2022-06-28'

// In-memory cache: maps a cache key → Notion page ID
// Avoids redundant "list children" calls within a single session
const pageCache = new Map<string, string>()

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function headers(token: string, contentType = 'application/json'): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    'Notion-Version': NOTION_VERSION,
    'Content-Type': contentType,
  }
}

async function notionFetch(
  token: string,
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const resp = await fetch(`/api/notion${path}`, {
    ...options,
    headers: {
      ...headers(token),
      ...(options.headers ?? {}),
    },
  })
  if (!resp.ok) {
    const body = await resp.text()
    throw new Error(`Notion ${resp.status}: ${body}`)
  }
  return resp
}

/**
 * Derives the dance style from a package label by matching against
 * DANCE_STYLES. Falls back to "Other" if no known style is found.
 */
export function styleFromLabel(label: string): string {
  const lower = label.toLowerCase()
  const match = DANCE_STYLES.find(s => lower.includes(s.toLowerCase()))
  return match ?? 'Other'
}

// Emoji map for dance styles — purely decorative
const STYLE_EMOJI: Record<string, string> = {
  Zouk: '🕺',
  Salsa: '💃',
  Forró: '🤝',
  Bachata: '🌹',
  Samba: '🥁',
  Tango: '🎩',
  Ballroom: '✨',
  Contemporary: '🌊',
  Ballet: '🩰',
  Jazz: '🎷',
  'Hip-Hop': '🎤',
  Other: '📁',
}

// ---------------------------------------------------------------------------
// Page resolution helpers
// ---------------------------------------------------------------------------

/**
 * Returns all child pages of a Notion page as { id, title } pairs.
 */
async function listChildPages(
  token: string,
  pageId: string,
): Promise<Array<{ id: string; title: string }>> {
  const resp = await notionFetch(token, `/blocks/${pageId}/children?page_size=100`)
  const data = await resp.json() as {
    results: Array<{
      id: string
      type: string
      child_page?: { title: string }
    }>
  }
  return data.results
    .filter(b => b.type === 'child_page' && b.child_page)
    .map(b => ({ id: b.id, title: b.child_page!.title }))
}

/**
 * Creates a child page inside `parentPageId` with the given title and emoji.
 * Returns the new page's ID.
 */
async function createChildPage(
  token: string,
  parentPageId: string,
  title: string,
  emoji?: string,
): Promise<string> {
  const resp = await notionFetch(token, '/pages', {
    method: 'POST',
    body: JSON.stringify({
      parent: { page_id: parentPageId },
      icon: emoji ? { type: 'emoji', emoji } : undefined,
      properties: {
        title: {
          title: [{ type: 'text', text: { content: title } }],
        },
      },
    }),
  })
  const data = await resp.json() as { id: string }
  return data.id
}

// ---------------------------------------------------------------------------
// Public: page-tree helpers
// ---------------------------------------------------------------------------

/**
 * Gets (or creates) the style sub-page under the root page.
 * Result is cached in memory for the session.
 */
export async function ensureStylePage(
  token: string,
  rootPageId: string,
  style: string,
): Promise<string> {
  const cacheKey = `style:${rootPageId}:${style}`
  if (pageCache.has(cacheKey)) return pageCache.get(cacheKey)!

  const children = await listChildPages(token, rootPageId)
  const existing = children.find(c => c.title === style)
  const id = existing
    ? existing.id
    : await createChildPage(token, rootPageId, style, STYLE_EMOJI[style] ?? '📁')

  pageCache.set(cacheKey, id)
  return id
}

/**
 * Gets (or creates) the package sub-page under the style page.
 * Page title: "{pkg.label} · {pkg.instructorName}"
 */
export async function ensurePackagePage(
  token: string,
  stylePageId: string,
  pkg: Package,
): Promise<string> {
  const pageTitle = `${pkg.label} · ${pkg.instructorName}`
  const cacheKey = `pkg:${stylePageId}:${pkg.id}`
  if (pageCache.has(cacheKey)) return pageCache.get(cacheKey)!

  const children = await listChildPages(token, stylePageId)
  const existing = children.find(c => c.title === pageTitle)
  const id = existing
    ? existing.id
    : await createChildPage(token, stylePageId, pageTitle, '🎓')

  pageCache.set(cacheKey, id)
  return id
}

// ---------------------------------------------------------------------------
// Public: video upload
// ---------------------------------------------------------------------------

/**
 * Uploads a compressed video blob to Notion and appends it as a video block
 * to the package page.
 *
 * Steps:
 *   1. POST /file-uploads            → { id, upload_url }
 *   2. PUT  {upload_url}             → send the file bytes
 *   3. PATCH /blocks/{pageId}/children → append video block
 *
 * Returns the Notion block ID and a direct URL to the package page.
 */
export async function uploadVideoToPage(
  token: string,
  packagePageId: string,
  videoBlob: Blob,
  filename: string,
  attendedAt: Date,
): Promise<{ blockId: string; pageUrl: string }> {
  // Step 1 — create upload session
  const initResp = await notionFetch(token, '/file-uploads', {
    method: 'POST',
    body: JSON.stringify({
      content_type: 'video/mp4',
      name: filename,
    }),
  })
  const { id: fileUploadId, upload_url: uploadUrl } = await initResp.json() as {
    id: string
    upload_url: string
  }

  // Step 2 — send the actual bytes to the upload URL
  // The upload URL is external (not going through our proxy), so call it directly
  const form = new FormData()
  form.append('file', videoBlob, filename)
  const uploadResp = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Notion-Version': NOTION_VERSION,
    },
    body: form,
  })
  if (!uploadResp.ok) {
    const text = await uploadResp.text()
    throw new Error(`Notion file upload failed ${uploadResp.status}: ${text}`)
  }

  // Step 3 — append a video block to the package page
  const blockTitle = `Class · ${format(attendedAt, 'MMM d, yyyy')}`
  const appendResp = await notionFetch(token, `/blocks/${packagePageId}/children`, {
    method: 'PATCH',
    body: JSON.stringify({
      children: [
        {
          type: 'heading_3',
          heading_3: {
            rich_text: [{ type: 'text', text: { content: blockTitle } }],
          },
        },
        {
          type: 'video',
          video: {
            type: 'file_upload',
            file_upload: { id: fileUploadId },
          },
        },
      ],
    }),
  })
  const appendData = await appendResp.json() as {
    results: Array<{ id: string }>
  }
  // The video block is the second child appended
  const blockId = appendData.results[1]?.id ?? appendData.results[0]?.id

  const pageUrl = `https://notion.so/${packagePageId.replace(/-/g, '')}`
  return { blockId, pageUrl }
}

/**
 * Clears the in-memory page cache (call when the user disconnects Notion).
 */
export function clearNotionCache(): void {
  pageCache.clear()
}
