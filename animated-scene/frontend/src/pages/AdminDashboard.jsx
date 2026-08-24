import { useEffect, useState, useMemo } from 'react';
import { io } from 'socket.io-client';
import { api } from '../api.js';
import Particles, { ParticlesProvider } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import './AdminDashboard.css';

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || '';
const RECAPTCHA_ENABLED = import.meta.env.VITE_RECAPTCHA_ENABLED === 'true' && !!RECAPTCHA_SITE_KEY;

function loadRecaptchaScript() {
  return new Promise((resolve) => {
    if (window.grecaptcha?.enterprise) return resolve(true);
    const existing = document.getElementById('recaptcha-script');
    if (existing) {
      existing.addEventListener('load', () => resolve(true));
      existing.addEventListener('error', () => resolve(false));
      return;
    }
    const s = document.createElement('script');
    s.id = 'recaptcha-script';
    s.src = `https://www.google.com/recaptcha/enterprise.js?render=${RECAPTCHA_SITE_KEY}`;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.head.appendChild(s);
  });
}

async function getRecaptchaToken() {
  if (!RECAPTCHA_ENABLED) return '';
  const loaded = await loadRecaptchaScript();
  if (!loaded || !window.grecaptcha?.enterprise) return '';
  return new Promise((resolve) => {
    window.grecaptcha.enterprise.ready(async () => {
      try {
        const token = await window.grecaptcha.enterprise.execute(RECAPTCHA_SITE_KEY, { action: 'LOGIN' });
        resolve(token);
      } catch (err) {
        resolve('');
      }
    });
  });
}

