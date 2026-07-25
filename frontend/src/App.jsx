import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import ProtectedRoute from './components/common/ProtectedRoute.jsx'
import MainLayout from './components/layout/MainLayout.jsx'

// Pages
import LoginPage from './pages/LoginPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import ResumesPage from './pages/ResumesPage.jsx'
import JobsPage from './pages/JobsPage.jsx'
import NewAnalysisPage from './pages/NewAnalysisPage.jsx'
import AnalysisDetailPage from './pages/AnalysisDetailPage.jsx'
import AnalysisHistoryPage from './pages/AnalysisHistoryPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public routes */}
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected routes wrapped in MainLayout */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/"                         element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard"                element={<DashboardPage />} />
            <Route path="/resumes"                  element={<ResumesPage />} />
            <Route path="/jobs"                     element={<JobsPage />} />
            <Route path="/analysis/new"             element={<NewAnalysisPage />} />
            <Route path="/analysis"                 element={<AnalysisHistoryPage />} />
            <Route path="/analysis/:id"             element={<AnalysisDetailPage />} />
            <Route path="/profile"                  element={<ProfilePage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AuthProvider>
  )
}
