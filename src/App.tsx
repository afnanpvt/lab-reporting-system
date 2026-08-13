import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useReport } from './store/useReport'
import Layout from './components/layout/Layout'
import Start from './pages/Start'
import PatientEntry from './pages/PatientEntry'
import EditPatient from './pages/EditPatient'
import ReportEntry from './pages/ReportEntry'
import ReportPreview from './pages/ReportPreview'
import Settings from './pages/Settings'

export default function App() {
  const loadSettings = useReport((s) => s.loadSettings)

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Start />} />
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
