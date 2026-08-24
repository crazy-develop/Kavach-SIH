import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { api } from '../api.js';

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

const ConstellationBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let width, height;
    let particles = [];

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      initParticles();
    };

    const initParticles = () => {
      particles = [];
      const numParticles = Math.floor((width * height) / 12000);
      for (let i = 0; i < numParticles; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.8,
          vy: (Math.random() - 0.5) * 0.8,
          radius: Math.random() * 1.5 + 0.5
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      // Cyan/Blue theme for particles
      ctx.fillStyle = 'rgba(0, 240, 255, 0.8)';
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.15)';
      ctx.lineWidth = 0.8;

      for (let i = 0; i < particles.length; i++) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > width) p.vx = -p.vx;
        if (p.y < 0 || p.y > height) p.vy = -p.vy;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          let p2 = particles[j];
          let dist = Math.sqrt((p.x - p2.x) ** 2 + (p.y - p2.y) ** 2);
          if (dist < 110) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }
      animationFrameId = requestAnimationFrame(draw);
    };

    window.addEventListener('resize', resize);
    resize();
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 0, background: '#03070b' }} />;
};

const AdminTheme = () => (
  <style>{`
    body {
      background-color: transparent !important;
    }
    html, #root, .app {
      background-color: transparent !important;
    }
    body::before {
      content: "";
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: radial-gradient(circle at 50% 50%, #061224 0%, #010306 100%);
      z-index: -2;
    }
    .admin-override {
      position: relative;
      z-index: 10;
      font-family: 'Consolas', 'Courier New', monospace;
    }
    .topnav {
      border-bottom: 1px solid rgba(0, 240, 255, 0.15) !important;
      background: linear-gradient(90deg, rgba(0,240,255,0.05) 0%, transparent 50%, rgba(0,240,255,0.05) 100%);
    }
    .admin-override .card {
      background: linear-gradient(145deg, rgba(4, 18, 35, 0.85), rgba(1, 6, 12, 0.95)) !important;
      border: 1px solid rgba(0, 240, 255, 0.25) !important;
      border-radius: 12px !important;
      backdrop-filter: blur(15px);
      box-shadow: 0 8px 32px rgba(0, 240, 255, 0.05), inset 0 0 20px rgba(0, 240, 255, 0.02);
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }
    .admin-override .card:hover {
      box-shadow: 0 12px 40px rgba(0, 240, 255, 0.08), inset 0 0 20px rgba(0, 240, 255, 0.05);
      border: 1px solid rgba(0, 240, 255, 0.35) !important;
    }
    .admin-override h2.glow-title {
      font-size: 2.8rem;
      font-weight: 800;
      text-align: center;
      text-transform: uppercase;
      text-shadow: 0 0 12px rgba(0, 240, 255, 0.8), 0 0 25px rgba(0, 240, 255, 0.5), 0 0 40px rgba(0, 240, 255, 0.2) !important;
      letter-spacing: 3px;
      margin-bottom: 20px;
      color: #00f0ff !important;
    }
    .admin-override .title-separator {
      width: 150px;
      height: 3px;
      background: linear-gradient(90deg, transparent, #00f0ff, transparent);
      margin: 0 auto 40px;
      border-radius: 2px;
      animation: pulse-glow 2.5s infinite alternate ease-in-out;
    }
    @keyframes pulse-glow {
      0% { box-shadow: 0 0 10px rgba(0, 240, 255, 0.4); opacity: 0.7; width: 120px; }
      100% { box-shadow: 0 0 25px rgba(0, 240, 255, 1); opacity: 1; width: 180px; }
    }
    .admin-override h3 {
      font-weight: 700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: #00f0ff !important;
      font-size: 1.15rem;
      border-bottom: 1px solid rgba(0, 240, 255, 0.25);
      padding-bottom: 10px;
      margin-bottom: 18px;
      text-shadow: 0 0 8px rgba(0, 240, 255, 0.3);
    }
    .admin-override label {
      color: rgba(0, 240, 255, 0.75);
      text-transform: uppercase;
      letter-spacing: 1.5px;
      font-size: 0.85rem;
    }
    .admin-override input {
      background: rgba(0, 240, 255, 0.02) !important;
      border: 1px solid rgba(0, 240, 255, 0.2) !important;
      color: #e0f0ff !important;
      border-radius: 6px !important;
      font-family: 'Consolas', 'Courier New', monospace;
      transition: all 0.3s ease;
    }
    .admin-override input:focus {
      outline: none !important;
      border-color: rgba(0, 240, 255, 0.8) !important;
      box-shadow: 0 0 20px rgba(0, 240, 255, 0.2) !important;
      background: rgba(0, 240, 255, 0.06) !important;
    }
    
    /* Premium Animated Buttons */
    .admin-override button {
      position: relative;
      overflow: hidden;
      border-radius: 6px !important;
      font-family: 'Consolas', 'Courier New', monospace;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-weight: bold;
      transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
      cursor: pointer;
      z-index: 1;
    }
    .admin-override button::before {
      content: '';
      position: absolute;
      top: 0; left: -100%;
      width: 50%; height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
      transition: left 0.6s ease;
      transform: skewX(-20deg);
      z-index: -1;
    }
    .admin-override button:hover::before {
      left: 150%;
    }
    .admin-override button:active {
      transform: scale(0.96);
    }
    .admin-override button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .admin-override button:disabled::before {
      display: none;
    }

    /* Standard Button */
    .admin-override button:not(.ghost):not(.primary) {
      background: linear-gradient(135deg, rgba(0, 240, 255, 0.05), rgba(0, 240, 255, 0.15)) !important;
      border: 1px solid rgba(0, 240, 255, 0.5) !important;
      color: #00f0ff !important;
      text-shadow: 0 0 5px rgba(0, 240, 255, 0.3);
    }
    .admin-override button:not(.ghost):not(.primary):hover {
      background: linear-gradient(135deg, rgba(0, 240, 255, 0.15), rgba(0, 240, 255, 0.3)) !important;
      box-shadow: 0 0 20px rgba(0, 240, 255, 0.4), inset 0 0 10px rgba(0, 240, 255, 0.2);
      border-color: #00f0ff !important;
    }

    /* Primary/Danger Button */
    .admin-override button.primary {
      background: linear-gradient(135deg, rgba(255, 0, 60, 0.1), rgba(255, 0, 60, 0.2)) !important;
      border: 1px solid rgba(255, 0, 60, 0.6) !important;
      color: #ff003c !important;
      text-shadow: 0 0 5px rgba(255, 0, 60, 0.3);
    }
    .admin-override button.primary:hover {
      background: linear-gradient(135deg, rgba(255, 0, 60, 0.2), rgba(255, 0, 60, 0.4)) !important;
      box-shadow: 0 0 20px rgba(255, 0, 60, 0.5), inset 0 0 10px rgba(255, 0, 60, 0.2);
      border-color: #ff003c !important;
    }

    /* Ghost Button */
    .admin-override button.ghost {
      background: transparent !important;
      border: 1px dashed rgba(0, 240, 255, 0.4) !important;
      color: rgba(0, 240, 255, 0.7) !important;
    }
    .admin-override button.ghost:hover {
      background: rgba(0, 240, 255, 0.05) !important;
      border: 1px solid rgba(0, 240, 255, 0.8) !important;
      color: #00f0ff !important;
      box-shadow: 0 0 15px rgba(0, 240, 255, 0.2);
    }

    /* Lists and Meters */
    .admin-override .events li {
      border-bottom: 1px solid rgba(0, 240, 255, 0.08) !important;
      transition: background 0.2s ease;
    }
    .admin-override .events li:hover {
      background: rgba(0, 240, 255, 0.03);
    }
    .admin-override .meter .empty {
      background: rgba(0, 240, 255, 0.05) !important;
      border: 1px solid rgba(0, 240, 255, 0.2);
    }
    .admin-override .meter .filled {
      background: linear-gradient(135deg, #00f0ff, #0080ff) !important;
      box-shadow: 0 0 15px rgba(0, 240, 255, 0.6);
      border: 1px solid #e0f0ff;
    }
    .admin-override .note, .admin-override .muted {
      color: rgba(0, 240, 255, 0.5) !important;
    }
    .admin-override .pill {
      border-color: rgba(0, 240, 255, 0.4) !important;
      box-shadow: inset 0 0 5px rgba(0, 240, 255, 0.2);
    }
    .admin-override .pill.red {
      color: #ff003c;
      border-color: #ff003c !important;
      background: rgba(255, 0, 60, 0.15);
      box-shadow: inset 0 0 5px rgba(255, 0, 60, 0.3);
    }
    .admin-override .pill.green {
      color: #00ff66;
      border-color: #00ff66 !important;
      background: rgba(0, 255, 102, 0.15);
      box-shadow: inset 0 0 5px rgba(0, 255, 102, 0.3);
    }
    .admin-override .error {
      color: #ff003c;
      text-shadow: 0 0 8px rgba(255, 0, 60, 0.6);
      font-weight: bold;
    }
    .admin-override .success {
      color: #00ff66;
      text-shadow: 0 0 8px rgba(0, 255, 102, 0.6);
      font-weight: bold;
    }
  `}</style>
);

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
    <div className="admin-override">
      <ConstellationBackground />
      <AdminTheme />
      <div style={{ paddingTop: '40px' }}>
        <h2 className="glow-title">KAVACH GLOBAL COMMAND CENTER</h2>
        <div className="title-separator"></div>
        <div className="card login" style={{ maxWidth: '400px', margin: '0 auto' }}>
          <p className="note" style={{ textAlign: 'center', marginBottom: '20px' }}>SECURE ACCESS PROTOCOL INITIATED.</p>
          <form onSubmit={doLogin}>
            <label>OPERATIVE ID (Email)</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@exam.gov" autoFocus />
            <label>ACCESS KEY (Password)</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
            <button disabled={busy} style={{ width: '100%', marginTop: '20px', padding: '12px' }}>
              {busy ? 'AUTHENTICATING...' : 'INITIALIZE SYSTEM'}
            </button>
          </form>
          {error && <p className="error" style={{ textAlign: 'center' }}>{error}</p>}
        </div>
      </div>
    </div>
  );
}

