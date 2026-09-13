import { useEffect } from 'react'
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
import { refreshLicense, useLicense } from './pages/site/licenseStore'

export default function App() {
  const license = useLicense()

  useEffect(() => {
    refreshLicense()
  }, [])

  // Render nothing until the license is known, so the app never flashes before an expired-trial lock.
  if (!license) return null
  if (license.state === 'expired') return <TrialExpired license={license} />

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
