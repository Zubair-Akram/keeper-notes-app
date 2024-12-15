import React, { useState, useEffect } from 'react';
import './App.css';

const API_URL = 'http://localhost:5000/api';

function App() {
  const [user, setUser] = useState(null);
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState({ title: '', content: '' });
  const [authState, setAuthState] = useState('login');
  const [authError, setAuthError] = useState('');
  const [notification, setNotification] = useState('');
  const [checkedNotes, setCheckedNotes] = useState({});

  useEffect(() => {
    if (localStorage.getItem('token')) {
      fetchUserDetails();
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchNotes();
    }
  }, [user]);

  const handleAuthChange = (e) => {
    setAuthError('');
    setAuthState(e.target.value);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewNote((prev) => ({ ...prev, [name]: value }));
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    const { username, password } = e.target.elements;

    try {
      if (authState === 'login') {
        const res = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: username.value, password: password.value }),
        });
        const data = await res.json();
        if (data.token) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('username', data.username);
          setUser(data.username);
          setNotification('Logged in successfully');
        } else {
          setAuthError(data.message || 'Login failed');
        }
      } else {
        const res = await fetch(`${API_URL}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: username.value, password: password.value }),
        });
        const data = await res.json();
        if (data.message === 'User registered successfully') {
          setAuthState('login');
          setNotification('User registered successfully');
        } else {
          setAuthError(data.message || 'Registration failed');
        }
      }
    } catch (error) {
      setAuthError('An error occurred. Please try again later.');
    }
  };

  const fetchUserDetails = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      const username = localStorage.getItem('username');
      setUser(username);
    }
  };

  const fetchNotes = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await fetch(`${API_URL}/notes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.notes) {
        setNotes(data.notes);
      }
    } catch (error) {
      setNotification('Failed to fetch notes');
    }
  };

  const addNote = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/notes/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newNote),
      });
      const data = await res.json();
      if (data.message === 'Note added successfully') {
        setNewNote({ title: '', content: '' });
        setNotification('Note added successfully');
        fetchNotes();
      }
    } catch (error) {
      setNotification('Failed to add note');
    }
  };

  const deleteNote = async (noteId) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/notes/${noteId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.message === 'Note deleted successfully') {
        setNotification('Note deleted successfully');
        fetchNotes();
      }
    } catch (error) {
      setNotification('Failed to delete note');
    }
  };

  const toggleNoteStyle = (noteId) => {
    setCheckedNotes((prev) => ({
      ...prev,
      [noteId]: !prev[noteId],
    }));
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setUser(null);
    setNotes([]);
    setNotification('Logged out successfully');
  };

  return (
    <div className="App">
      <h1>Keeper Notes</h1>
      {notification && <div className="notification">{notification}</div>}
      {!user ? (
        <div>
          <h2>{authState === 'login' ? 'Login' : 'Register'}</h2>
          <form onSubmit={handleAuthSubmit}>
            <input name="username" placeholder="Username" required />
            <input name="password" type="password" placeholder="Password" required />
            <button type="submit">{authState === 'login' ? 'Login' : 'Register'}</button>
          </form>
          <p>
            {authState === 'login' ? 'Not a member? ' : 'Already a member? '}
            <button onClick={handleAuthChange} value={authState === 'login' ? 'register' : 'login'}>
              {authState === 'login' ? 'Register' : 'Login'}
            </button>
          </p>
          {authError && <p className="error">{authError}</p>}
        </div>
      ) : (
        <div>
          <div className="welcome-container">
            <h2>Welcome, {user}!</h2>
            <button onClick={handleLogout}>Logout</button>
          </div>
          <form onSubmit={addNote}>
            <input
              name="title"
              value={newNote.title}
              onChange={handleInputChange}
              placeholder="Note Title"
              required
            />
            <textarea
              name="content"
              value={newNote.content}
              onChange={handleInputChange}
              placeholder="Note Content"
              required
            />
            <button type="submit">Add Note</button>
          </form>

          <div className="notes-list">
            {notes.map((note) => (
              <div
                className={`note ${checkedNotes[note._id] ? 'checked' : ''}`}
                key={note._id}
              >
                <h3>{note.title}</h3>
                <p>{note.content}</p>
                <input
                  type="checkbox"
                  checked={!!checkedNotes[note._id]}
                  onChange={() => toggleNoteStyle(note._id)}
                />
                <button onClick={() => deleteNote(note._id)}>Delete</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
