import Head from 'next/head'
import { useState, useEffect, useCallback } from 'react'

const API = 'http://localhost:8000'
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

interface ShiftRequirement {
  id: number
  day_of_week: number
  name: string
  start_hour: number
  end_hour: number
  required_pharmacists: number
  required_preparators: number
}

export default function SettingsPage() {
  const [shifts, setShifts] = useState<ShiftRequirement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  // Form state
  const [shiftName, setShiftName] = useState('Morning Shift')
  const [dayOfWeek, setDayOfWeek] = useState('0')
  const [startHour, setStartHour] = useState('8')
  const [endHour, setEndHour] = useState('16')
  const [reqPharm, setReqPharm] = useState('1')
  const [reqPrep, setReqPrep] = useState('2')

  const fetchShifts = useCallback(async () => {
    try {
      const res = await fetch(`${API}/shifts`)
      if (res.ok) setShifts(await res.json())
    } catch {
      setError('Could not connect to backend.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchShifts() }, [fetchShifts])

  const showSuccess = (msg: string) => {
    setSuccess(msg)
    setError('')
    setTimeout(() => setSuccess(''), 3000)
  }

  const handleAddShift = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!shiftName.trim()) { setError('Shift name is required.'); return }
    if (Number(startHour) >= Number(endHour)) { setError('Start hour must be before end hour.'); return }
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`${API}/shifts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: shiftName.trim(),
          day_of_week: Number(dayOfWeek),
          start_hour: Number(startHour),
          end_hour: Number(endHour),
          required_pharmacists: Number(reqPharm),
          required_preparators: Number(reqPrep),
        }),
      })
      if (res.ok) {
        showSuccess(`Shift "${shiftName}" on ${DAY_NAMES[Number(dayOfWeek)]} added!`)
        await fetchShifts()
      } else {
        const d = await res.json()
        setError(d.detail || 'Failed to add shift.')
      }
    } catch {
      setError('Could not connect to backend.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteShift = async (id: number, name: string) => {
    if (!confirm(`Delete shift "${name}"?`)) return
    try {
      await fetch(`${API}/shifts/${id}`, { method: 'DELETE' })
      showSuccess(`Shift "${name}" removed.`)
      await fetchShifts()
    } catch {
      setError('Could not delete shift.')
    }
  }

  // Group shifts by day
  const shiftsByDay = DAY_NAMES.map((_, dayIdx) =>
    shifts.filter(s => s.day_of_week === dayIdx)
  )

  return (
    <>
      <Head>
        <title>Shift Settings | PharmaRoster</title>
        <meta name="description" content="Configure pharmacy shift hours and staffing requirements" />
      </Head>

      <div className="page-header">
        <div>
          <h1 className="page-title">⚙️ Shift Settings</h1>
          <p className="page-subtitle">Define shift blocks and minimum staffing requirements per shift</p>
        </div>
        <div className="flex gap-12 items-center text-sm text-secondary">
          <span>{shifts.length} shift{shifts.length !== 1 ? 's' : ''} configured</span>
        </div>
      </div>

      <div className="page-body">
        {error && (
          <div className="alert alert-error mb-20">
            <span className="alert-icon">❌</span>
            <div className="alert-content"><div className="alert-title">Error</div>{error}</div>
          </div>
        )}
        {success && (
          <div className="alert alert-success mb-20">
            <span className="alert-icon">✅</span>
            <div className="alert-content">{success}</div>
          </div>
        )}

        <div className="grid-2 gap-24">
          {/* Add Shift Form */}
          <div className="card">
            <div className="card-title"><span className="card-title-icon">➕</span>Add Shift</div>
            <form onSubmit={handleAddShift} id="add-shift-form">
              <div className="flex flex-col gap-16">
                <div className="form-group">
                  <label htmlFor="shift-name" className="form-label">Shift Name</label>
                  <input id="shift-name" className="form-input" placeholder="e.g. Morning Shift" value={shiftName} onChange={e => setShiftName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label htmlFor="shift-day" className="form-label">Day of Week</label>
                  <select id="shift-day" className="form-select" value={dayOfWeek} onChange={e => setDayOfWeek(e.target.value)}>
                    {DAY_NAMES.map((d, i) => <option key={i} value={i}>{d}</option>)}
                  </select>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="shift-start" className="form-label">Start Hour</label>
                    <input id="shift-start" className="form-input" type="number" min="0" max="23" value={startHour} onChange={e => setStartHour(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="shift-end" className="form-label">End Hour</label>
                    <input id="shift-end" className="form-input" type="number" min="1" max="24" value={endHour} onChange={e => setEndHour(e.target.value)} />
                  </div>
                </div>
                <div className="alert alert-info" style={{ padding: '10px 14px', fontSize: 13 }}>
                  <span>⏱️</span>
                  <span>
                    Duration: <strong className="font-mono">{Math.max(0, Number(endHour) - Number(startHour))}h</strong>
                    {' '} ({String(Number(startHour)).padStart(2,'0')}:00 – {String(Number(endHour)).padStart(2,'0')}:00)
                  </span>
                </div>

                <div className="divider" style={{ margin: '4px 0' }}></div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>Minimum Staffing Requirements</div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="shift-pharm" className="form-label">💊 Pharmacists</label>
                    <input id="shift-pharm" className="form-input" type="number" min="0" value={reqPharm} onChange={e => setReqPharm(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="shift-prep" className="form-label">⚗️ Preparators</label>
                    <input id="shift-prep" className="form-input" type="number" min="0" value={reqPrep} onChange={e => setReqPrep(e.target.value)} />
                  </div>
                </div>
                <button type="submit" id="add-shift-submit" className={`btn btn-primary ${saving ? 'btn-loading' : ''}`} disabled={saving}>
                  {!saving && '➕'} Add Shift
                </button>
              </div>
            </form>
          </div>

          {/* Shift List by Day */}
          <div className="flex flex-col gap-16">
            {loading ? (
              <div className="card">
                <div className="empty-state"><div className="spinner" style={{ margin: '0 auto' }}></div></div>
              </div>
            ) : shifts.length === 0 ? (
              <div className="card">
                <div className="empty-state">
                  <div className="empty-state-icon">⚙️</div>
                  <div className="empty-state-text">No shifts configured yet</div>
                  <div className="empty-state-sub">Add your first shift using the form on the left</div>
                </div>
              </div>
            ) : (
              DAY_NAMES.map((dayName, dayIdx) => {
                const dayShifts = shiftsByDay[dayIdx]
                if (dayShifts.length === 0) return null
                return (
                  <div key={dayIdx} className="card">
                    <div className="card-title" style={{ marginBottom: 12 }}>
                      <span className="card-title-icon">📅</span>
                      <span style={{ color: `var(--${['day-monday','day-tuesday','day-wednesday','day-thursday','day-friday','day-saturday','day-sunday'][dayIdx]})` }}>
                        {dayName}
                      </span>
                    </div>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Shift</th>
                          <th>Hours</th>
                          <th>💊</th>
                          <th>⚗️</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {dayShifts.map(s => (
                          <tr key={s.id}>
                            <td style={{ fontWeight: 500 }}>{s.name}</td>
                            <td className="font-mono text-secondary">
                              {String(s.start_hour).padStart(2,'0')}–{String(s.end_hour).padStart(2,'0')}
                            </td>
                            <td>
                              <span className="badge badge-pharmacist">{s.required_pharmacists}</span>
                            </td>
                            <td>
                              <span className="badge badge-preparator">{s.required_preparators}</span>
                            </td>
                            <td>
                              <button className="btn btn-danger" onClick={() => handleDeleteShift(s.id, s.name)}>🗑️</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </>
  )
}
