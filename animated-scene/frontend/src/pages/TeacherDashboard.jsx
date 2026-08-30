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
      console.log('[Diagnostic] Firebase Sign-In attempt for email:', email);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('[Diagnostic] Firebase Sign-In success. UID:', userCredential.user.uid);
    } catch (err) {
      console.error('[Diagnostic] Firebase Sign-In failed:', err.message);
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
    <div className="card" style={{ maxWidth: '850px', margin: '0 auto' }}>
      <h2>Welcome Back, {username}</h2>
      <p className="note">KAVACH Teacher Session // Status: Online (Firebase Verified)</p>
      
      {loading ? (
        <p className="note">Syncing data stream...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', margin: '20px 0' }}>
          <div className="cred" style={{ textAlign: 'center', padding: '15px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
            <h4 style={{ color: '#38bdf8', fontSize: '1.5rem', marginBottom: '5px', marginTop: 0 }}>{stats.total || 0}</h4>
            <span className="small muted">All Questions</span>
          </div>
          <div className="cred" style={{ textAlign: 'center', padding: '15px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
            <h4 style={{ color: '#fbbf24', fontSize: '1.5rem', marginBottom: '5px', marginTop: 0 }}>{stats.draft || 0}</h4>
            <span className="small muted">Draft</span>
          </div>
          <div className="cred" style={{ textAlign: 'center', padding: '15px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
            <h4 style={{ color: '#a78bfa', fontSize: '1.5rem', marginBottom: '5px', marginTop: 0 }}>{stats.underReview || 0}</h4>
            <span className="small muted">Under Review</span>
          </div>
          <div className="cred" style={{ textAlign: 'center', padding: '15px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
            <h4 style={{ color: '#34d399', fontSize: '1.5rem', marginBottom: '5px', marginTop: 0 }}>{stats.approved || 0}</h4>
            <span className="small muted">Approved</span>
          </div>
          <div className="cred" style={{ textAlign: 'center', padding: '15px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
            <h4 style={{ color: '#4ade80', fontSize: '1.5rem', marginBottom: '5px', marginTop: 0 }}>{stats.active || 0}</h4>
            <span className="small muted">Active</span>
          </div>
          <div className="cred" style={{ textAlign: 'center', padding: '15px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
            <h4 style={{ color: '#f87171', fontSize: '1.5rem', marginBottom: '5px', marginTop: 0 }}>{stats.retired || 0}</h4>
            <span className="small muted">Retired</span>
          </div>
        </div>
      )}

      <div className="row" style={{ marginTop: '25px', gap: '15px', display: 'flex', justifyContent: 'center' }}>
        <button onClick={() => setView('add')} className="primary">Add New Question</button>
        <button onClick={() => setView('list')}>Question Review Dashboard</button>
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
  const [chapter, setChapter] = useState(editingQuestion ? editingQuestion.chapter : '');
  const [topic, setTopic] = useState(editingQuestion ? editingQuestion.topic : '');
  const [difficulty, setDifficulty] = useState(editingQuestion ? editingQuestion.difficulty : 'Medium');
  const [marks, setMarks] = useState(editingQuestion ? editingQuestion.marks : 4);
  const [source, setSource] = useState(editingQuestion ? editingQuestion.source : '');
  
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function doSubmit(e) {
    e.preventDefault();
    if (!questionText.trim() || !opt0.trim() || !opt1.trim() || !opt2.trim() || !opt3.trim() || !subject.trim() || !chapter.trim()) {
      setError('Please fill in all required fields (*)');
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const payload = {
        questionText,
        options: [opt0, opt1, opt2, opt3],
        correctOptionIndex: Number(correctIndex),
        subject,
        chapter,
        topic,
        difficulty,
        marks: Number(marks) || 4,
        source
      };

      if (editingQuestion) {
        await api('PUT', `/api/teacher/questions/${editingQuestion._id}`, payload, token);
        setNotice('Question updated successfully!');
      } else {
        await api('POST', '/api/teacher/questions', payload, token);
        setNotice('Question added successfully as DRAFT!');
        setQuestionText('');
        setOpt0('');
        setOpt1('');
        setOpt2('');
        setOpt3('');
        setCorrectIndex(0);
        setSubject('');
        setChapter('');
        setTopic('');
        setDifficulty('Medium');
        setMarks(4);
        setSource('');
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
    <div className="card" style={{ maxWidth: '650px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h2>{editingQuestion ? 'Edit Question' : 'Add New Question'}</h2>
        <button onClick={() => { setEditingQuestion(null); setView('dashboard'); }} className="ghost" style={{ marginTop: 0 }}>Back</button>
      </div>
      <form onSubmit={doSubmit}>
        <label>Question Text *</label>
        <textarea 
          value={questionText} 
          onChange={(e) => setQuestionText(e.target.value)} 
          placeholder="Question Text" 
          required
          rows={3}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            background: 'rgba(0,0,0,0.8)',
            color: '#fff',
            fontFamily: 'inherit',
            fontSize: '15px',
            marginBottom: '10px'
          }}
        />
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label>Option A *</label>
            <input value={opt0} onChange={(e) => setOpt0(e.target.value)} placeholder="Option A" required />
          </div>
          <div>
            <label>Option B *</label>
            <input value={opt1} onChange={(e) => setOpt1(e.target.value)} placeholder="Option B" required />
          </div>
          <div>
            <label>Option C *</label>
            <input value={opt2} onChange={(e) => setOpt2(e.target.value)} placeholder="Option C" required />
          </div>
          <div>
            <label>Option D *</label>
            <input value={opt3} onChange={(e) => setOpt3(e.target.value)} placeholder="Option D" required />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '10px' }}>
          <div>
            <label>Correct Option *</label>
            <select 
              value={correctIndex} 
              onChange={(e) => setCorrectIndex(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(0,0,0,0.8)',
                color: '#fff',
                fontSize: '15px',
                fontFamily: 'Consolas, monospace'
              }}
            >
              <option value={0}>Option A</option>
              <option value={1}>Option B</option>
              <option value={2}>Option C</option>
              <option value={3}>Option D</option>
            </select>
          </div>
          
          <div>
            <label>Difficulty *</label>
            <select 
              value={difficulty} 
              onChange={(e) => setDifficulty(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(0,0,0,0.8)',
                color: '#fff',
                fontSize: '15px',
                fontFamily: 'Consolas, monospace'
              }}
            >
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '10px' }}>
          <div>
            <label>Subject *</label>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" required />
          </div>
          <div>
            <label>Chapter *</label>
            <input value={chapter} onChange={(e) => setChapter(e.target.value)} placeholder="Chapter" required />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '10px' }}>
          <div>
            <label>Topic</label>
            <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Topic" />
          </div>
          <div>
            <label>Marks</label>
            <input type="number" value={marks} onChange={(e) => setMarks(Number(e.target.value))} placeholder="4" />
          </div>
        </div>

        <label>Source Reference</label>
        <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Source" />

        <button type="submit" disabled={busy} className="primary" style={{ width: '100%', marginTop: '20px' }}>
          {busy ? 'Saving...' : editingQuestion ? 'Update Question' : 'Add to Question Bank'}
        </button>
      </form>
      {notice && <p className="success" style={{ marginTop: '10px' }}>{notice}</p>}
      {error && <p className="error" style={{ marginTop: '10px' }}>{error}</p>}
    </div>
  );
}

function QuestionReviewView({ token, question, onClose, onActionSuccess }) {
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);
  const [comment, setComment] = useState('');

  const qStatus = question.status || 'DRAFT';

  async function executeTransition(endpoint, payload = {}) {
    setBusy(true);
    setActionError('');
    try {
      const res = await api('POST', `/api/teacher/questions/${question._id}/${endpoint}`, payload, token);
      onActionSuccess(res.question, `Action completed successfully: ${res.message || 'Updated'}`);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: '750px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3>Question Details & Review Panel</h3>
        <button onClick={onClose} className="ghost" style={{ marginTop: 0 }}>Back to List</button>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '15px', flexWrap: 'wrap' }}>
          <span className="pill blue">{question.subject}</span>
          <span className="pill purple">{question.chapter}</span>
          {question.topic && <span className="pill gray">{question.topic}</span>}
          <span className={`pill ${question.difficulty === 'Easy' ? 'green' : question.difficulty === 'Hard' ? 'red' : 'orange'}`}>{question.difficulty}</span>
          <span className="pill orange">{qStatus.replace('_', ' ')}</span>
        </div>

        <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff', lineHeight: '1.4', marginBottom: '15px' }}>{question.questionText}</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', margin: '15px 0' }}>
          {question.options.map((opt, idx) => {
            const label = ['A', 'B', 'C', 'D'][idx];
            const isCorrect = idx === question.correctOptionIndex;
            return (
              <div key={idx} style={{ 
                padding: '10px 15px', 
                borderRadius: '6px', 
                background: isCorrect ? 'rgba(74, 222, 128, 0.1)' : 'rgba(0,0,0,0.3)',
                border: isCorrect ? '1px solid rgba(74, 222, 128, 0.3)' : '1px solid rgba(255,255,255,0.05)',
                color: isCorrect ? '#4ade80' : '#ccc',
                fontSize: '15px'
              }}>
                <strong>{label}.</strong> {opt}
              </div>
            );
          })}
        </div>

        {question.explanation && (
          <p className="note" style={{ background: 'rgba(0,0,0,0.2)' }}>
            <strong>Explanation:</strong> {question.explanation}
          </p>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', fontSize: '12px', color: '#aaa', marginTop: '15px' }}>
          <div><strong>ID:</strong> {question.sourceId || question._id}</div>
          <div><strong>Marks:</strong> {question.marks}</div>
          <div><strong>Source:</strong> {question.source || 'Original'}</div>
          <div><strong>Last Updated:</strong> {new Date(question.updatedAt).toLocaleString()}</div>
        </div>
      </div>

      {/* Review Comments History */}
      {question.reviewComment && (
        <div style={{ background: 'rgba(251, 191, 36, 0.05)', borderLeft: '3px solid #fbbf24', padding: '15px', borderRadius: '4px', marginBottom: '20px', color: '#fbbf24', fontSize: '14px' }}>
          <strong>Feedback / Review Comments:</strong>
          <p style={{ margin: '5px 0 0 0' }}>{question.reviewComment}</p>
        </div>
      )}

      {/* Audit Logs Trail */}
      <div style={{ background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '8px', fontSize: '12px', color: '#bbb', marginBottom: '20px' }}>
        <h4 style={{ margin: '0 0 10px 0', color: '#fff' }}>Verification & Audit Trail</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div>• Created: {new Date(question.createdAt).toLocaleString()}</div>
          {question.submittedBy && <div>• Submitted for Review by <code>{question.submittedBy}</code> on {new Date(question.submittedAt).toLocaleString()}</div>}
          {question.approvedBy && <div>• Approved by <code>{question.approvedBy}</code> on {new Date(question.approvedAt).toLocaleString()}</div>}
          {question.activatedBy && <div>• Activated by <code>{question.activatedBy}</code> on {new Date(question.activatedAt).toLocaleString()}</div>}
          {question.retiredBy && <div>• Retired by <code>{question.retiredBy}</code> on {new Date(question.retiredAt).toLocaleString()}</div>}
        </div>
      </div>

      {/* Transition Action Box */}
      {qStatus !== 'RETIRED' && (
        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '8px' }}>
          <h4 style={{ margin: '0 0 12px 0' }}>Workflow Actions</h4>
          
          {qStatus === 'UNDER_REVIEW' && (
            <div style={{ marginBottom: '12px' }}>
              <label>Review Comment / Rejection Reason</label>
              <input 
                type="text" 
                value={comment} 
                onChange={(e) => setComment(e.target.value)} 
                placeholder="Enter feedback comments here..." 
                style={{ width: '100%', marginBottom: '10px' }}
              />
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px' }}>
            {qStatus === 'DRAFT' && (
              <button disabled={busy} onClick={() => executeTransition('submit-review')} className="primary" style={{ background: '#a78bfa', marginTop: 0 }}>
                Submit for Review
              </button>
            )}

            {qStatus === 'UNDER_REVIEW' && (
              <>
                <button disabled={busy} onClick={() => executeTransition('approve', { comment })} className="primary" style={{ background: '#34d399', marginTop: 0 }}>
                  Approve Question
                </button>
                <button disabled={busy} onClick={() => executeTransition('reject', { comment })} className="ghost" style={{ borderColor: '#f87171', color: '#f87171', marginTop: 0 }}>
                  Request Corrections
                </button>
              </>
            )}

            {qStatus === 'APPROVED' && (
              <button disabled={busy} onClick={() => executeTransition('activate')} className="primary" style={{ background: '#4ade80', marginTop: 0 }}>
                Activate Question (Make Pool Live)
              </button>
            )}

            {qStatus === 'ACTIVE' && (
              <button disabled={busy} onClick={() => executeTransition('retire')} className="primary" style={{ background: '#f87171', marginTop: 0 }}>
                Retire Question Pool
              </button>
            )}
          </div>
        </div>
      )}

      {actionError && <p className="error" style={{ marginTop: '15px' }}>{actionError}</p>}
    </div>
  );
}

function QuestionsListView({ 
  token, 
  setView, 
  questions, 
  loadData, 
  setEditingQuestion,
  page,
  totalPages,
  totalQuestions,
  searchQuery,
  setSearchQuery,
  selectedStatus,
  setSelectedStatus,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  setSelectedQuestion
}) {
  const [localSearch, setLocalSearch] = useState(searchQuery);

  function handleSearchSubmit(e) {
    e.preventDefault();
    setSearchQuery(localSearch);
  }

  function handleHeaderClick(field) {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  }

  const statuses = ['All', 'DRAFT', 'UNDER_REVIEW', 'APPROVED', 'ACTIVE', 'RETIRED'];

  return (
    <div className="card" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h2>Questions Review Dashboard</h2>
        <button onClick={() => setView('dashboard')} className="ghost" style={{ marginTop: 0 }}>Back</button>
      </div>

      {/* Tabs Row */}
      <div style={{ 
        display: 'flex', 
        gap: '6px', 
        overflowX: 'auto', 
        paddingBottom: '10px', 
        marginBottom: '15px',
        borderBottom: '1px solid rgba(255,255,255,0.05)'
      }}>
        {statuses.map(st => (
          <button 
            key={st}
            onClick={() => setSelectedStatus(st)}
            className={selectedStatus === st ? 'primary' : 'ghost'}
            style={{ 
              padding: '6px 12px', 
              fontSize: '13px', 
              whiteSpace: 'nowrap', 
              marginTop: 0,
              background: selectedStatus === st ? '' : 'rgba(255,255,255,0.02)'
            }}
          >
            {st.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Search Input Bar */}
      <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <input 
          type="text" 
          value={localSearch} 
          onChange={(e) => setLocalSearch(e.target.value)} 
          placeholder="Search by text, subject, chapter, or topic..."
          style={{ flexGrow: 1 }}
        />
        <button type="submit" className="primary" style={{ marginTop: 0, padding: '12px 24px' }}>Search</button>
      </form>

      {/* Questions Data Table */}
      <div style={{ overflowX: 'auto', marginBottom: '15px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.1)' }}>
              <th style={{ padding: '12px' }}>Question</th>
              <th onClick={() => handleHeaderClick('subject')} style={{ padding: '12px', cursor: 'pointer', color: sortBy === 'subject' ? '#38bdf8' : '' }}>
                Subject {sortBy === 'subject' && (sortOrder === 'asc' ? '▲' : '▼')}
              </th>
              <th onClick={() => handleHeaderClick('chapter')} style={{ padding: '12px', cursor: 'pointer', color: sortBy === 'chapter' ? '#38bdf8' : '' }}>
                Chapter {sortBy === 'chapter' && (sortOrder === 'asc' ? '▲' : '▼')}
              </th>
              <th style={{ padding: '12px' }}>Topic</th>
              <th onClick={() => handleHeaderClick('difficulty')} style={{ padding: '12px', cursor: 'pointer', color: sortBy === 'difficulty' ? '#38bdf8' : '' }}>
                Diff {sortBy === 'difficulty' && (sortOrder === 'asc' ? '▲' : '▼')}
              </th>
              <th onClick={() => handleHeaderClick('marks')} style={{ padding: '12px', cursor: 'pointer', color: sortBy === 'marks' ? '#38bdf8' : '' }}>
                Marks {sortBy === 'marks' && (sortOrder === 'asc' ? '▲' : '▼')}
              </th>
              <th style={{ padding: '12px' }}>Status</th>
              <th style={{ padding: '12px' }}>Source</th>
              <th onClick={() => handleHeaderClick('updatedAt')} style={{ padding: '12px', cursor: 'pointer', color: sortBy === 'updatedAt' ? '#38bdf8' : '' }}>
                Updated {sortBy === 'updatedAt' && (sortOrder === 'asc' ? '▲' : '▼')}
              </th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {questions.map((q) => (
              <tr key={q._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', verticalAlign: 'middle' }}>
                <td 
                  onClick={() => { setSelectedQuestion(q); setView('review'); }} 
                  style={{ padding: '12px', cursor: 'pointer', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 'bold' }}
                  title={q.questionText}
                >
                  {q.questionText}
                </td>
                <td style={{ padding: '12px' }}>{q.subject}</td>
                <td style={{ padding: '12px' }}>{q.chapter}</td>
                <td style={{ padding: '12px', color: '#888' }}>{q.topic || '-'}</td>
                <td style={{ padding: '12px' }}>
                  <span className={`pill ${q.difficulty === 'Easy' ? 'green' : q.difficulty === 'Hard' ? 'red' : 'orange'}`} style={{ fontSize: '11px', padding: '3px 6px' }}>
                    {q.difficulty}
                  </span>
                </td>
                <td style={{ padding: '12px' }}>{q.marks}</td>
                <td style={{ padding: '12px' }}>
                  <span className={`pill ${
                    q.status === 'ACTIVE' ? 'green' : 
                    q.status === 'APPROVED' ? 'blue' : 
                    q.status === 'UNDER_REVIEW' ? 'orange' : 
                    q.status === 'RETIRED' ? 'red' : 'gray'
                  }`} style={{ fontSize: '11px', padding: '3px 6px' }}>
                    {q.status}
                  </span>
                </td>
                <td style={{ padding: '12px', color: '#aaa', fontSize: '12px' }}>{q.sourceId || q.source || 'Original'}</td>
                <td style={{ padding: '12px', fontSize: '12px', color: '#888' }}>
                  {new Date(q.updatedAt).toLocaleDateString()}
                </td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <button 
                    onClick={() => { setSelectedQuestion(q); setView('review'); }} 
                    className="small-btn primary"
                    style={{ background: '#38bdf8', padding: '5px 10px', fontSize: '12px', marginTop: 0 }}
                  >
                    Review
                  </button>
                </td>
              </tr>
            ))}
            {questions.length === 0 && (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '20px', color: '#aaa' }}>
                  No matching question entries found in database.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Row Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px' }}>
        <span className="small muted">
          Showing page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalQuestions} total questions)
        </span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            disabled={page <= 1} 
            onClick={() => loadData(token, { page: page - 1 })}
            className="ghost"
            style={{ padding: '6px 12px', fontSize: '13px', marginTop: 0 }}
          >
            ◀ Prev
          </button>
          <button 
            disabled={page >= totalPages} 
            onClick={() => loadData(token, { page: page + 1 })}
            className="ghost"
            style={{ padding: '6px 12px', fontSize: '13px', marginTop: 0 }}
          >
            Next ▶
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TeacherDashboard() {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('teacher_token') || '');
  const [username, setUsername] = useState(() => localStorage.getItem('teacher_username') || '');
  
  // Table state managers
  const [questions, setQuestions] = useState([]);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [sortBy, setSortBy] = useState('updatedAt');
  const [sortOrder, setSortOrder] = useState('desc');

  const [stats, setStats] = useState({ total: 0, draft: 0, underReview: 0, approved: 0, active: 0, retired: 0 });
  const [view, setView] = useState('dashboard');
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [loginError, setLoginError] = useState('');
  const [globalBanner, setGlobalBanner] = useState('');

  async function loadData(activeToken, overrideParams = {}) {
    const t = activeToken || token;
    if (!t) return;
    setLoading(true);

    const targetPage = overrideParams.page !== undefined ? overrideParams.page : page;
    const targetSearch = overrideParams.search !== undefined ? overrideParams.search : searchQuery;
    const targetStatus = overrideParams.status !== undefined ? overrideParams.status : selectedStatus;
    const targetSortBy = overrideParams.sortBy !== undefined ? overrideParams.sortBy : sortBy;
    const targetSortOrder = overrideParams.sortOrder !== undefined ? overrideParams.sortOrder : sortOrder;

    try {
      const params = new URLSearchParams({
        page: targetPage,
        limit,
        search: targetSearch,
        status: targetStatus,
        sortBy: targetSortBy,
        sortOrder: targetSortOrder
      });

      const [questionsData, statsData] = await Promise.all([
        api('GET', `/api/teacher/questions?${params.toString()}`, null, t),
        api('GET', '/api/teacher/statistics', null, t)
      ]);

      setQuestions(questionsData.questions || []);
      setTotalQuestions(questionsData.totalQuestions || 0);
      setTotalPages(questionsData.totalPages || 1);
      setPage(questionsData.currentPage || 1);

      setStats(statsData || { total: 0, draft: 0, underReview: 0, approved: 0, active: 0, retired: 0 });
    } catch (err) {
      console.error(err);
      if (err.message.includes('401') || err.message.includes('403')) {
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

  // Reload data when active status filter, sorting header, or search query changes
  useEffect(() => {
    if (token) {
      loadData(token, { page: 1 });
    }
  }, [selectedStatus, sortBy, sortOrder, searchQuery]);

  useEffect(() => {
    if (!auth) {
      setInitializing(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setInitializing(true);
      if (user) {
        setFirebaseUser(user);
        console.log('[Diagnostic] Firebase Auth State: USER LOGGED IN. UID:', user.uid);
        try {
          const idToken = await user.getIdToken();
          console.log('[Diagnostic] ID Token obtained. Sending to verify-token...');
          const data = await api('POST', '/api/teacher/verify-token', { idToken });
          
          localStorage.setItem('teacher_token', idToken);
          localStorage.setItem('teacher_username', data.email);
          setToken(idToken);
          setUsername(data.email);
          
          await loadData(idToken);
        } catch (err) {
          console.error('[Diagnostic] Verification failed:', err.message);
          setLoginError(err.message);
          if (auth) await signOut(auth);
        }
      } else {
        console.log('[Diagnostic] Firebase Auth State: NO USER');
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
    <div className="teacher-control-center" style={{ width: '100%', padding: '20px' }}>
      
      {/* Global Action Success Banner */}
      {globalBanner && (
        <div style={{ 
          maxWidth: '850px', 
          margin: '0 auto 15px auto', 
          background: 'rgba(74, 222, 128, 0.1)', 
          border: '1px solid #4ade80', 
          color: '#4ade80', 
          padding: '12px', 
          borderRadius: '8px', 
          fontSize: '14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{globalBanner}</span>
          <button onClick={() => setGlobalBanner('')} className="ghost" style={{ margin: 0, padding: '3px 8px', fontSize: '11px', borderColor: '#4ade80', color: '#4ade80' }}>Dismiss</button>
        </div>
      )}

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

      {view === 'review' && selectedQuestion && (
        <QuestionReviewView 
          token={token}
          question={selectedQuestion}
          onClose={() => { setSelectedQuestion(null); setView('list'); }}
          onActionSuccess={(updatedQuestion, message) => {
            setSelectedQuestion(updatedQuestion); // Update displayed state in-place
            setGlobalBanner(message);
            loadData(token); // refresh page list & stats
          }}
        />
      )}

      {view === 'list' && (
        <QuestionsListView 
          token={token} 
          setView={setView} 
          questions={questions} 
          loadData={loadData}
          setEditingQuestion={setEditingQuestion}
          page={page}
          totalPages={totalPages}
          totalQuestions={totalQuestions}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedStatus={selectedStatus}
          setSelectedStatus={setSelectedStatus}
          sortBy={sortBy}
          setSortBy={setSortBy}
          sortOrder={sortOrder}
          setSortOrder={setSortOrder}
          setSelectedQuestion={setSelectedQuestion}
        />
      )}
    </div>
  );
}