function Dashboard({ token, onLogout }) {
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

  async function loadDocs() {
    const data = await api('GET', '/api/admin/documents', null, token);
    setDocs(data.documents || []);
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
    const data = await api('GET', '/api/admin/status', null, token);
    setStatus(data);
    return data;
  }

  function backfillHistory(data) {
    const past = [];
    (data.logs || []).forEach((l) => {
      past.push({
        label: l.status === 'success' ? 'LOGIN' : 'LOGIN FAIL',
        time: new Date(l.loginTime),
        color: l.status === 'success' ? 'green' : 'red',
        data: { name: l.custodianId?.name || l.email || 'unknown', message: l.ipAddress || l.status }
      });
    });
    (data.submissions || []).forEach((s) => {
      past.push({
        label: 'SHARE',
        time: new Date(s.submittedAt),
        color: 'blue',
        data: { name: s.name || 'unknown', message: 'share recorded' }
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

  useEffect(() => {
    if (vaultUnlocked) loadDocs().catch(() => {});
  }, [vaultUnlocked, token]);

  return (
    <div className="admin-override dashboard">
      <ConstellationBackground />
      <AdminTheme />
      <div style={{ paddingTop: '20px' }}>
        <h2 className="glow-title">KAVACH GLOBAL COMMAND CENTER</h2>
        <div className="title-separator"></div>
      </div>
      <div className="card">
        <h3>OPERATIONS COMMAND <span className="muted small">NODE: ADMIN_AUTH_ACTIVE</span></h3>
        <div className="row">
          <button onClick={doSetup} disabled={busy}>DEPLOY 5 CUSTODIANS</button>
          <button onClick={doReset} disabled={busy} className="primary" style={{ borderColor: '#ff003c', color: '#ff003c' }}>PURGE RAM SHARES</button>
          <button onClick={doReconstruct} disabled={busy || !active || active.shareCount < active.threshold}>
            RECONSTRUCT KEY ({active ? active.shareCount : 0}/{active ? active.threshold : 3})
          </button>
          <button onClick={onLogout} className="ghost">EXIT SYSTEM</button>
        </div>
        <p className="note">Login history is permanent — Setup never deletes it. "PURGE RAM SHARES" resets the in-memory share counter, not the logs.</p>
        {notice && <p className="note">{notice}</p>}
        {masterKey && (
          <div className="keybox">
            <h3>RECONSTRUCTED MASTER KEY</h3>
            <code>{masterKey}</code>
          </div>
        )}
      </div>

      {credentials.length > 0 && (
        <div className="card" style={{ border: '2px solid #00ffcc', boxShadow: '0 0 20px rgba(0,255,204,0.3)' }}>
          <h3 style={{ color: '#00ffcc', textAlign: 'center', fontSize: '1.5rem' }}>NEW CUSTODIAN CREDENTIALS GENERATED</h3>
          <p className="note" style={{ textAlign: 'center' }}>Save these credentials now. They will not be shown again.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginTop: '20px' }}>
            {credentials.map((c) => (
              <div key={c.email} style={{ background: 'rgba(0,0,0,0.4)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(0,255,204,0.2)' }}>
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


      <div className="card">
        <h3>THRESHOLD PROTOCOL</h3>
        {active ? (
          <div className="meter">
            {Array.from({ length: active.total }, (_, i) => (
              <span key={i} className={i < active.shareCount ? 'filled' : 'empty'} title={`Share ${i + 1}`} />
            ))}
            <p>{active.shareCount} of {active.total} shares · need {active.threshold} · {active.shareCount >= active.threshold ? 'UNLOCKED' : 'VAULT LOCKED'}</p>
          </div>
        ) : (
          <p className="note">No active session yet.</p>
        )}
        {active?.masterKeyReconstructed && <p className="success">Master key has been reconstructed.</p>}
      </div>

      <div className="card vault">
        <h3>SECRET DOCUMENT VAULT <span className="muted small">(encrypted with reconstructed master key)</span></h3>
        {vaultUnlocked ? (
          <>
            <p className="note">Vault is <span className="success">UNLOCKED</span> — threshold met. Uploaded documents are stored encrypted (AES-256-GCM) and only decryptable while the key is available.</p>
            <form onSubmit={doUpload} className="row">
              <input type="file" onChange={(e) => setSelectedFile(e.target.files[0] || null)} />
              <button type="submit" disabled={vaultBusy || !selectedFile} className="primary" style={{ borderColor: '#00f0ff', color: '#00f0ff' }}>
                {vaultBusy ? 'WORKING...' : 'UPLOAD & ENCRYPT'}
              </button>
            </form>
            {docs.length === 0 && <p className="note">No documents in the vault yet.</p>}
            <ul className="events">
              {docs.map((doc) => (
                <li key={doc._id}>
                  <span className="pill blue">ENCRYPTED</span>
                  <span>{doc.name}</span>
                  <span className="muted">{Math.round(doc.size / 1024)} KB · {new Date(doc.uploadedAt).toLocaleString()}</span>
                  <button onClick={() => doDecrypt(doc)} disabled={vaultBusy} className="ghost small-btn">
                    DECRYPT & DOWNLOAD
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="note">Vault is <b>LOCKED</b>. Waiting for {active ? active.threshold : 3} custodians to reconstruct the master key...</p>
        )}
      </div>

      <div className="grid">
        <div className="card">
          <h3>LIVE SOCKET.IO FEED</h3>
          {events.length === 0 && <p className="note">Listening for network activity...</p>}
          <ul className="events">
            {events.map((ev, i) => (
              <li key={i} style={{ borderLeft: `4px solid var(--${ev.color})` }}>
                <span className={`pill ${ev.color === 'red' ? 'red' : ev.color === 'green' ? 'green' : 'blue'}`}>{ev.label}</span>
                <span>{ev.time.toLocaleTimeString()}</span>
                <span className="muted">
                  {ev.data?.name ? ev.data.name + ' · ' : ''}
                  {ev.data?.message || (ev.data?.count !== undefined ? `count ${ev.data.count}` : '')}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <h3>DETAILED ACCESS LOGS</h3>
          {status?.logs?.length === 0 && <p className="note">No access records found.</p>}
          <ul className="events">
            {status?.logs?.map((l, i) => (
              <li key={i}>
                <span className={`pill ${l.status === 'success' ? 'green' : 'red'}`}>{l.status === 'success' ? 'SUCCESS' : 'FAIL'}</span>
                <span>{new Date(l.loginTime).toLocaleString()}</span>
                <span className="muted">
                  {l.custodianId?.name || 'unknown'} · {l.ipAddress || ''}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

    </div>
  );
}

export default function AdminDashboard() {
  const [token, setToken] = useState(() => localStorage.getItem('admin_token') || '');

  if (!token) {
    return (
      <AdminLogin
        onSuccess={(t) => {
          localStorage.setItem('admin_token', t);
          setToken(t);
        }}
      />
    );
  }

  return (
    <Dashboard
      token={token}
      onLogout={() => {
        localStorage.removeItem('admin_token');
        setToken('');
      }}
    />
  );
}
