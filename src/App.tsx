import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Shell from './pages/site/Shell'
import Dashboard from './pages/site/Dashboard'
import Patients from './pages/site/Patients'
import PatientEntry from './pages/site/PatientEntry'
import ResultEntry from './pages/site/ResultEntry'
import ReportPreview from './pages/site/ReportPreview'
import Settings from './pages/site/Settings'
import Doctors from './pages/site/Doctors'
import DoctorEntry from './pages/site/DoctorEntry'
import IncentiveReport from './pages/site/IncentiveReport'
import Reports from './pages/site/Reports'
import Bill from './pages/site/Bill'
import TrialExpired from './pages/site/TrialExpired'

export default function App() {
  // Blocks the entire app — no Shell, no routes, nothing — once a trial license's expiresAt has
  // passed. Checked once at startup rather than per-route: a trial customer isn't meant to see
  // any part of the app, not even the shell chrome, once it's over. `null` means "still checking"
  // so we don't flash the real app before the check resolves.
  const [trialExpired, setTrialExpired] = useState<{ labName?: string; expiresAt?: string } | null>(null)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    window.api.license.status().then((status) => {
      setTrialExpired(status.expired ? { labName: status.labName, expiresAt: status.expiresAt } : null)
      setChecked(true)
    })
  }, [])

  if (!checked) return null
  if (trialExpired) return <TrialExpired labName={trialExpired.labName} expiresAt={trialExpired.expiresAt} />

  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/patients" element={<Patients />} />
        <Route path="/patient/new" element={<PatientEntry />} />
        <Route path="/report/:id" element={<ResultEntry />} />
        <Route path="/preview/:id" element={<ReportPreview />} />
        <Route path="/bill/:id" element={<Bill />} />
        <Route path="/doctors" element={<Doctors />} />
        <Route path="/doctors/new" element={<DoctorEntry />} />
        <Route path="/doctors/:id" element={<IncentiveReport />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  )
}
