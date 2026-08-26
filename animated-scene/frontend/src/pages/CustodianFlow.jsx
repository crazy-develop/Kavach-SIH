import { useState, useEffect } from 'react';
import { api } from '../api.js';

const STEPS = ['Login', '2FA Verify', 'Submit Security Key'];

export default function CustodianFlow() {
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totp, setTotp] = useState('');
  const [sharePassword, setSharePassword] = useState('');
  const [session, setSession] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    if (session?.result?.keyReconstructed) {
      loadDocuments();
    }
  }, [session?.result?.keyReconstructed]);

  async function loadDocuments() {
    try {
      const data = await api('GET', '/api/share/documents', null, session.token);
      if (data.documents) {
        setDocuments(data.documents);
      }
    } catch (err) {
      console.error('Failed to load documents', err);
    }
  }

  async function doLogin(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const data = await api('POST', '/api/auth/login', { email, password });
      setSession({ custodianId: data.custodianId, name: data.name });
      setStep(1);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function doTotp(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const data = await api('POST', '/api/auth/verify-totp', {
        custodianId: session.custodianId,
        token: totp
      });
      setSession((s) => ({ ...s, token: data.token, sessionId: data.sessionId, email: data.email }));
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function doShare(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const data = await api('POST', '/api/share/submit', { passwordForShare: sharePassword }, session.token);
      setSession((s) => ({ ...s, result: data }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function downloadDocument(docId, docName, docMime) {
    setDownloadingId(docId);
    try {
      const data = await api('POST', `/api/share/document/${docId}/decrypt`, null, session.token);
      
      const byteCharacters = atob(data.data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: data.mimeType || docMime });
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.name || docName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Download failed: ' + err.message);
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div className="card">
      <h2>Custodian Sign-In</h2>
      <div className="steps">
        {STEPS.map((s, i) => (
          <span key={s} className={i <= step ? 'done' : ''}>
            {i + 1}. {s}
          </span>
        ))}
      </div>

      {step === 0 && (
        <form onSubmit={doLogin}>
          <label>Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="a@exam.gov" autoFocus />
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Temp password (from setup)" />
          <button disabled={busy}>{busy ? 'Checking...' : 'Login'}</button>
        </form>
      )}

      {step === 1 && (
        <form onSubmit={doTotp}>
          <p className="note">Password OK — now enter the 6-digit code from Google Authenticator.</p>
          <label>TOTP code</label>
          <input value={totp} onChange={(e) => setTotp(e.target.value)} placeholder="123456" maxLength={6} autoFocus />
          <button disabled={busy}>{busy ? 'Verifying...' : 'Verify 2FA'}</button>
        </form>
      )}

      {step === 2 && !session?.result && (
        <form onSubmit={doShare}>
          <p className="note">Authenticated as <b>{session.name}</b>. Enter your Security Key to decrypt and submit your SSS share.</p>
          <label>Security Key</label>
          <input type="password" value={sharePassword} onChange={(e) => setSharePassword(e.target.value)} placeholder="Same as login password" autoFocus />
          <button disabled={busy}>{busy ? 'Submitting...' : 'Submit Security Key'}</button>
        </form>
      )}

      {session?.result?.keyReconstructed ? (
        <div className="celebrate">
          <div className="celebrate-badge" style={{color: '#00ffcc', borderColor: '#00ffcc'}}>&#10003;</div>
          <h2 className="celebrate-title" style={{color: '#00ffcc'}}>VAULT UNLOCKED</h2>
          <p className="note">
            The Shamir Secret Sharing master key has been reconstructed. The encrypted document vault is now accessible.
          </p>

          <div className="doc-list" style={{ marginTop: '20px', textAlign: 'left' }}>
            <h3 style={{ borderBottom: '1px solid #333', paddingBottom: '10px', color: '#fff' }}>Available Exam Papers</h3>
            {documents.length === 0 ? (
              <p style={{ color: '#aaa' }}>No files found in the vault.</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {documents.map((doc) => (
                  <li key={doc._id} style={{
                    background: '#111', padding: '15px', marginBottom: '10px', borderRadius: '8px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #333'
                  }}>
                    <div>
                      <strong style={{ color: '#00ffcc', display: 'block' }}>{doc.name}</strong>
                      <span style={{ fontSize: '12px', color: '#888' }}>
                        {(doc.size / 1024).toFixed(1)} KB &bull; {new Date(doc.uploadedAt).toLocaleString()}
                      </span>
                    </div>
                    <button 
                      onClick={() => downloadDocument(doc._id, doc.name, doc.mimeType)}
                      disabled={downloadingId === doc._id}
                      style={{ padding: '8px 15px', fontSize: '13px', background: '#222', border: '1px solid #444' }}
                    >
                      {downloadingId === doc._id ? 'Decrypting...' : 'Download'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button style={{ marginTop: '30px' }} onClick={() => { setSession(null); setStep(0); setTotp(''); setSharePassword(''); setPassword(''); }}>Sign out & Re-lock</button>
        </div>
      ) : session?.result ? (
        <div className="success">
          <p>Share submitted successfully.</p>
          <p>Shares collected in this session: <b>{session.result.count}</b> / {session.result.threshold} required.</p>
          <p className="note">
            {session.result.count < session.result.threshold
              ? `Still need ${session.result.threshold - session.result.count} more share(s). No single custodian can unlock the key.`
              : 'Threshold met! The key can now be reconstructed by the Admin Dashboard.'}
          </p>
          <button onClick={() => { setSession(null); setStep(0); setTotp(''); setSharePassword(''); setPassword(''); }}>Sign out</button>
        </div>
      ) : null}

      {error && <p className="error">{error}</p>}
    </div>
  );
}
