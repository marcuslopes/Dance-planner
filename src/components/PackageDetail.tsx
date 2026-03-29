import { useEffect, useRef, useState } from 'react'
import { ProgressRing } from './ProgressRing'
import { useAppStore, classesUsed, progressPercent, pricePerClass, getAttendanceForPackage } from '../store/appStore'
import { convert, formatCurrency, getRateAge } from '../lib/currency'
import { format, isSameDay } from 'date-fns'
import { Trash2, Pencil, X, Undo2, Video, ExternalLink, ArrowRightLeft, BookOpen } from 'lucide-react'
import toast from 'react-hot-toast'
import confetti from 'canvas-confetti'
import type { AttendanceRecord, Package, VideoRecord } from '../types'
import { VideoUploadModal } from './VideoUploadModal'
import { VideoEditModal } from './VideoEditModal'
import { VideoMoveModal } from './VideoMoveModal'
import { ClassJournalSheet } from './ClassJournalSheet'

// Guard wrapper — renders nothing when no package is active
export function PackageDetail() {
  const { packages, activePackageId } = useAppStore()
  const pkg = packages.find(p => p.id === activePackageId)
  if (!pkg) return null
  return <PackageDetailInner pkg={pkg} />
}

function PackageDetailInner({ pkg }: { pkg: Package }) {
  const {
    attendance, displayCurrency, rates,
    setActivePackage, openForm, archivePackage, deletePackage,
    markAttended, undoLastAttendance, deleteAttendance,
    videos, deleteVideo,
  } = useAppStore()
  const prevUsed = useRef<number | null>(null)
  const [uploadingForDate, setUploadingForDate] = useState<number | null>(null)
  const [editingVideo, setEditingVideo] = useState<VideoRecord | null>(null)
  const [movingVideo, setMovingVideo] = useState<VideoRecord | null>(null)
  const [journalRecord, setJournalRecord] = useState<AttendanceRecord | null>(null)

  const pkgVideos = videos.filter(v => v.packageId === pkg.id)
    .sort((a, b) => b.attendedAt - a.attendedAt)
  const pkgAttendance = getAttendanceForPackage(attendance, pkg.id)

  // Assign each video to exactly one attendance record: same calendar day, closest timestamp.
  // This prevents a video from appearing under every class row on the same date.
  const videoToRecId = new Map<string, string>()
  for (const vid of pkgVideos) {
    let bestRec: (typeof pkgAttendance)[0] | null = null
    let bestDiff = Infinity
    for (const rec of pkgAttendance) {
      if (isSameDay(new Date(rec.attendedAt), new Date(vid.attendedAt))) {
        const diff = Math.abs(rec.attendedAt - vid.attendedAt)
        if (diff < bestDiff) { bestDiff = diff; bestRec = rec }
      }
    }
    if (bestRec) videoToRecId.set(vid.id, bestRec.id)
  }

  const videosByRecId = new Map<string, VideoRecord[]>()
  for (const rec of pkgAttendance) {
    videosByRecId.set(rec.id, pkgVideos.filter(v => videoToRecId.get(v.id) === rec.id))
  }
  const orphanedVideos = pkgVideos.filter(v => !videoToRecId.has(v.id))

  const used = classesUsed(attendance, pkg.id)
  const remaining = pkg.totalClasses - used
  const percent = progressPercent(attendance, pkg)
  const ppc = pricePerClass(pkg)
  const ppcConverted = convert(ppc, pkg.baseCurrency, displayCurrency, rates.rates)
  const totalConverted = convert(pkg.priceAmount, pkg.baseCurrency, displayCurrency, rates.rates)
  const isComplete = remaining <= 0
  const isArchived = !!pkg.archivedAt

  // Confetti on package completion
  useEffect(() => {
    if (prevUsed.current !== null && used > prevUsed.current && isComplete) {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.5 },
        colors: [pkg.color, '#a78bfa', '#ec4899', '#f59e0b'],
      })
      toast.success(`Package complete! All ${pkg.totalClasses} classes done 🎉`, { duration: 4000 })
    }
    prevUsed.current = used
  }, [used, isComplete, pkg.color, pkg.totalClasses])

  async function handleMark() {
    if (isComplete || isArchived) return
    const record = await markAttended(pkg.id)
    if ('vibrate' in navigator) navigator.vibrate(40)
    setJournalRecord(record)
  }

  async function handleUndo() {
    await undoLastAttendance(pkg.id)
    toast('Last class undone', { icon: '↩️' })
  }

  async function handleDelete() {
    if (!confirm(`Delete package with ${pkg.instructorName}? This cannot be undone.`)) return
    await deletePackage(pkg.id)
    setActivePackage(null)
    toast.success('Package deleted')
  }

  async function handleArchive() {
    await archivePackage(pkg.id)
    toast.success('Package archived')
    setActivePackage(null)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="animate-fade-in"
        onClick={() => setActivePackage(null)}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          zIndex: 40, backdropFilter: 'blur(4px)',
        }}
      />

      {/* Detail sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        display: 'flex', justifyContent: 'center',
        zIndex: 50, pointerEvents: 'none',
      }}>
      <div
        className="sheet-enter"
        style={{
          width: '100%', maxWidth: 430,
          background: 'var(--bg-elevated)',
          borderRadius: '24px 24px 0 0',
          paddingBottom: 'calc(72px + env(safe-area-inset-bottom, 0px))',
          maxHeight: '92dvh',
          display: 'flex', flexDirection: 'column',
          pointerEvents: 'auto',
        }}
      >
        {/* Drag handle + close */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 20px 0' }}>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--text-muted)' }} />
          </div>
          <button onClick={() => setActivePackage(null)} style={iconBtn}>
            <X size={20} />
          </button>
        </div>

        <div className="scroll-area" style={{ flex: 1, padding: '16px 24px 0' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>
                {pkg.instructorName}
              </h2>
              {pkg.label && (
                <span style={{
                  display: 'inline-block', marginTop: 4,
                  background: pkg.color + '22', color: pkg.color,
                  borderRadius: 6, padding: '2px 10px', fontSize: 12, fontWeight: 600,
                }}>
                  {pkg.label}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setActivePackage(null); openForm(pkg) }} style={iconBtn}>
                <Pencil size={18} />
              </button>
              <button onClick={handleDelete} style={{ ...iconBtn, color: 'var(--danger)' }}>
                <Trash2 size={18} />
              </button>
            </div>
          </div>

          {/* Big progress ring */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
            <ProgressRing
              percent={percent}
              size={160}
              stroke={14}
              label={isComplete ? 'complete!' : 'classes left'}
              value={isComplete ? '✓' : String(remaining)}
              sub={`${used} of ${pkg.totalClasses} done`}
            />
          </div>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
            <StatBox label="Per class" value={formatCurrency(ppcConverted, displayCurrency)} color={pkg.color} />
            <StatBox label="Total paid" value={formatCurrency(totalConverted, displayCurrency)} />
            <StatBox label="Progress" value={`${Math.round(percent)}%`} />
          </div>

          {/* Rate info */}
          <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', margin: '0 0 16px' }}>
            {rates.isFallback ? 'Using estimated exchange rates' : `Rates updated ${getRateAge(rates.fetchedAt)}`}
          </p>

          {/* Archive button */}
          {isComplete && !isArchived && (
            <button onClick={handleArchive} style={{
              width: '100%', padding: '12px', marginBottom: 16,
              borderRadius: 12, border: '1px solid var(--border)',
              background: 'transparent', color: 'var(--text-secondary)',
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}>
              Archive this package
            </button>
          )}

          {/* Class history — merged with videos */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Class history
              </h3>
              {pkgAttendance.length > 0 && !isArchived && (
                <button onClick={handleUndo} style={{ ...iconBtn, fontSize: 12, gap: 4, display: 'flex', alignItems: 'center', padding: '4px 10px', borderRadius: 8 }}>
                  <Undo2 size={14} />
                  <span>Undo last</span>
                </button>
              )}
            </div>

            {pkgAttendance.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 14, textAlign: 'center', padding: '16px 0' }}>
                No classes logged yet
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {pkgAttendance.map((rec, i) => {
                  const rowVideos = videosByRecId.get(rec.id) ?? []
                  const isLast = i === pkgAttendance.length - 1
                  const showBorder = !isLast

                  return (
                    <div key={rec.id} className="animate-fade-in" style={{ animationDelay: `${i * 20}ms` }}>
                      {/* Attendance row */}
                      <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '10px 0',
                        borderBottom: rowVideos.length === 0 && showBorder ? '1px solid var(--border)' : 'none',
                      }}>
                        <div>
                          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
                            Class #{pkgAttendance.length - i}
                          </span>
                          {rec.title && (
                            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)', marginLeft: 6 }}>
                              · {rec.title}
                            </span>
                          )}
                          <span style={{ fontSize: 13, color: 'var(--text-secondary)', marginLeft: 10 }}>
                            {format(rec.attendedAt, 'MMM d, yyyy')}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <button
                            onClick={() => setJournalRecord(rec)}
                            style={{ background: 'none', border: 'none', color: rec.rating ? pkg.color : 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
                            title="Class journal"
                          >
                            <BookOpen size={13} />
                          </button>
                          {!isArchived && (
                            <button
                              onClick={() => setUploadingForDate(rec.attendedAt)}
                              style={uploadBtn}
                              title="Upload video for this class"
                            >
                              <Video size={13} />
                            </button>
                          )}
                          <button
                            onClick={() => deleteAttendance(rec.id)}
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Journal notes */}
                      {(rec.rating || rec.learnedNote || rec.practiceNote) && (
                        <div style={{ padding: '4px 0 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {rec.rating && (
                            <div style={{ display: 'flex', gap: 2 }}>
                              {[1,2,3,4,5].map(s => (
                                <span key={s} style={{ fontSize: 12, color: s <= rec.rating! ? pkg.color : 'var(--border)' }}>★</span>
                              ))}
                            </div>
                          )}
                          {rec.learnedNote && (
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                              <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Learned: </span>{rec.learnedNote}
                            </div>
                          )}
                          {rec.practiceNote && (
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                              <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Practice: </span>{rec.practiceNote}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Video sub-rows */}
                      {rowVideos.map((vid, vi) => (
                        <div key={vid.id} style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                          padding: '7px 0 7px 20px',
                          borderBottom: vi === rowVideos.length - 1 && showBorder ? '1px solid var(--border)' : 'none',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flex: 1, minWidth: 0 }}>
                            <Video size={13} style={{ color: '#7c3aed', flexShrink: 0, marginTop: 3 }} />
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 1 }}>
                                {vid.title || 'Class video'}
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                {(vid.sizeBytes / 1024 / 1024).toFixed(1)} MB
                              </div>
                              {vid.notes ? (
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3, lineHeight: 1.4 }}>
                                  {vid.notes.length > 80 ? vid.notes.slice(0, 80) + '…' : vid.notes}
                                </div>
                              ) : null}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                            <a href={vid.driveWebViewLink} target="_blank" rel="noopener noreferrer" style={{ ...iconBtn, textDecoration: 'none' }}>
                              <ExternalLink size={13} />
                            </a>
                            <button onClick={() => setEditingVideo(vid)} style={iconBtn}>
                              <Pencil size={13} />
                            </button>
                            <button onClick={() => setMovingVideo(vid)} style={moveBtn} title="Move to another class">
                              <ArrowRightLeft size={13} />
                            </button>
                            <button onClick={() => deleteVideo(vid.id)} style={{ ...iconBtn, color: 'var(--danger)' }}>
                              <X size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Orphaned videos — uploaded for dates with no matching attendance */}
            {orphanedVideos.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <h4 style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Other videos
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {orphanedVideos.map((vid, i) => (
                    <div key={vid.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                      padding: '10px 0',
                      borderBottom: i < orphanedVideos.length - 1 ? '1px solid var(--border)' : 'none',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flex: 1, minWidth: 0 }}>
                        <Video size={14} style={{ color: '#7c3aed', flexShrink: 0, marginTop: 2 }} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 1 }}>
                            {vid.title || format(vid.attendedAt, 'MMM d, yyyy')}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {format(vid.attendedAt, 'MMM d, yyyy')} · {(vid.sizeBytes / 1024 / 1024).toFixed(1)} MB
                          </div>
                          {vid.notes ? (
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3, lineHeight: 1.4 }}>
                              {vid.notes.length > 80 ? vid.notes.slice(0, 80) + '…' : vid.notes}
                            </div>
                          ) : null}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        <a href={vid.driveWebViewLink} target="_blank" rel="noopener noreferrer" style={{ ...iconBtn, textDecoration: 'none' }}>
                          <ExternalLink size={13} />
                        </a>
                        <button onClick={() => setEditingVideo(vid)} style={iconBtn}>
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => setMovingVideo(vid)} style={moveBtn} title="Move to another class">
                          <ArrowRightLeft size={13} />
                        </button>
                        <button onClick={() => deleteVideo(vid.id)} style={{ ...iconBtn, color: 'var(--danger)' }}>
                          <X size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mark attended CTA */}
        {!isArchived && (
          <div style={{ padding: '16px 24px 0' }}>
            <button
              onClick={handleMark}
              disabled={isComplete}
              style={{
                width: '100%', padding: '16px', borderRadius: 16, border: 'none',
                background: isComplete
                  ? 'rgba(255,255,255,0.06)'
                  : `linear-gradient(135deg, ${pkg.color}, ${pkg.color}cc)`,
                color: isComplete ? 'var(--text-muted)' : '#fff',
                fontSize: 17, fontWeight: 700, cursor: isComplete ? 'default' : 'pointer',
                boxShadow: isComplete ? 'none' : `0 4px 24px ${pkg.color}50`,
                transition: 'all 150ms ease',
                letterSpacing: '0.02em',
              }}
            >
              {isComplete ? '✓ Package complete!' : '+ Mark class attended'}
            </button>
          </div>
        )}
      </div>
      </div>

      {/* Video upload modal — tied to a specific class row */}
      {uploadingForDate !== null && (
        <VideoUploadModal
          packageId={pkg.id}
          defaultAttendedAt={uploadingForDate}
          lockDate
          onClose={() => setUploadingForDate(null)}
        />
      )}

      {/* Video edit modal */}
      {editingVideo && (
        <VideoEditModal
          video={editingVideo}
          onClose={() => setEditingVideo(null)}
        />
      )}

      {/* Video move modal */}
      {movingVideo && (
        <VideoMoveModal
          video={movingVideo}
          onClose={() => setMovingVideo(null)}
        />
      )}

      {/* Class journal sheet */}
      {journalRecord && (
        <ClassJournalSheet
          record={journalRecord}
          pkg={pkg}
          onClose={() => setJournalRecord(null)}
        />
      )}
    </>
  )
}

function StatBox({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 14, padding: '12px 10px', textAlign: 'center' }}>
      <div style={{ fontSize: 16, fontWeight: 800, color: color ?? 'var(--text-primary)', fontVariantNumeric: 'tabular-nums', marginBottom: 4 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </div>
    </div>
  )
}

const iconBtn: React.CSSProperties = {
  background: 'var(--bg-card)', border: '1px solid var(--border)',
  borderRadius: 10, padding: '8px', cursor: 'pointer',
  color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
}

const uploadBtn: React.CSSProperties = {
  background: 'rgba(124,58,237,0.10)', border: '1px solid rgba(124,58,237,0.25)',
  borderRadius: 8, padding: '5px 8px', cursor: 'pointer',
  color: '#a78bfa', display: 'flex', alignItems: 'center', justifyContent: 'center',
}

const moveBtn: React.CSSProperties = {
  background: 'rgba(59,130,246,0.10)', border: '1px solid rgba(59,130,246,0.25)',
  borderRadius: 8, padding: '5px 8px', cursor: 'pointer',
  color: '#60a5fa', display: 'flex', alignItems: 'center', justifyContent: 'center',
}
