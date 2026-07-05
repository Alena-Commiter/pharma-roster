import Head from 'next/head'
import { useState, useEffect, useCallback } from 'react'

const API = 'http://localhost:8000'
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

interface Employee {
  id: number
  name: string
  role: string
  max_daily_hours: number
  max_weekly_hours: number
}

interface Absence {
  id: number
  employee_id: number
  day_of_week: number
  start_hour: number
  end_hour: number
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [absences, setAbsences] = useState<Absence[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // New employee form state
  const [name, setName] = useState('')
  const [role, setRole] = useState('Pharmacist')
  const [maxDaily, setMaxDaily] = useState('8')
  const [maxWeekly, setMaxWeekly] = useState('35')
  const [saving, setSaving] = useState(false)

  // Absence form state
  const [absEmpId, setAbsEmpId] = useState('')
  const [absDay, setAbsDay] = useState('0')
  const [absStart, setAbsStart] = useState('8')
  const [absEnd, setAbsEnd] = useState('16')
  const [savingAbs, setSavingAbs] = useState(false)

  const fetchAll = useCallback(async () => {
    try {
      const [empRes, absRes] = await Promise.all([
        fetch(`${API}/employees`),
        fetch(`${API}/absences`),
      ])
      if (empRes.ok) setEmployees(await empRes.json())
      if (absRes.ok) setAbsences(await absRes.json())
    } catch {
      setError('Could not connect to backend.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const showSuccess = (msg: string) => {
    setSuccess(msg)
    setError('')
    setTimeout(() => setSuccess(''), 3000)
  }

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setError('Employee name is required.'); return }
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`${API}/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), role, max_daily_hours: Number(maxDaily), max_weekly_hours: Number(maxWeekly) }),
      })
      if (res.ok) {
        showSuccess(`${role} "${name}" added successfully!`)
        setName('')
        await fetchAll()
      } else {
        const d = await res.json()
        setError(d.detail || 'Failed to add employee.')
      }
    } catch {
      setError('Could not connect to backend.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteEmployee = async (id: number, empName: string) => {
    if (!confirm(`Delete employee "${empName}"? This will also remove their absences and schedule assignments.`)) return
    try {
      await fetch(`${API}/employees/${id}`, { method: 'DELETE' })
      showSuccess(`Employee "${empName}" removed.`)
      await fetchAll()
    } catch {
      setError('Could not delete employee.')
    }
  }

  const handleAddAbsence = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!absEmpId) { setError('Please select an employee.'); return }
    if (Number(absStart) >= Number(absEnd)) { setError('Start hour must be before end hour.'); return }
    setSavingAbs(true)
    setError('')
    try {
      const res = await fetch(`${API}/absences`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: Number(absEmpId),
          day_of_week: Number(absDay),
          start_hour: Number(absStart),
          end_hour: Number(absEnd),
        }),
      })
      if (res.ok) {
        showSuccess('Absence recorded.')
        await fetchAll()
      } else {
        const d = await res.json()
        setError(d.detail || 'Failed to add absence.')
      }
    } catch {
      setError('Could not connect to backend.')
    } finally {
      setSavingAbs(false)
    }
  }

  const handleDeleteAbsence = async (id: number) => {
    try {
      await fetch(`${API}/absences/${id}`, { method: 'DELETE' })
      showSuccess('Absence removed.')
      await fetchAll()
    } catch {
      setError('Could not delete absence.')
    }
  }

  const pharmacists = employees.filter(e => e.role === 'Pharmacist')
  const preparators = employees.filter(e => e.role === 'Preparator')

  const getEmpName = (id: number) => employees.find(e => e.id === id)?.name ?? `#${id}`

  return (
    <>
      <Head>
        <title>Employees | PharmaRoster</title>
        <meta name="description" content="Manage pharmacy employees, working hours and planned absences" />
      </Head>

      <div className="page-header">
        <div>
          <h1 className="page-title">👥 Employees</h1>
          <p className="page-subtitle">Manage staff, working hour limits and planned absences</p>
        </div>
        <div className="flex gap-12 items-center text-sm text-secondary">
          <span>{pharmacists.length} Pharmacist{pharmacists.length !== 1 ? 's' : ''}</span>
          <span style={{ color: 'var(--border-medium)' }}>|</span>
          <span>{preparators.length} Preparator{preparators.length !== 1 ? 's' : ''}</span>
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
          {/* Add Employee Card */}
          <div className="card">
            <div className="card-title"><span className="card-title-icon">➕</span>Add Employee</div>
            <form onSubmit={handleAddEmployee} id="add-employee-form">
              <div className="flex flex-col gap-16">
                <div className="form-group">
                  <label htmlFor="emp-name" className="form-label">Full Name</label>
                  <input id="emp-name" className="form-input" placeholder="e.g. Alice Martin" value={name} onChange={e => setName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label htmlFor="emp-role" className="form-label">Role</label>
                  <select id="emp-role" className="form-select" value={role} onChange={e => setRole(e.target.value)}>
                    <option value="Pharmacist">💊 Pharmacist</option>
                    <option value="Preparator">⚗️ Preparator</option>
                  </select>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="emp-max-daily" className="form-label">Max Daily Hours</label>
                    <input id="emp-max-daily" className="form-input" type="number" min="1" max="24" step="0.5" value={maxDaily} onChange={e => setMaxDaily(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="emp-max-weekly" className="form-label">Max Weekly Hours</label>
                    <input id="emp-max-weekly" className="form-input" type="number" min="1" max="168" step="0.5" value={maxWeekly} onChange={e => setMaxWeekly(e.target.value)} />
                  </div>
                </div>
                <button type="submit" id="add-employee-submit" className={`btn btn-primary ${saving ? 'btn-loading' : ''}`} disabled={saving}>
                  {!saving && '➕'} Add Employee
                </button>
              </div>
            </form>
          </div>

          {/* Employee List */}
          <div className="card">
            <div className="card-title"><span className="card-title-icon">📋</span>Staff Roster</div>
            {loading ? (
              <div className="empty-state"><div className="spinner" style={{ margin: '0 auto' }}></div></div>
            ) : employees.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">👤</div>
                <div className="empty-state-text">No employees yet</div>
                <div className="empty-state-sub">Add your first employee using the form on the left</div>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Daily Max</th>
                    <th>Weekly Max</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {[...pharmacists, ...preparators].map(emp => (
                    <tr key={emp.id}>
                      <td style={{ fontWeight: 500 }}>{emp.name}</td>
                      <td>
                        <span className={`badge ${emp.role === 'Pharmacist' ? 'badge-pharmacist' : 'badge-preparator'}`}>
                          {emp.role === 'Pharmacist' ? '💊' : '⚗️'} {emp.role}
                        </span>
                      </td>
                      <td className="font-mono text-secondary">{emp.max_daily_hours}h</td>
                      <td className="font-mono text-secondary">{emp.max_weekly_hours}h</td>
                      <td>
                        <button className="btn btn-danger" onClick={() => handleDeleteEmployee(emp.id, emp.name)}>
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="divider"></div>

        {/* Absences Section */}
        <div className="grid-2 gap-24">
          <div className="card">
            <div className="card-title"><span className="card-title-icon">🏖️</span>Record Absence</div>
            <form onSubmit={handleAddAbsence} id="add-absence-form">
              <div className="flex flex-col gap-16">
                <div className="form-group">
                  <label htmlFor="abs-employee" className="form-label">Employee</label>
                  <select id="abs-employee" className="form-select" value={absEmpId} onChange={e => setAbsEmpId(e.target.value)} required>
                    <option value="">— Select employee —</option>
                    {employees.map(e => (
                      <option key={e.id} value={e.id}>{e.name} ({e.role})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="abs-day" className="form-label">Day of Week</label>
                  <select id="abs-day" className="form-select" value={absDay} onChange={e => setAbsDay(e.target.value)}>
                    {DAY_NAMES.map((d, i) => <option key={i} value={i}>{d}</option>)}
                  </select>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="abs-start" className="form-label">Start Hour</label>
                    <input id="abs-start" className="form-input" type="number" min="0" max="23" value={absStart} onChange={e => setAbsStart(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="abs-end" className="form-label">End Hour</label>
                    <input id="abs-end" className="form-input" type="number" min="1" max="24" value={absEnd} onChange={e => setAbsEnd(e.target.value)} />
                  </div>
                </div>
                <button type="submit" id="add-absence-submit" className={`btn btn-outline ${savingAbs ? 'btn-loading' : ''}`} disabled={savingAbs}>
                  {!savingAbs && '🏖️'} Record Absence
                </button>
              </div>
            </form>
          </div>

          <div className="card">
            <div className="card-title"><span className="card-title-icon">📋</span>Planned Absences</div>
            {absences.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">✅</div>
                <div className="empty-state-text">No absences recorded</div>
                <div className="empty-state-sub">All employees are fully available</div>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Day</th>
                    <th>Hours</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {absences.map(a => (
                    <tr key={a.id}>
                      <td style={{ fontWeight: 500 }}>{getEmpName(a.employee_id)}</td>
                      <td>{DAY_NAMES[a.day_of_week]}</td>
                      <td className="font-mono text-secondary">
                        {String(a.start_hour).padStart(2,'0')}:00 – {String(a.end_hour).padStart(2,'0')}:00
                      </td>
                      <td>
                        <button className="btn btn-danger" onClick={() => handleDeleteAbsence(a.id)}>🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
