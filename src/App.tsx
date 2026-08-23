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
import DesignsIndex from './pages/designs/DesignsIndex'
import Design1ClinicalMinimal from './pages/designs/Design1ClinicalMinimal'
import Design2CommandConsole from './pages/designs/Design2CommandConsole'
import Design3SoftCards from './pages/designs/Design3SoftCards'
import Design4DarkPro from './pages/designs/Design4DarkPro'
import Design5CompactUtility from './pages/designs/Design5CompactUtility'
import Design1PatientEntry from './pages/designs/Design1PatientEntry'
import Design2PatientEntry from './pages/designs/Design2PatientEntry'
import Design3PatientEntry from './pages/designs/Design3PatientEntry'
import Design4PatientEntry from './pages/designs/Design4PatientEntry'
import Design5PatientEntry from './pages/designs/Design5PatientEntry'
import Design2ReportEntry from './pages/designs/Design2ReportEntry'
import Design5ReportEntry from './pages/designs/Design5ReportEntry'
import Design2ReportPreview from './pages/designs/Design2ReportPreview'
import Design5ReportPreview from './pages/designs/Design5ReportPreview'
import Design2Settings from './pages/designs/Design2Settings'
import Design5Settings from './pages/designs/Design5Settings'
import Design6Start from './pages/designs/Design6Start'
import Design6NewPatient from './pages/designs/Design6NewPatient'
import Design6ChooseTests from './pages/designs/Design6ChooseTests'
import Design6ResultEntry from './pages/designs/Design6ResultEntry'
import Design6ReportPreview from './pages/designs/Design6ReportPreview'
import Design6Settings from './pages/designs/Design6Settings'

const designRoutes = (
  <Routes>
    <Route path="/designs" element={<DesignsIndex />} />
    <Route path="/designs/1" element={<Design1ClinicalMinimal />} />
    <Route path="/designs/2" element={<Design2CommandConsole />} />
    <Route path="/designs/3" element={<Design3SoftCards />} />
    <Route path="/designs/4" element={<Design4DarkPro />} />
    <Route path="/designs/5" element={<Design5CompactUtility />} />
    <Route path="/designs/6" element={<Design6Start />} />
    <Route path="/designs/1/new" element={<Design1PatientEntry />} />
    <Route path="/designs/2/new" element={<Design2PatientEntry />} />
    <Route path="/designs/3/new" element={<Design3PatientEntry />} />
    <Route path="/designs/4/new" element={<Design4PatientEntry />} />
    <Route path="/designs/5/new" element={<Design5PatientEntry />} />
    <Route path="/designs/6/new" element={<Design6NewPatient />} />
    <Route path="/designs/6/tests" element={<Design6ChooseTests />} />
    <Route path="/designs/2/report" element={<Design2ReportEntry />} />
    <Route path="/designs/5/report" element={<Design5ReportEntry />} />
    <Route path="/designs/6/report" element={<Design6ResultEntry />} />
    <Route path="/designs/2/preview" element={<Design2ReportPreview />} />
    <Route path="/designs/5/preview" element={<Design5ReportPreview />} />
    <Route path="/designs/6/preview" element={<Design6ReportPreview />} />
    <Route path="/designs/2/settings" element={<Design2Settings />} />
    <Route path="/designs/5/settings" element={<Design5Settings />} />
    <Route path="/designs/6/settings" element={<Design6Settings />} />
  </Routes>
)

export default function App() {
  const loadSettings = useReport((s) => s.loadSettings)
  const location = useLocation()

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  if (location.pathname.startsWith('/designs')) {
    return designRoutes
  }

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
