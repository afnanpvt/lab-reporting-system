import { useEffect, useMemo, useState } from 'react'
import { confirmDialog } from './confirmStore'
import { useNavigate } from 'react-router-dom'
import { Stethoscope, Phone, Plus, Pencil, Trash2, Search, ChevronRight } from 'lucide-react'
import { listDoctors, deleteDoctor, type Doctor } from './api'
import { searchDoctors } from './fuzzySearch'
import ViewToggle, { useViewMode } from './ViewToggle'

/** The directory of referring doctors. Opening one shows their referrals and the incentive report. */
export default function Doctors() {
  const navigate = useNavigate()
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [view, changeView] = useViewMode('labapp:doctorsView')
  const [query, setQuery] = useState('')

  const refresh = () => listDoctors().then(setDoctors)
  useEffect(() => { refresh() }, [])

  // Forgiving search (typos, spellings, qualifications, speciality): best matches first; with no
  // search typed, everyone in name order.
  const results = useMemo(() => {
    if (!query.trim()) return [...doctors].sort((a, b) => a.name.localeCompare(b.name)).map((doctor) => ({ doctor, score: 1 }))
    return searchDoctors(doctors, query)
  }, [doctors, query])
  const shown = results.map((r) => r.doctor)
  const guessing = query.trim() !== '' && results.length > 0 && results[0].score < 0.85

  const open = (d: Doctor) => navigate(`/doctors/${d.id}`)

  const removeDoctor = async (e: React.MouseEvent, d: Doctor) => {
    e.stopPropagation()
    const ok = await confirmDialog({
      tone: 'danger',
      title: 'Delete this doctor?',
      subject: d.name,
      message: 'This only removes them from your list. Patients already referred by them keep their existing records.',
      confirmLabel: 'Delete doctor'
    })
    if (!ok) return
    await deleteDoctor(d.id)
    refresh()
  }

  const editDoctor = (e: React.MouseEvent, d: Doctor) => {
    e.stopPropagation()
    navigate('/doctors/new', { state: { doctor: d } })
  }

  const iconBtn = 'w-8 h-8 flex items-center justify-center rounded-lg text-[var(--ink-4)]'
  const actions = (d: Doctor) => (
    <div className="flex items-center gap-0.5">
      <button type="button" onClick={(e) => editDoctor(e, d)} title="Edit doctor" aria-label={`Edit ${d.name}`} className={`${iconBtn} hover:text-[var(--accent-ink)] hover:bg-[var(--accent-soft)]`}>
        <Pencil size={14} />
      </button>
      <button type="button" onClick={(e) => removeDoctor(e, d)} title="Delete doctor" aria-label={`Delete ${d.name}`} className={`${iconBtn} hover:text-[var(--danger)] hover:bg-[var(--danger-soft)]`}>
        <Trash2 size={14} />
      </button>
      <ChevronRight size={16} className="text-[var(--ink-4)] ml-1" />
    </div>
  )
  const keyOpen = (d: Doctor) => (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(d) } }

  return (
    <main className="px-10 py-9">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[26px] font-semibold text-[var(--ink)]">Doctors</h1>
          <p className="text-[15px] text-[var(--ink-2)]">{doctors.length} referring doctor{doctors.length === 1 ? '' : 's'} · open one to see their referrals and incentive report</p>
        </div>
        <button
          onClick={() => navigate('/doctors/new')}
          className="inline-flex items-center gap-2 px-5 py-3 bg-[var(--accent)] text-white text-[15px] font-medium rounded-2xl hover:bg-[var(--accent-ink)] shadow-sm"
        >
          <Plus size={16} />
          New Doctor
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-[16rem] max-w-md">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-4)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, qualification, speciality or phone"
            aria-label="Search doctors"
            className="w-full pl-10 pr-3.5 py-2.5 text-[14px] rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring-40)]"
          />
        </div>
        <div className="ml-auto"><ViewToggle mode={view} onChange={changeView} /></div>
      </div>

      {guessing && <p className="text-[13px] text-[var(--ink-3)] mb-3">No exact match for "{query.trim()}". Showing the closest doctors.</p>}

      {shown.length === 0 ? (
        <p className="text-[14.5px] text-[var(--ink-3)] py-10 text-center">{doctors.length === 0 ? 'No doctors added yet.' : 'No doctors match your search.'}</p>
      ) : view === 'list' ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-x-auto">
          <table className="w-full text-[14px]">
            <thead>
              <tr className="text-left text-[11.5px] font-bold uppercase tracking-wide text-[var(--ink-3)] border-b border-[var(--border)]">
                <th className="px-5 py-3">Doctor</th>
                <th className="px-3 py-3">Speciality</th>
                <th className="px-3 py-3">Phone</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {shown.map((d) => (
                <tr key={d.id} tabIndex={0} onClick={() => open(d)} onKeyDown={keyOpen(d)} className="border-b border-[var(--border-soft)] last:border-0 hover:bg-[var(--bg-hover)] cursor-pointer focus:outline-none focus:bg-[var(--bg-hover)]">
                  <td className="px-5 py-3">
                    <div className="font-semibold text-[var(--ink)]">{d.name}</div>
                    {d.qualifications && <div className="text-[12.5px] text-[var(--ink-3)]">{d.qualifications}</div>}
                  </td>
                  <td className="px-3 py-3 text-[var(--ink-2)]">{d.specialty}</td>
                  <td className="px-3 py-3 text-[var(--ink-2)] whitespace-nowrap">{d.phone}</td>
                  <td className="px-5 py-3"><div className="flex justify-end">{actions(d)}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {shown.map((d) => (
            <div
              key={d.id}
              role="button"
              tabIndex={0}
              onClick={() => open(d)}
              onKeyDown={keyOpen(d)}
              className="rounded-2xl p-5 border shadow-sm hover:shadow-md transition-shadow cursor-pointer bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring-40)]"
              style={{ borderColor: 'var(--border)' }}
            >
              <div className="flex items-start justify-between mb-3.5">
                <div className="w-10 h-10 rounded-full bg-[var(--bg-hover)] flex items-center justify-center">
                  <Stethoscope size={17} className="text-[var(--ink-3)]" />
                </div>
                {actions(d)}
              </div>
              <div className="text-[16.5px] font-semibold text-[var(--ink)] mb-0.5">{d.name}</div>
              {d.qualifications && <div className="text-[13px] text-[var(--ink-3)] mb-0.5">{d.qualifications}</div>}
              <div className="text-[13.5px] text-[var(--ink-2)] mb-3">{d.specialty}</div>
              <div className="flex items-center gap-1.5 text-[13px] text-[var(--ink-3)]">
                <Phone size={12} />
                {d.phone}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
