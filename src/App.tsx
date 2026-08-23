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
import SiteDashboard from './pages/site/Dashboard'
import SitePatients from './pages/site/Patients'
import SitePatientEntry from './pages/site/PatientEntry'
import SiteResultEntry from './pages/site/ResultEntry'
import SiteReportPreview from './pages/site/ReportPreview'
import SiteSettings from './pages/site/Settings'
import Doctors from './pages/site/Doctors'
import DoctorEntry from './pages/site/DoctorEntry'
import IncentiveReport from './pages/site/IncentiveReport'
import Reports from './pages/site/Reports'
import Bill from './pages/site/Bill'

// The client-approved "Soft Cards" direction, built against mock data so it can be
// reviewed as a plain website before it gets wired to the real Electron/IPC backend.
// See src/pages/site — this is intentionally separate from the routes below until
// the design is fully signed off, at which point it replaces them.
const siteRoutes = (
  <Routes>
    <Route path="/site" element={<SiteDashboard />} />
    <Route path="/site/patients" element={<SitePatients />} />
    <Route path="/site/patient/new" element={<SitePatientEntry />} />
    <Route path="/site/report/:id" element={<SiteResultEntry />} />
    <Route path="/site/preview/:id" element={<SiteReportPreview />} />
    <Route path="/site/bill/:id" element={<Bill />} />
    <Route path="/site/doctors" element={<Doctors />} />
    <Route path="/site/doctors/new" element={<DoctorEntry />} />
    <Route path="/site/doctors/:id" element={<IncentiveReport />} />
    <Route path="/site/reports" element={<Reports />} />
    <Route path="/site/settings" element={<SiteSettings />} />
    <Route path="/site/*" element={<Navigate to="/site" replace />} />
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
