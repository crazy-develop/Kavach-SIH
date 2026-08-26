import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { auth } from '../firebase.js';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';

function TeacherLogin({ errorMsg, setErrorMsg }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function doLogin(e) {
    e.preventDefault();
    setBusy(true);
    setErrorMsg('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setErrorMsg(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h2>Teacher Sign-In</h2>
      <p className="note">Authorized teacher control panel. Authenticated via Firebase.</p>
      <form onSubmit={doLogin}>
        <label>Email Address</label>
        <input 
          type="email" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          placeholder="teacher@exam.gov" 
          required 
          autoFocus 
        />
        <label>Password</label>
        <input 
          type="password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          placeholder="••••••••" 
          required 
        />
        <button disabled={busy} className="primary">
          {busy ? 'Verifying...' : 'Login to Control Panel'}
        </button>
      </form>
      {errorMsg && <p className="error">{errorMsg}</p>}
    </div>
  );
}

function DashboardView({ username, stats, setView, onLogout, loading }) {
  return (
    <div className="card">
      <h2>Welcome Back, {username}</h2>
      <p className="note">KAVACH Teacher Session // Status: Online (Firebase Verified)</p>
      
      {loading ? (
        <p className="note">Syncing data stream...</p>
      ) : (
        <div className="grid creds" style={{ margin: '20px 0' }}>
          <div className="cred" style={{ textAlign: 'center' }}>
            <h4 style={{ color: '#00ffcc', fontSize: '1.2rem', marginBottom: '5px' }}>{stats.total}</h4>
            <span className="small muted">Total Created</span>
          </div>
          <div className="cred" style={{ textAlign: 'center' }}>
            <h4 style={{ color: '#4ade80', fontSize: '1.2rem', marginBottom: '5px' }}>{stats.approved}</h4>
            <span className="small muted">Approved</span>
          </div>
          <div className="cred" style={{ textAlign: 'center' }}>
            <h4 style={{ color: '#fbbf24', fontSize: '1.2rem', marginBottom: '5px' }}>{stats.pending}</h4>
            <span className="small muted">Pending Approval</span>
          </div>
        </div>
      )}

      <div className="row" style={{ marginTop: '20px', gap: '15px' }}>
        <button onClick={() => setView('add')} className="primary">Add New Question</button>
        <button onClick={() => setView('list')}>My Questions Bank</button>
        <button onClick={onLogout} className="ghost">Log Out</button>
      </div>
    </div>
  );
}

function QuestionFormView({ token, setView, loadData, editingQuestion, setEditingQuestion }) {
  const [questionText, setQuestionText] = useState(editingQuestion ? editingQuestion.questionText : '');
  const [opt0, setOpt0] = useState(editingQuestion ? editingQuestion.options[0] : '');
  const [opt1, setOpt1] = useState(editingQuestion ? editingQuestion.options[1] : '');
  const [opt2, setOpt2] = useState(editingQuestion ? editingQuestion.options[2] : '');
  const [opt3, setOpt3] = useState(editingQuestion ? editingQuestion.options[3] : '');
  const [correctIndex, setCorrectIndex] = useState(editingQuestion ? editingQuestion.correctOptionIndex : 0);
  const [subject, setSubject] = useState(editingQuestion ? editingQuestion.subject : '');
  const [difficulty, setDifficulty] = useState(editingQuestion ? editingQuestion.difficulty : 'Medium');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function doSubmit(e) {
    e.preventDefault();
    if (!questionText.trim() || !opt0.trim() || !opt1.trim() || !opt2.trim() || !opt3.trim() || !subject.trim()) {
      setError('Please fill in all fields');
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (editingQuestion) {
        // Edit Mode
        await api('PUT', `/api/teacher/questions/${editingQuestion._id}`, {
          questionText,
          options: [opt0, opt1, opt2, opt3],
          correctOptionIndex: Number(correctIndex),
          subject,
          difficulty
        }, token);
        setNotice('Question updated successfully!');
      } else {
        // Create Mode
        await api('POST', '/api/teacher/questions', {
          questionText,
          options: [opt0, opt1, opt2, opt3],
          correctOptionIndex: Number(correctIndex),
          subject,
          difficulty
        }, token);
        setNotice('Question added successfully!');
        setQuestionText('');
        setOpt0('');
        setOpt1('');
        setOpt2('');
        setOpt3('');
        setCorrectIndex(0);
        setSubject('');
        setDifficulty('Medium');
      }
      await loadData(token);
      setTimeout(() => {
        setEditingQuestion(null);
        setView('list');
      }, 1000);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h2>{editingQuestion ? 'Edit Question' : 'Add New Question'}</h2>
        <button onClick={() => { setEditingQuestion(null); setView('dashboard'); }} className="ghost" style={{ marginTop: 0 }}>Back</button>
      </div>
      <form onSubmit={doSubmit}>
        <label>Question Text *</label>
        <input 
          value={questionText} 
          onChange={(e) => setQuestionText(e.target.value)} 
          placeholder="e.g. What is the value of gravitational acceleration g?" 
          required
        />
        
        <label>Option 1 *</label>
        <input value={opt0} onChange={(e) => setOpt0(e.target.value)} placeholder="Option 1" required />
        <label>Option 2 *</label>
        <input value={opt1} onChange={(e) => setOpt1(e.target.value)} placeholder="Option 2" required />
        <label>Option 3 *</label>
        <input value={opt2} onChange={(e) => setOpt2(e.target.value)} placeholder="Option 3" required />
        <label>Option 4 *</label>
        <input value={opt3} onChange={(e) => setOpt3(e.target.value)} placeholder="Option 4" required />

        <label>Correct Option *</label>
        <select 
          value={correctIndex} 
          onChange={(e) => setCorrectIndex(Number(e.target.value))}
          style={{
            width: '100%',
            padding: '15px 20px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            background: 'rgba(0,0,0,0.8)',
            color: '#fff',
            fontSize: '16px',
            fontFamily: 'Consolas, monospace'
          }}
        >
          <option value={0}>Option 1</option>
          <option value={1}>Option 2</option>
          <option value={2}>Option 3</option>
          <option value={3}>Option 4</option>
        </select>

        <label>Subject *</label>
        <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Physics" required />

        <label>Difficulty *</label>
        <select 
          value={difficulty} 
          onChange={(e) => setDifficulty(e.target.value)}
          style={{
            width: '100%',
            padding: '15px 20px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            background: 'rgba(0,0,0,0.8)',
            color: '#fff',
            fontSize: '16px',
            fontFamily: 'Consolas, monospace'
          }}
        >
          <option value="Easy">Easy</option>
          <option value="Medium">Medium</option>
          <option value="Hard">Hard</option>
        </select>

        <button type="submit" disabled={busy} className="primary" style={{ width: '100%', marginTop: '20px' }}>
          {busy ? 'Saving...' : editingQuestion ? 'Update Question' : 'Add to Question Bank'}
        </button>
      </form>
      {notice && <p className="success">{notice}</p>}
      {error && <p className="error">{error}</p>}
    </div>
  );
}

function QuestionsListView({ token, setView, questions, loadData, setEditingQuestion }) {
  async function doDelete(id) {
    if (!confirm('Are you sure you want to delete this question?')) return;
    try {
      await api('DELETE', `/api/teacher/questions/${id}`, null, token);
      await loadData(token);
    } catch (err) {
      alert(err.message);
    }
  }

  function doEdit(q) {
    setEditingQuestion(q);
    setView('add');
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h2>My Questions Bank</h2>
        <button onClick={() => setView('dashboard')} className="ghost" style={{ marginTop: 0 }}>Back</button>
      </div>

      {questions.length === 0 && <p className="note">No questions created in your bank yet.</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {questions.map((q) => {
          const qStatus = q.status || 'Pending';
          return (
            <div key={q._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '15px' }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                <span className="pill blue">{q.subject}</span>
                <span className={`pill ${q.difficulty === 'Easy' ? 'green' : q.difficulty === 'Hard' ? 'red' : 'orange'}`}>{q.difficulty}</span>
                <span className={`pill ${qStatus === 'Approved' ? 'green' : qStatus === 'Rejected' ? 'red' : 'orange'}`}>{qStatus}</span>
                {q.createdAt && (
                  <span className="small muted" style={{ marginLeft: 'auto', alignSelf: 'center' }}>
                    {new Date(q.createdAt).toLocaleDateString()}
                  </span>
                )}
              </div>
              <p style={{ fontWeight: 'bold', fontSize: '16px', color: '#fff', marginBottom: '8px' }}>{q.questionText}</p>
              <ul style={{ listStyle: 'none', paddingLeft: '10px', fontSize: '14px', color: '#888' }}>
                {q.options.map((opt, idx) => (
                  <li key={idx} style={{ color: idx === q.correctOptionIndex ? '#00ffcc' : '' }}>
                    {idx === q.correctOptionIndex ? '✓ ' : '• '} {opt}
                  </li>
                ))}
              </ul>
              <div className="row" style={{ marginTop: '12px', gap: '10px' }}>
                <button onClick={() => doEdit(q)} className="small-btn" style={{ background: 'transparent', borderColor: '#38bdf8', color: '#38bdf8', padding: '6px 12px' }}>Edit</button>
                <button onClick={() => doDelete(q._id)} className="small-btn" style={{ background: 'transparent', borderColor: '#ff3366', color: '#ff3366', padding: '6px 12px' }}>Delete</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function TeacherDashboard() {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('teacher_token') || '');
  const [username, setUsername] = useState(() => localStorage.getItem('teacher_username') || '');
  const [questions, setQuestions] = useState([]);
  const [stats, setStats] = useState({ total: 0, approved: 0, pending: 0 });
  const [view, setView] = useState('dashboard');
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [loginError, setLoginError] = useState('');

  async function loadData(activeToken) {
    const t = activeToken || token;
    if (!t) return;
    setLoading(true);
    try {
      const [questionsData, statsData] = await Promise.all([
        api('GET', '/api/teacher/questions', null, t),
        api('GET', '/api/teacher/statistics', null, t)
      ]);
      setQuestions(questionsData.questions || []);
      setStats(statsData || { total: 0, approved: 0, pending: 0 });
    } catch (err) {
      console.error(err);
      if (err.message.includes('401') || err.message.includes('403') || err.message.includes('Firebase ID token')) {
        handleLogout();
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    try {
      if (auth) await signOut(auth);
    } catch (err) {
      console.error('Firebase signOut error:', err);
    }
    localStorage.removeItem('teacher_token');
    localStorage.removeItem('teacher_username');
    setToken('');
    setUsername('');
    setFirebaseUser(null);
  }

  useEffect(() => {
    if (!auth) {
      setInitializing(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setInitializing(true);
      if (user) {
        setFirebaseUser(user);
        try {
          const idToken = await user.getIdToken();
          
          // Verify with backend so we know if the user is authorized (is a teacher)
          // TEMPORARY BYPASS: Backend disabled for now so login works only via Firebase
          // const data = await api('POST', '/api/teacher/verify-token', { idToken });
          const data = { email: user.email };
          
          localStorage.setItem('teacher_token', idToken);
          localStorage.setItem('teacher_username', data.email);
          setToken(idToken);
          setUsername(data.email);
          
          // await loadData(idToken); // Skip loading questions from backend for now
        } catch (err) {
          setLoginError(err.message);
          if (auth) await signOut(auth);
        }
      } else {
        handleLogout();
      }
      setInitializing(false);
    });

    return () => unsubscribe();
  }, []);

  if (!auth) {
    return (
      <div className="card">
        <h2>Teacher Panel Not Configured</h2>
        <p className="error" style={{ fontSize: '15px' }}>
          Firebase credentials are not set in the frontend environment.
        </p>
        <p className="note" style={{ marginTop: '10px' }}>
          Please configure `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, and `VITE_FIREBASE_PROJECT_ID` environment variables in your frontend deployment to activate this panel.
        </p>
      </div>
    );
  }

  if (initializing) {
    return (
      <div className="card">
        <h2>Teacher Portal</h2>
        <p className="note">Initializing secure authentication stream...</p>
      </div>
    );
  }

  if (!firebaseUser || !token) {
    return <TeacherLogin errorMsg={loginError} setErrorMsg={setLoginError} />;
  }

  return (
    <div className="teacher-control-center">
      {view === 'dashboard' && (
        <DashboardView 
          username={username} 
          stats={stats} 
          setView={setView} 
          onLogout={handleLogout}
          loading={loading}
        />
      )}

      {view === 'add' && (
        <QuestionFormView 
          token={token} 
          setView={setView} 
          loadData={loadData} 
          editingQuestion={editingQuestion}
          setEditingQuestion={setEditingQuestion}
        />
      )}

      {view === 'list' && (
        <QuestionsListView 
          token={token} 
          setView={setView} 
          questions={questions} 
          loadData={loadData}
          setEditingQuestion={setEditingQuestion}
        />
      )}
    </div>
  );
}
