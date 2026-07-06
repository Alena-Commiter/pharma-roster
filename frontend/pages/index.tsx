// PharmaRoster Scheduler Application Dashboard
import Head from 'next/head'
import { useState, useEffect, useCallback } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DAY_CLASSES = ['day-monday','day-tuesday','day-wednesday','day-thursday','day-friday','day-saturday','day-sunday']

interface ScheduleEntry {
  id: number
  employee_id: number
  employee_name: string
  employee_role: string
  day_of_week: number
  shift_requirement_id: number
  shift_name: string
  start_hour: number
  end_hour: number
}

interface Employee {
  id: number
  name: string
  role: string
}

interface ShiftRequirement {
  id: number
  day_of_week: number
  name: string
  start_hour: number
  end_hour: number
}

type ValidationStatus = 'idle' | 'loading' | 'success' | 'error'
type GenerateStatus = 'idle' | 'loading' | 'success' | 'error'

export default function Home() {
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [shifts, setShifts] = useState<ShiftRequirement[]>([])
  const [loading, setLoading] = useState(true)

  const [validateStatus, setValidateStatus] = useState<ValidationStatus>('idle')
  const [validateMsg, setValidateMsg] = useState('')
  const [generateStatus, setGenerateStatus] = useState<GenerateStatus>('idle')
  const [generateMsg, setGenerateMsg] = useState('')
  const [seeding, setSeeding] = useState(false)

  const handleSeed = async () => {
    setSeeding(true)
    try {
      const res = await fetch(`${API}/seed`, { method: 'POST' })
      if (res.ok) {
        setValidateStatus('idle')
        setValidateMsg('')
        setGenerateStatus('idle')
        setGenerateMsg('')
        await fetchAll()
      } else {
        alert('Failed to seed database.')
      }
    } catch {
      alert('Could not connect to backend.')
    } finally {
      setSeeding(false)
    }
  }

  const fetchAll = useCallback(async () => {
    try {
      const [schedRes, empRes, shiftRes] = await Promise.all([
        fetch(`${API}/schedule`),
        fetch(`${API}/employees`),
        fetch(`${API}/shifts`),
      ])
      if (schedRes.ok) setSchedule(await schedRes.json())
      if (empRes.ok) setEmployees(await empRes.json())
      if (shiftRes.ok) setShifts(await shiftRes.json())
    } catch (e) {
      console.error('Failed to fetch data', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const handleValidate = async () => {
    setValidateStatus('loading')
    setValidateMsg('')
    setGenerateStatus('idle')
    setGenerateMsg('')
    try {
      const res = await fetch(`${API}/validate`, { method: 'POST' })
      const data = await res.json()
      if (data.feasible) {
        setValidateStatus('success')
        setValidateMsg(data.message)
      } else {
        setValidateStatus('error')
        setValidateMsg(data.message)
      }
    } catch {
      setValidateStatus('error')
      setValidateMsg('Could not connect to the backend. Please make sure it is running on port 8000.')
    }
  }

  const handleGenerate = async () => {
    setGenerateStatus('loading')
    setGenerateMsg('')
    try {
      const res = await fetch(`${API}/optimize`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setGenerateStatus('success')
        setGenerateMsg(data.message)
        await fetchAll()
      } else {
        const err = await res.json()
        setGenerateStatus('error')
        setGenerateMsg(err.detail || 'Optimization failed.')
      }
    } catch {
      setGenerateStatus('error')
      setGenerateMsg('Could not connect to the backend.')
    }
  }

  // Build grid: rows = employees, columns = unique shifts per day
  const uniqueShifts = shifts.sort((a, b) => a.day_of_week - b.day_of_week || a.start_hour - b.start_hour)
  const uniqueDays = [...new Set(uniqueShifts.map(s => s.day_of_week))].sort()

  // Pharmacists and preparators separately for grouped display
  const pharmacists = employees.filter(e => e.role === 'Pharmacist')
  const preparators = employees.filter(e => e.role === 'Preparator')

  const isAssigned = (employeeId: number, shiftId: number) =>
    schedule.some(s => s.employee_id === employeeId && s.shift_requirement_id === shiftId)

  const totalPharmacists = pharmacists.length
  const totalPreparators = preparators.length
  const totalShifts = shifts.length
  const totalAssignments = schedule.length

  return (
    <>
      <Head>
        <title>Schedule Dashboard | PharmaRoster</title>
        <meta name="description" content="Weekly employee schedule planner for pharmacies" />
      </Head>

      <div className="page-header">
        <div>
          <h1 className="page-title">📅 Weekly Schedule</h1>
          <p className="page-subtitle">Optimize and view the weekly shift assignments</p>
        </div>
        <div className="flex gap-12">
          <button
            className={`btn btn-outline ${seeding ? 'btn-loading' : ''}`}
            onClick={handleSeed}
            disabled={seeding || validateStatus === 'loading' || generateStatus === 'loading'}
            style={{ borderColor: 'rgba(245, 158, 11, 0.4)', color: 'var(--accent-amber)' }}
          >
            {seeding ? '' : '🌱'} Reset Demo Data
          </button>
          <button
            id="validate-btn"
            className={`btn btn-outline ${validateStatus === 'loading' ? 'btn-loading' : ''}`}
            onClick={handleValidate}
            disabled={validateStatus === 'loading' || generateStatus === 'loading'}
          >
            {validateStatus !== 'loading' && '🔍'} Validate Inputs
          </button>
          <button
            id="generate-btn"
            className={`btn btn-success ${generateStatus === 'loading' ? 'btn-loading' : ''}`}
            onClick={handleGenerate}
            disabled={validateStatus !== 'success' || generateStatus === 'loading'}
            title={validateStatus !== 'success' ? 'Run validation first' : 'Generate the optimized schedule'}
          >
            {generateStatus !== 'loading' && '⚡'} Generate Schedule
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* Status notifications */}
        {validateStatus !== 'idle' && (
          <div className="mb-20">
            {validateStatus === 'success' && (
              <div className="alert alert-success">
                <span className="alert-icon">✅</span>
                <div className="alert-content">
                  <div className="alert-title">Validation Passed</div>
                  {validateMsg}
                </div>
              </div>
            )}
            {validateStatus === 'error' && (
              <div className="alert alert-error">
                <span className="alert-icon">❌</span>
                <div className="alert-content">
                  <div className="alert-title">Scheduling Not Possible</div>
                  {validateMsg}
                </div>
              </div>
            )}
            {validateStatus === 'loading' && (
              <div className="alert alert-info">
                <span className="alert-icon">⏳</span>
                <div className="alert-content">
                  <div className="alert-title">Checking feasibility...</div>
                  Please wait while we validate the input data.
                </div>
              </div>
            )}
          </div>
        )}

        {generateStatus === 'success' && (
          <div className="mb-20">
            <div className="alert alert-success">
              <span className="alert-icon">🎉</span>
              <div className="alert-content">
                <div className="alert-title">Schedule Generated!</div>
                {generateMsg}
              </div>
            </div>
          </div>
        )}
        {generateStatus === 'error' && (
          <div className="mb-20">
            <div className="alert alert-error">
              <span className="alert-icon">❌</span>
              <div className="alert-content">
                <div className="alert-title">Generation Failed</div>
                {generateMsg}
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid-4 mb-24">
          <div className="stat-card">
            <div className="stat-card-label">Pharmacists</div>
            <div className="stat-card-value" style={{ color: 'var(--accent-blue)' }}>{totalPharmacists}</div>
            <div className="stat-card-sub">registered</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-label">Preparators</div>
            <div className="stat-card-value" style={{ color: 'var(--accent-violet)' }}>{totalPreparators}</div>
            <div className="stat-card-sub">registered</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-label">Shifts</div>
            <div className="stat-card-value" style={{ color: 'var(--accent-amber)' }}>{totalShifts}</div>
            <div className="stat-card-sub">configured</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-label">Assignments</div>
            <div className="stat-card-value" style={{ color: 'var(--accent-emerald)' }}>{totalAssignments}</div>
            <div className="stat-card-sub">in current schedule</div>
          </div>
        </div>

        {/* Schedule grid */}
        <div className="card">
          <div className="card-title">
            <span className="card-title-icon">🗓️</span>
            Current Schedule
          </div>
          {loading ? (
            <div className="empty-state">
              <div className="spinner" style={{ margin: '0 auto' }}></div>
              <div className="empty-state-text mt-16">Loading schedule…</div>
              <div className="empty-state-sub" style={{ marginTop: '12px', opacity: 0.7, maxWidth: '320px', margin: '12px auto 0' }}>
                Note: Using free hosting. If the server is asleep, waking it up may take 30-40 seconds. Thank you for your patience!
              </div>
            </div>
          ) : schedule.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <div className="empty-state-text">No schedule generated yet</div>
              <div className="empty-state-sub">Click <strong>Validate Inputs</strong> then <strong>Generate Schedule</strong> to get started</div>
            </div>
          ) : (
            <div className="schedule-grid-wrapper">
              <table className="schedule-grid">
                <thead>
                  <tr>
                    <th className="employee-col">Employee</th>
                    {uniqueShifts.map(s => (
                      <th key={s.id}>
                        <span className={DAY_CLASSES[s.day_of_week]}>
                          {DAY_NAMES[s.day_of_week].slice(0, 3)}
                        </span>
                        <br />
                        <span style={{ fontWeight: 400, color: 'var(--text-muted)', textTransform: 'none', letterSpacing: 0 }}>
                          {String(s.start_hour).padStart(2,'0')}–{String(s.end_hour).padStart(2,'0')}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...pharmacists, ...preparators].map(emp => (
                    <tr key={emp.id}>
                      <td className="employee-cell">
                        <div className="flex items-center gap-8">
                          <span className={`badge ${emp.role === 'Pharmacist' ? 'badge-pharmacist' : 'badge-preparator'}`}>
                            {emp.role === 'Pharmacist' ? '💊' : '⚗️'}
                          </span>
                          {emp.name}
                        </div>
                      </td>
                      {uniqueShifts.map(s => (
                        <td key={s.id}>
                          {isAssigned(emp.id, s.id)
                            ? <span className="shift-assigned">✓</span>
                            : <span style={{ color: 'var(--border-subtle)' }}>—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