function AdminLogin({ onSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function doLogin(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const recaptchaToken = await getRecaptchaToken();
      const data = await api('POST', '/api/admin/login', { email, password, recaptchaToken });
      onSuccess(data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card login">
      <h2>Admin Login</h2>
      <p className="note">Protected area — email/password verified via Firebase Auth.</p>
      <form onSubmit={doLogin}>
        <label>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@exam.gov" autoFocus />
        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Firebase password" />
        <button disabled={busy}>{busy ? 'Verifying...' : 'Login to Dashboard'}</button>
      </form>
      {error && <p className="error">{error}</p>}
    </div>
  );
}

function Dashboard({ token, onLogout, onBack }) {
  const [events, setEvents] = useState([]);
  const [status, setStatus] = useState(null);
  const [credentials, setCredentials] = useState([]);
  const [masterKey, setMasterKey] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [docs, setDocs] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [vaultBusy, setVaultBusy] = useState(false);

  function base64ToBlob(b64, mimeType) {
    const bytes = atob(b64);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    return new Blob([arr], { type: mimeType || 'application/octet-stream' });
  }

  async function checkError(err) {
    if (err.message.toLowerCase().includes('token') || err.message.toLowerCase().includes('unauthorized')) {
      alert('Session expired. Please log in again.');
      onLogout();
    }
  }

  async function loadDocs() {
    try {
      const data = await api('GET', '/api/admin/documents', null, token);
      setDocs(data.documents || []);
    } catch (err) {
      checkError(err);
    }
  }

  async function doUpload(e) {
    e.preventDefault();
    if (!selectedFile) return;
    setVaultBusy(true);
    setNotice('');
    try {
      const reader = new FileReader();
      const b64 = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(selectedFile);
      });
      await api('POST', '/api/admin/document/upload', {
        name: selectedFile.name,
        mimeType: selectedFile.type || 'application/octet-stream',
        data: b64
      }, token);
      setSelectedFile(null);
      e.target.reset();
      setNotice('Document uploaded and encrypted with the reconstructed master key.');
      await loadDocs();
    } catch (err) {
      setNotice('Upload failed: ' + err.message);
    } finally {
      setVaultBusy(false);
    }
  }

  async function doDecrypt(doc) {
    setVaultBusy(true);
    setNotice('');
    try {
      const d = await api('POST', `/api/admin/document/${doc._id}/decrypt`, {}, token);
      const url = URL.createObjectURL(base64ToBlob(d.data, d.mimeType));
      const a = document.createElement('a');
      a.href = url;
      a.download = d.name;
      a.click();
      URL.revokeObjectURL(url);
      setNotice(`"${d.name}" decrypted and downloaded (${Math.round(d.size / 1024)} KB).`);
    } catch (err) {
      setNotice('Decrypt failed: ' + err.message);
    } finally {
      setVaultBusy(false);
    }
  }

  async function refreshStatus() {
    try {
      const data = await api('GET', '/api/admin/status', null, token);
      setStatus(data);
      return data;
    } catch (err) {
      checkError(err);
      throw err;
    }
  }

  function backfillHistory(data) {
    const past = [];
    (data.logs || []).forEach((l) => {
      past.push({
        label: l.status === 'success' ? 'LOGIN' : 'LOGIN FAIL',
        time: new Date(l.loginTime),
        color: l.status === 'success' ? 'green' : 'red',
        data: { name: l.custodianId?.name || l.email || 'System / Admin', message: l.ipAddress || l.status }
      });
    });
    (data.submissions || []).forEach((s) => {
      past.push({
        label: 'SHARE',
        time: new Date(s.submittedAt),
        color: 'blue',
        data: { name: s.name || 'Anonymous Node', message: 'share recorded' }
      });
    });
    past.sort((a, b) => b.time - a.time);
    setEvents(past.slice(0, 40));
  }

  useEffect(() => {
    refreshStatus().then(backfillHistory).catch(() => {});
    const socket = io();
    const add = (label, color) => (data) =>
      setEvents((prev) => [{ label, time: new Date(), data, color }, ...prev].slice(0, 40));
    socket.on('custodian_login', add('LOGIN', 'green'));
    socket.on('share_submitted', add('SHARE', 'blue'));
    socket.on('threshold_met', add('THRESHOLD MET', 'orange'));
    socket.on('key_reconstructed', add('KEY RECONSTRUCTED', 'red'));
    ['custodian_login', 'share_submitted', 'threshold_met', 'key_reconstructed'].forEach((ev) =>
      socket.on(ev, () => refreshStatus().catch(() => {}))
    );
    const poll = setInterval(() => refreshStatus().catch(() => {}), 5000);
    return () => {
      socket.disconnect();
      clearInterval(poll);
    };
  }, [token]);

  async function doSetup() {
    setBusy(true);
    setNotice('');
    try {
      const data = await api('POST', '/api/admin/setup', null, token);
      setCredentials(data.custodians);
      setNotice(data.message);
      await refreshStatus();
    } catch (err) {
      setNotice('Setup failed: ' + err.message);
      checkError(err);
    } finally {
      setBusy(false);
    }
  }

  async function doReset() {
    setBusy(true);
    try {
      await api('POST', '/api/admin/reset-session', null, token);
      setEvents([]);
      setMasterKey('');
      await refreshStatus();
    } finally {
      setBusy(false);
    }
  }

  async function doReconstruct() {
    setBusy(true);
    setNotice('');
    try {
      const data = await api('POST', '/api/admin/reconstruct', {}, token);
      setMasterKey(data.masterKey);
      setNotice(`Key reconstructed using shares from: ${data.usedShares.join(', ')}`);
      await refreshStatus();
    } catch (err) {
      setNotice(err.message);
    } finally {
      setBusy(false);
    }
  }

  const active = status?.session || null;
  const vaultUnlocked = !!active?.masterKeyReconstructed;
  const sysLoad = Math.floor(Math.random() * 30 + 10);
  const encRate = Math.floor(Math.random() * 10 + 90);

  useEffect(() => {
    loadDocs().catch(() => {});
  }, [token]);

  return (
    <div className="cmd-center" style={{ width: '100vw', height: '100vh', margin: 0, borderRadius: 0, position: 'relative', overflowX: 'hidden', overflowY: 'auto' }}>
      
      <div className="cyber-orb orb1"></div>
      <div className="cyber-orb orb2"></div>
      
      {/* HEADER */}
      <div className="cmd-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 30px', borderBottom: '1px solid rgba(0, 255, 204, 0.2)', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <h1 style={{ margin: 0, fontSize: '1.2rem', color: '#00ffcc', letterSpacing: '2px' }}>KAVACH ADMIN</h1>
          <div className="status-indicator" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#10b981' }}>
            <div className="dot" style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%', boxShadow: '0 0 8px #10b981' }}></div>
            NODE: ACTIVE
          </div>
        </div>
        <div style={{ display: 'flex', gap: '15px' }}>
          {onBack && (
            <button onClick={onBack} style={{ background: 'transparent', color: '#00ffcc', border: '1px solid #00ffcc', padding: '8px 20px', cursor: 'pointer', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 'bold' }}>
              ⌂ Home Page
            </button>
          )}
          <button onClick={onLogout} style={{ background: 'rgba(255,0,60,0.1)', color: '#ff003c', border: '1px solid #ff003c', padding: '8px 20px', cursor: 'pointer', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 'bold' }}>
            Logout
          </button>
        </div>
      </div>

      {/* LEFT SIDEBAR (RADAR & METRICS) */}
      <div className="cmd-sidebar">
        <div className="cmd-panel">
          <h3>Global Network Sweep</h3>
          <div className="radar-container">
            <img src="/india-map.svg" alt="India Map" className="radar-map" />
            <div className="radar-sweep"></div>
            {/* Some mock exam center coordinates around India map area */}
            <div className="exam-center" style={{ top: '35%', left: '42%' }}></div>
            <div className="exam-center" style={{ top: '45%', left: '38%' }}></div>
            <div className="exam-center" style={{ top: '55%', left: '50%' }}></div>
            <div className="exam-center" style={{ top: '48%', left: '60%' }}></div>
            <div className="exam-center" style={{ top: '70%', left: '45%' }}></div>
          </div>
        </div>
        
        <div className="cmd-panel">
          <h3>Threshold Protocol</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '10px' }}>
            <div style={{ position: 'relative', width: '100px', height: '100px' }}>
              <svg width="100" height="100" style={{ transform: 'rotate(-90deg)' }}>
                <circle stroke="rgba(255,255,255,0.05)" strokeWidth="8" fill="transparent" r="40" cx="50" cy="50"/>
                <circle 
                  stroke={active?.shareCount >= active?.threshold ? '#10b981' : '#38bdf8'} 
                  strokeWidth="8" 
                  fill="transparent" 
                  r="40" cx="50" cy="50"
                  strokeDasharray={2 * Math.PI * 40} 
                  strokeDashoffset={2 * Math.PI * 40 - (Math.min(((active?.shareCount || 0) / (active?.threshold || 3)) * 100, 100) / 100) * (2 * Math.PI * 40)} 
                  strokeLinecap="round" 
                  style={{ transition: 'stroke-dashoffset 1s ease-in-out, stroke 0.5s' }}
                />
              </svg>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                <span style={{ fontSize: '24px', fontWeight: 'bold', color: active?.shareCount >= active?.threshold ? '#10b981' : '#e2e8f0' }}>
                  {Math.min(((active?.shareCount || 0) / (active?.threshold || 3)) * 100, 100).toFixed(0)}%
                </span>
              </div>
            </div>
            <div className="system-metrics" style={{ flex: 1 }}>
              <div className="metric"><span>SHARES HELD</span> <span style={{color: '#38bdf8'}}>{active?.shareCount || 0}</span></div>
              <div className="metric"><span>THRESHOLD</span> <span style={{color: '#8b5cf6'}}>{active?.threshold || 3}</span></div>
              <div className="metric"><span>TOTAL NODES</span> <span>{active?.total || 5}</span></div>
              <div className="metric" style={{ marginTop: '10px', color: active?.shareCount >= active?.threshold ? '#10b981' : '#f43f5e' }}>
                {active?.shareCount >= active?.threshold ? '🔓 MASTER KEY RECONSTRUCTED' : '🔒 VAULT SECURED'}
              </div>
            </div>
          </div>
        </div>

        <div className="cmd-panel">
          <h3>Authentication Analytics</h3>
          <div className="aesthetic-bar-chart">
             {status?.logs?.slice(0, 20).reverse().map((l, i) => (
                <div key={i} className="aesthetic-bar-container" title={`${l.custodianId?.name || l.email || 'Admin'} - ${l.status}`}>
                   <div className={`aesthetic-bar ${l.status === 'success' ? 'success' : 'fail'}`} 
                        style={{ height: l.status === 'success' ? '100%' : '40%', animationDelay: `${i * 0.05}s` }}>
                   </div>
                </div>
             ))}
             {(!status?.logs || status?.logs.length === 0) && <p className="note">No analytics data available yet.</p>}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748b', marginTop: '10px' }}>
             <span>Older</span>
             <span>Recent Events &rarr;</span>
          </div>
        </div>
      </div>

      {/* MAIN CENTER (ACTIONS & VAULT) */}
      <div className="cmd-main">
        <div className="cmd-panel">
          <h3>Operations Command</h3>
          <div className="cmd-action-buttons">
            <button onClick={doSetup} disabled={busy}>Deploy 5 Custodians</button>
            <button onClick={doReset} disabled={busy} className="danger">Purge RAM Shares</button>
            <button onClick={doReconstruct} disabled={busy || !active || active.shareCount < active.threshold} className="primary">
              Reconstruct Key ({active ? active.shareCount : 0}/{active ? active.threshold : 3})
            </button>
          </div>
          {notice && <p className="note">{notice}</p>}
          {masterKey && (
             <div className="keybox">
               <h3>Reconstructed Master Key</h3>
               <code>{masterKey}</code>
             </div>
          )}
        </div>

        <div className="cmd-panel vault">
          <h3>Secret Document Vault</h3>
          {active ? (
            <div className="meter">
              {Array.from({ length: active.total }, (_, i) => (
                <span key={i} className={i < active.shareCount ? 'filled' : 'empty'} title={`Share ${i + 1}`} />
              ))}
              <p>{active.shareCount} of {active.total} shares • Need {active.threshold} • {active.shareCount >= active.threshold ? 'VAULT UNLOCKED' : 'VAULT SECURED'}</p>
            </div>
          ) : (
            <p className="note">No active session.</p>
          )}

          <div style={{ marginTop: '20px' }}>
            <p className="note">Vault Access: <span className="success">ADMIN OVERRIDE ENABLED</span> (AES-256-GCM).</p>
            <form onSubmit={doUpload} className="row" style={{ marginTop: '15px' }}>
              <input type="file" onChange={(e) => setSelectedFile(e.target.files[0] || null)} style={{ padding: '8px', fontSize: '12px' }} />
              <button type="submit" disabled={vaultBusy || !selectedFile} className="primary" style={{ padding: '10px 15px', fontSize: '12px' }}>
                {vaultBusy ? 'Encrypting...' : 'Upload & Encrypt'}
              </button>
            </form>
            <ul className="events" style={{ marginTop: '15px' }}>
              {docs.length === 0 && <p className="note">No documents in vault.</p>}
              {docs.map((doc) => (
                <li key={doc._id}>
                  <span className="pill blue">SECURE</span>
                  <span>{doc.name}</span>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button onClick={() => doDecrypt(doc)} disabled={vaultBusy} className="ghost small-btn">
                      Decrypt
                    </button>
                    <button onClick={async () => {
                      if (!confirm('Delete this document forever?')) return;
                      setVaultBusy(true);
                      try {
                        await api('DELETE', `/api/admin/document/${doc._id}`, null, token);
                        await loadDocs();
                      } catch (e) {
                        alert('Error: ' + e.message);
                      } finally {
                        setVaultBusy(false);
                      }
                    }} disabled={vaultBusy} className="ghost small-btn" style={{ borderColor: '#f43f5e', color: '#f43f5e' }}>
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* RIGHT SIDEBAR (LOGS) */}
      <div className="cmd-right">
        <div className="cmd-panel">
          <h3>Live Socket.io Feed</h3>
          <ul className="events" style={{ maxHeight: '200px' }}>
            {events.length === 0 && <p className="note">Listening...</p>}
            {events.map((ev, i) => (
              <li key={i} style={{ borderLeft: `3px solid var(--${ev.color})` }}>
                <span className={`pill ${ev.color}`}>{ev.label}</span>
                <span className="muted">
                  {ev.data?.name ? ev.data.name : ''} {ev.data?.message || ''}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="cmd-panel">
          <h3>Detailed Access Logs</h3>
          <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '5px' }}>
             {status?.logs?.length === 0 && <p className="note">No history.</p>}
             {status?.logs?.map((l, i) => {
               const timeStr = new Date(l.loginTime).toLocaleTimeString('en-US', { hour12: false });
               const dateStr = new Date(l.loginTime).toLocaleDateString('en-GB');
               const name = l.custodianId?.name || 'System / Admin';
               const role = l.custodianId?.role || 'Master Node';
               return (
                 <div key={i} className="access-log-item" style={{ borderLeft: `3px solid ${l.status === 'success' ? '#10b981' : '#f43f5e'}` }}>
                   <div className="access-log-header">
                     <span className="access-log-time">{dateStr} {timeStr}</span>
                     <span className={`pill ${l.status === 'success' ? 'green' : 'red'}`}>{l.status.toUpperCase()}</span>
                   </div>
                   <div className="access-log-body">
                     <div>
                       <span className="access-log-user">{name}</span>
                       <span className="access-log-role">({role})</span>
                     </div>
                     <span className="access-log-ip">IP: {l.ipAddress || 'Unknown'}</span>
                   </div>
                 </div>
               );
             })}
          </div>
        </div>
      </div>

      {/* BOTTOM AREA (CREDENTIALS) */}
      {credentials.length > 0 && (
        <div className="cmd-panel" style={{ marginTop: '20px', border: '2px solid #00ffcc', boxShadow: '0 0 20px rgba(0,255,204,0.3)', width: '100%', maxWidth: '1000px', margin: '20px auto' }}>
          <h3 style={{ color: '#00ffcc', textAlign: 'center', fontSize: '1.5rem', marginBottom: '10px' }}>NEW CUSTODIAN CREDENTIALS GENERATED</h3>
          <p className="note" style={{ textAlign: 'center', marginBottom: '20px' }}>Save these credentials now. They will not be shown again.</p>
          <div className="cmd-creds-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', maxWidth: '800px', margin: '0 auto' }}>
             {credentials.map((c) => (
               <div key={c.email} style={{ background: 'rgba(0,0,0,0.4)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(0,255,204,0.2)', textAlign: 'left' }}>
                 <p style={{ margin: '0 0 10px 0', color: '#fff', fontWeight: 'bold' }}>{c.name} <span style={{ color: '#888', fontWeight: 'normal' }}>({c.role})</span></p>
                 <div style={{ marginBottom: '10px' }}>
                   <label style={{ display: 'block', fontSize: '10px', color: '#00ffcc' }}>OPERATIVE ID (EMAIL)</label>
                   <code style={{ color: '#fff', fontSize: '12px' }}>{c.email}</code>
                 </div>
                 <div style={{ marginBottom: '10px' }}>
                   <label style={{ display: 'block', fontSize: '10px', color: '#ff003c' }}>PASSWORD / SECURITY KEY</label>
                   <code style={{ color: '#ff003c', fontSize: '14px', fontWeight: 'bold' }}>{c.tempPassword}</code>
                 </div>
                 <div style={{ marginBottom: '10px', textAlign: 'center' }}>
                   <label style={{ display: 'block', fontSize: '10px', color: '#00ffcc', textAlign: 'left' }}>TOTP QR (GOOGLE AUTH)</label>
                   <img src={c.qrDataUrl} alt="TOTP QR" style={{ width: '100%', maxWidth: '120px', background: '#fff', padding: '5px', borderRadius: '4px', marginTop: '5px' }} />
                 </div>
                 <div style={{ marginBottom: '5px' }}>
                   <label style={{ display: 'block', fontSize: '10px', color: '#00ffcc' }}>TOTP SECRET (MANUAL ENTRY)</label>
                   <code style={{ color: '#fff', fontSize: '11px', wordBreak: 'break-all' }}>{c.totpSecret}</code>
                 </div>
               </div>
             ))}
          </div>
        </div>
      )}

    </div>
  );
}

export default function AdminDashboard({ onBack }) {
  const [token, setToken] = useState(() => localStorage.getItem('admin_token') || '');

  const particlesOptions = useMemo(
    () => ({
      background: {
        color: {
          value: "#000000",
        },
      },
      fpsLimit: 120,
      interactivity: {
        events: {
          onClick: { enable: true, mode: "push" },
          onHover: { enable: true, mode: "grab" },
        },
        modes: {
          push: { quantity: 3 },
          grab: { distance: 140, links: { opacity: 0.5 } },
        },
      },
      particles: {
        color: { value: "#ffffff" },
        links: {
          color: "#ffffff",
          distance: 150,
          enable: true,
          opacity: 0.15,
          width: 1,
        },
        move: {
          direction: "none",
          enable: true,
          outModes: { default: "bounce" },
          random: false,
          speed: 0.8,
          straight: false,
        },
        number: {
          density: { enable: true },
          value: 80,
        },
        opacity: { value: 0.3 },
        shape: { type: "circle" },
        size: { value: { min: 1, max: 2 } },
      },
      detectRetina: true,
    }),
    [],
  );

  const initParticles = useMemo(() => async (engine) => {
    await loadSlim(engine);
  }, []);

  return (
    <ParticlesProvider init={initParticles}>
      <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
        <Particles id="tsparticles" options={particlesOptions} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: -10 }} />
        
        {!token ? (
          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
            <AdminLogin
              onSuccess={(t) => {
                localStorage.setItem('admin_token', t);
                setToken(t);
              }}
            />
            {onBack && (
              <button onClick={onBack} style={{ display: 'block', margin: '20px auto 0', background: 'transparent', color: '#38bdf8', border: '1px solid #38bdf8', padding: '10px 20px', cursor: 'pointer', borderRadius: '4px' }}>
                BACK TO HOME
              </button>
            )}
          </div>
        ) : (
          <Dashboard
            token={token}
            onLogout={() => {
              localStorage.removeItem('admin_token');
              setToken('');
            }}
            onBack={onBack}
          />
        )}
      </div>
    </ParticlesProvider>
  );
}
