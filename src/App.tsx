import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { PresenceProvider } from './hooks/usePresence';
import { WhatsappProvider } from './contexts/WhatsappContext';

// Components
import ProtectedRoute from './components/ProtectedRoute';
import ClientProtectedRoute from './components/ClientProtectedRoute';

// Lazy Loaded Pages
const MainApp = lazy(() => import('./pages/MainApp'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminSettings = lazy(() => import('./pages/AdminSettings'));
const AdminClients = lazy(() => import('./pages/AdminClients'));
const AdminVideos = lazy(() => import('./pages/AdminVideos'));
const AdminSales = lazy(() => import('./pages/AdminSales'));
const AdminTools = lazy(() => import('./pages/AdminTools'));
const AdminLeadEngine = lazy(() => import('./pages/AdminLeadEngine'));
const LeadDetail = lazy(() => import('./pages/LeadDetail'));
const AdminNextZap = lazy(() => import('./pages/AdminNextZap'));
const AdminSoraRemover = lazy(() => import('./pages/AdminSoraRemover'));
const AdminScriptGenerator = lazy(() => import('./pages/AdminScriptGenerator'));
const EmployeeProfile = lazy(() => import('./pages/EmployeeProfile'));
const ClientLogin = lazy(() => import('./pages/ClientLogin'));
const ClientDashboard = lazy(() => import('./pages/ClientDashboard'));
const ClientProjects = lazy(() => import('./pages/ClientProjects'));
const ClientPurchases = lazy(() => import('./pages/ClientPurchases'));
const ClientSettings = lazy(() => import('./pages/ClientSettings'));
const AdminProfile = lazy(() => import('./pages/AdminProfile'));

function NeonSuspenseLoader() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#020202]">
      <div className="relative">
        <div className="w-24 h-24 rounded-full border-2 border-primary/20 border-t-primary animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 animate-pulse"></div>
        </div>
        <div className="absolute -inset-10 bg-primary/5 blur-[60px] rounded-full animate-pulse"></div>
      </div>
      <div className="mt-8 text-center space-y-2">
        <h3 className="text-sm font-bold text-white tracking-[0.4em] uppercase animate-pulse">Próximo Ato</h3>
        <p className="text-white/20 text-[10px] uppercase tracking-[0.2em] font-bold">Iniciando Alquimia...</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <WhatsappProvider>
        <PresenceProvider>
          <Suspense fallback={<NeonSuspenseLoader />}>
            <Routes>
              {/* Home */}
              <Route path="/" element={<MainApp />} />
              
              {/* Admin Auth */}
              <Route path="/admin" element={<AdminLogin />} />
              
              {/* Client Routes */}
              <Route path="/client/login" element={<ClientLogin />} />
              <Route path="/client/dashboard" element={<ClientProtectedRoute><ClientDashboard /></ClientProtectedRoute>} />
              <Route path="/client/projects" element={<ClientProtectedRoute><ClientProjects /></ClientProtectedRoute>} />
              <Route path="/client/purchases" element={<ClientProtectedRoute><ClientPurchases /></ClientProtectedRoute>} />
              <Route path="/client/settings" element={<ClientProtectedRoute><ClientSettings /></ClientProtectedRoute>} />

              {/* Protected Admin Routes */}
              <Route path="/admin/dashboard" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/settings" element={<ProtectedRoute requireOwner><AdminSettings /></ProtectedRoute>} />
              <Route path="/admin/profile" element={<ProtectedRoute><AdminProfile /></ProtectedRoute>} />
              <Route path="/admin/clients" element={<ProtectedRoute><AdminClients /></ProtectedRoute>} />
              <Route path="/admin/videos" element={<ProtectedRoute><AdminVideos /></ProtectedRoute>} />
              <Route path="/admin/sales" element={<ProtectedRoute><AdminSales /></ProtectedRoute>} />
              <Route path="/admin/tools" element={<ProtectedRoute><AdminTools /></ProtectedRoute>} />
              <Route path="/admin/lead-engine" element={<ProtectedRoute><AdminLeadEngine /></ProtectedRoute>} />
              <Route path="/admin/lead/:id" element={<ProtectedRoute><LeadDetail /></ProtectedRoute>} />
              <Route path="/admin/nextzap" element={<ProtectedRoute><AdminNextZap /></ProtectedRoute>} />
              <Route path="/admin/sora-remover" element={<ProtectedRoute><AdminSoraRemover /></ProtectedRoute>} />
              <Route path="/admin/script-generator" element={<ProtectedRoute requireOwner><AdminScriptGenerator /></ProtectedRoute>} />
              <Route path="/admin/team/:id" element={<ProtectedRoute><EmployeeProfile /></ProtectedRoute>} />
            </Routes>
          </Suspense>
        </PresenceProvider>
      </WhatsappProvider>
    </BrowserRouter>
  );
}