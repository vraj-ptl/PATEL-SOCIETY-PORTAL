import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { motion, AnimatePresence } from 'framer-motion';
import ThreeBackground from './components/ThreeBackground';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Members from './pages/Members';
import Loans from './pages/Loans';
import Accounting from './pages/Accounting';
import FeeTracker from './pages/FeeTracker';
import About from './pages/About';
import ForgotPassword from './pages/ForgotPassword';
import Sidebar from './components/Sidebar';

function AppContent() {
  const location = useLocation();
  const isAuthPage = ['/login', '/forgot-password'].includes(location.pathname);

  return (
    <>
      {/* 3D Global Canvas Background */}
      <div className="canvas-container">
        <Canvas camera={{ position: [0, 0, 10], fov: 45 }}>
          <ThreeBackground />
        </Canvas>
      </div>

      {/* DOM UI Overlays */}
      <div className="app-container">
        <AnimatePresence mode="wait">
          {isAuthPage ? (
            <motion.div 
              key="auth"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="auth-layout"
            >
              <Routes location={location} key={location.pathname}>
                <Route path="/login" element={<Login />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            </motion.div>
          ) : (
            <motion.div 
              key="dashboard-layout"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="dashboard-layout glass-panel" 
              style={{ margin: '1.5rem', flex: 1, overflow: 'hidden' }}
            >
              <Sidebar />
              <main className="main-content">
                <AnimatePresence mode="wait">
                  <Routes location={location} key={location.pathname}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/members" element={<Members />} />
                    <Route path="/loans" element={<Loans />} />
                    <Route path="/fees" element={<FeeTracker />} />
                    <Route path="/accounting" element={<Accounting />} />
                    <Route path="/about" element={<About />} />
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </AnimatePresence>
              </main>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
