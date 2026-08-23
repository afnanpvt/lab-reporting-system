import { useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useReport } from './store/useReport'
import Layout from './components/layout/Layout'
import Start from './pages/Start'
import PatientEntry from './pages/PatientEntry'
import EditPatient from './pages/EditPatient'
import ReportEntry from './pages/ReportEntry'
import ReportPreview from './pages/ReportPreview'
import Settings from './pages/Settings'
import SiteStart from './pages/site/Start'
import SitePatientEntry from './pages/site/PatientEntry'
import Doctors from './pages/site/Doctors'
import IncentiveReport from './pages/site/IncentiveReport'

// The client-approved "Soft Cards" direction, built against mock data so it can be
// reviewed as a plain website before it gets wired to the real Electron/IPC backend.
// See src/pages/site — this is intentionally separate from the routes below until
// the design is fully signed off, at which point it replaces them.
const siteRoutes = (
  <Routes>
    <Route path="/site" element={<SiteStart />} />
    <Route path="/site/patient/new" element={<SitePatientEntry />} />
    <Route path="/site/doctors" element={<Doctors />} />
    <Route path="/site/doctors/:id" element={<IncentiveReport />} />
  </Routes>
)

export default function App() {
  const loadSettings = useReport((s) => s.loadSettings)
  const location = useLocation()

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  if (location.pathname.startsWith('/site')) {
    return siteRoutes
  }

  return (
    <Layout>
      <Routes>
        {/* Soft Cards is the client-confirmed direction — opening the app with no route lands there directly. */}
        <Route path="/" element={<Navigate to="/site" replace />} />
        <Route path="/legacy" element={<Start />} />
        <Route path="/patient/new" element={<PatientEntry />} />
        <Route path="/patient/:id/edit" element={<EditPatient />} />
        <Route path="/report/:id" element={<ReportEntry />} />
        <Route path="/preview/:id" element={<ReportPreview />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}
