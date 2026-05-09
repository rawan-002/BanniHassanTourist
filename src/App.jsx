

import React, { useEffect } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';

import { AuthProvider }        from './application/contexts/AuthContext.jsx';
import { SystemAdminProvider } from './application/contexts/SystemAdminContext.jsx';

import theme from './presentation/theme/muiTheme.js';

import Layout          from './presentation/layouts/Layout.jsx';
import ProtectedRoute  from './presentation/components/ProtectedRoute.jsx';
import LocationFetcher from './presentation/components/LocationFetcher.jsx';
import ScrollToTop     from './presentation/components/ScrollToTop.jsx';

import AdminLogin           from './presentation/components/AdminLogin.jsx';
import AdminSignup          from './presentation/components/AdminSignup.jsx';
import SystemAdminLogin     from './presentation/components/SystemAdminLogin.jsx';
import SystemAdminSignup    from './presentation/components/SystemAdminSignup.jsx';
import SystemAdminDashboard from './presentation/components/SystemAdminDashboard.jsx';

import HomePage           from './presentation/pages/HomePage.jsx';
import ViewpointsPage     from './presentation/pages/ViewpointsPage.jsx';
import CafesPage          from './presentation/pages/CafesPage.jsx';
import DamsPage           from './presentation/pages/DamsPage.jsx';
import ParksPage          from './presentation/pages/ParksPage.jsx';
import ParkDetailsPage    from './presentation/pages/ParkDetailsPage.jsx';
import FarmsPage          from './presentation/pages/FarmsPage.jsx';
import FarmDetailsPage    from './presentation/pages/FarmDetailsPage.jsx';
import HousingPage        from './presentation/pages/HousingPage.jsx';
import HousingDetailsPage from './presentation/pages/HousingDetailsPage.jsx';
import AdminPanel         from './presentation/pages/AdminPanel.jsx';

function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', backgroundColor:'#fff5f5', fontFamily:"'RH-Zak Reg',Arial,sans-serif" }}>
      <div style={{ textAlign:'center', padding:'2rem', backgroundColor:'white', borderRadius:'10px', boxShadow:'0 4px 6px rgba(0,0,0,0.1)' }}>
        <h2 style={{ color:'#dc3545', marginBottom:'1rem' }}>❌ الصفحة غير موجودة</h2>
        <p style={{ color:'#666', marginBottom:'1rem' }}>عذراً، الصفحة التي تبحث عنها غير متوفرة</p>
        <button onClick={() => navigate('/')} style={{ backgroundColor:'#4D3873', color:'white', padding:'0.5rem 1.5rem', border:'none', borderRadius:'8px', cursor:'pointer', fontFamily:"'RH-Zak Reg',Arial,sans-serif", fontWeight:600 }}>
          العودة للصفحة الرئيسية
        </button>
      </div>
    </div>
  );
}

export default function App() {
  useEffect(() => {
    document.title = 'بني حسن - دليل المواقع السياحية';
    const loader = document.getElementById('initial-loading');
    if (loader) {
      const t = setTimeout(() => { loader.classList.add('fade-out'); setTimeout(() => { loader.style.display = 'none'; }, 500); }, 1500);
      return () => clearTimeout(t);
    }
  }, []);

  return (
    <AuthProvider>
      <SystemAdminProvider>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <BrowserRouter>
            <ScrollToTop />
            <Routes>
              <Route path="/admin-signup"               element={<AdminSignup />} />
              <Route path="/admin-login"                element={<AdminLogin />} />
              <Route path="/system-admin/login"         element={<SystemAdminLogin />} />
              <Route path="/system-admin/signup"        element={<SystemAdminSignup />} />
              <Route path="/system-admin/dashboard"     element={<ProtectedRoute><SystemAdminDashboard /></ProtectedRoute>} />
              <Route path="/admin"                      element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />
              <Route path="/" element={<Layout />}>
                <Route index                     element={<HomePage />} />
                <Route path="location"           element={<LocationFetcher />} />
                <Route path="viewpoints"         element={<ViewpointsPage />} />
                <Route path="cafes"              element={<CafesPage />} />
                <Route path="dams"               element={<DamsPage />} />
                <Route path="parks"              element={<ParksPage />} />
                <Route path="parks/:id"          element={<ParkDetailsPage />} />
                <Route path="farms"              element={<FarmsPage />} />
                <Route path="farms/:id"          element={<FarmDetailsPage />} />
                <Route path="housing"            element={<HousingPage />} />
                <Route path="housing/:id"        element={<HousingDetailsPage />} />
                <Route path="*"                  element={<NotFoundPage />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </ThemeProvider>
      </SystemAdminProvider>
    </AuthProvider>
  );
}
