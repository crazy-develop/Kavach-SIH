import React, { useState } from 'react';
import './AuthModal.css';
import CustodianFlow from './pages/CustodianFlow.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';

export default function AuthModal({ onClose, initialRoute = '/custodian' }) {
  const [route, setRoute] = useState(initialRoute);

  return (
    <div className="auth-modal-overlay">
      <div className={`auth-modal-content ${route === '/admin' ? 'full-page-mode' : ''}`}>
        <button className="auth-close-btn" onClick={onClose}>×</button>
        
        <div className="auth-app">
          <nav className="auth-topnav">
            <span className="auth-brand">KAVACH <small>Threshold Authentication System</small></span>
            <div className="auth-navlinks">
              <button 
                className={route === '/custodian' ? 'active' : ''} 
                onClick={() => setRoute('/custodian')}
              >
                Custodian Login
              </button>
              <button 
                className={route === '/admin' ? 'active' : ''} 
                onClick={() => setRoute('/admin')}
              >
                Admin Dashboard
              </button>
            </div>
          </nav>
          
          <div className="auth-body">
            {route === '/admin' ? <AdminDashboard onBack={onClose} /> : <CustodianFlow />}
          </div>
        </div>
      </div>
    </div>
  );
}
