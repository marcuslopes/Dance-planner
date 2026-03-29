import { useEffect, useRef, useState, useCallback } from 'react'
import { useAppStore } from '../store/appStore'
import { format } from 'date-fns'
import { Search, X } from 'lucide-react'

const STORAGE_KEY = 'passinho-recent-searches'
const MAX_RECENT = 8

function getRecentSearches(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

function saveRecentSearch(query: string) {
  const existing = getRecentSearches().filter(s => s !== query)
  const updated = [query, ...existing].slice(0, MAX_RECENT)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
}

export function SearchOverlay() {
  const isSearchOpen = useAppStore(s => s.isSearchOpen)
  const setSearchOpen = useAppStore(s => s.setSearchOpen)
  const packages = useAppStore(s => s.packages)
  const scheduledClasses = useAppStore(s => s.scheduledClasses)
  const videos = useAppStore(s => s.videos)
  const setActivePackage = useAppStore(s => s.setActivePackage)
  const setActiveTab = useAppStore(s => s.setActiveTab)

  const [query, setQuery] = useState('')
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isSearchOpen) {
      setQuery('')
      setRecentSearches(getRecentSearches())
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isSearchOpen])

  const handleClose = useCallback(() => {
    setSearchOpen(false)
  }, [setSearchOpen])

  // Escape key to close
  useEffect(() => {
    if (!isSearchOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isSearchOpen, handleClose])

  if (!isSearchOpen) return null

  const q = query.trim().toLowerCase()

  const matchedPackages = q
    ? packages.filter(p =>
        p.instructorName.toLowerCase().includes(q) ||
        p.label.toLowerCase().includes(q)
      )
    : []

  const matchedClasses = q
    ? scheduledClasses.filter(c =>
        c.title.toLowerCase().includes(q) ||
        (c.location ?? '').toLowerCase().includes(q) ||
        (c.notes ?? '').toLowerCase().includes(q)
      )
    : []

  const matchedVideos = q
    ? videos.filter(v =>
        v.title.toLowerCase().includes(q) ||
        (v.notes ?? '').toLowerCase().includes(q) ||
        v.filename.toLowerCase().includes(q)
      )
    : []

  function runSearch(searchQ: string) {
    setQuery(searchQ)
    if (searchQ.trim()) {
      saveRecentSearch(searchQ.trim())
      setRecentSearches(getRecentSearches())
    }
  }

  function handlePackageClick(pkgId: string) {
    if (query.trim()) saveRecentSearch(query.trim())
    setActivePackage(pkgId)
    handleClose()
  }

  function handleClassClick() {
    if (query.trim()) saveRecentSearch(query.trim())
    setActiveTab('schedule')
    handleClose()
  }

  function handleVideoClick(packageId: string) {
    if (query.trim()) saveRecentSearch(query.trim())
    setActivePackage(packageId)
    handleClose()
  }

  const hasResults = matchedPackages.length > 0 || matchedClasses.length > 0 || matchedVideos.length > 0

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          zIndex: 80, backdropFilter: 'blur(4px)',
        }}
      />

      {/* Overlay */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        zIndex: 90,
        display: 'flex', justifyContent: 'center',
        pointerEvents: 'none',
      }}>
        <div
          className="sheet-enter"
          style={{
            width: '100%', maxWidth: 430,
            background: 'var(--bg-elevated)',
            borderRadius: '0 0 24px 24px',
            maxHeight: '90dvh',
            display: 'flex', flexDirection: 'column',
            pointerEvents: 'auto',
            boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
          }}
        >
          {/* Search input row */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: 'max(16px, env(safe-area-inset-top)) 16px 12px',
            borderBottom: '1px solid var(--border)',
          }}>
            <Search size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && query.trim()) runSearch(query.trim())
              }}
              placeholder="Search packages, classes, videos…"
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                color: 'var(--text-primary)', fontSize: 16, fontFamily: 'inherit',
              }}
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, display: 'flex' }}
              >
                <X size={16} />
              </button>
            )}
            <button
              onClick={handleClose}
              style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '4px 10px', cursor: 'pointer',
                color: 'var(--text-secondary)', fontSize: 13, fontFamily: 'inherit',
              }}
            >
              Cancel
            </button>
          </div>

          {/* Results */}
          <div className="scroll-area" style={{ flex: 1, overflowY: 'auto', padding: '8px 0 16px' }}>
            {/* Recent searches when no query */}
            {!q && recentSearches.length > 0 && (
              <div style={{ padding: '0 16px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, marginTop: 8 }}>
                  Recent
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {recentSearches.map(r => (
                    <button
                      key={r}
                      onClick={() => runSearch(r)}
                      style={{
                        background: 'var(--bg-card)', border: '1px solid var(--border)',
                        borderRadius: 20, padding: '5px 13px',
                        color: 'var(--text-secondary)', fontSize: 13,
                        cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* No results */}
            {q && !hasResults && (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
                No results for "{query}"
              </div>
            )}

            {/* Packages */}
            {matchedPackages.length > 0 && (
              <div>
                <div style={{ padding: '12px 16px 6px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Packages
                </div>
                {matchedPackages.map(pkg => (
                  <button
                    key={pkg.id}
                    onClick={() => handlePackageClick(pkg.id)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 16px', background: 'none', border: 'none',
                      cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                    }}
                  >
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: pkg.color, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {pkg.instructorName}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {pkg.label}
                      </div>
                    </div>
                    {pkg.archivedAt && (
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-card)', borderRadius: 6, padding: '2px 7px' }}>
                        Archived
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Classes */}
            {matchedClasses.length > 0 && (
              <div>
                <div style={{ padding: '12px 16px 6px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Classes
                </div>
                {matchedClasses.map(cls => (
                  <button
                    key={cls.id}
                    onClick={handleClassClick}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 16px', background: 'none', border: 'none',
                      cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {cls.title}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {format(cls.startTime, 'MMM d, yyyy')}
                        {cls.location ? ` · ${cls.location}` : ''}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Videos */}
            {matchedVideos.length > 0 && (
              <div>
                <div style={{ padding: '12px 16px 6px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Videos
                </div>
                {matchedVideos.map(vid => (
                  <button
                    key={vid.id}
                    onClick={() => handleVideoClick(vid.packageId)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 16px', background: 'none', border: 'none',
                      cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {vid.title || vid.filename}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {format(vid.attendedAt, 'MMM d, yyyy')}
                        {vid.notes ? ` · ${vid.notes.slice(0, 50)}` : ''}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
