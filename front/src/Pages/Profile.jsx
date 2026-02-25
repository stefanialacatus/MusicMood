import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Profile.css';
import { useNotification } from '../Components/Notification';
import MusicPlayer from '../Components/MusicPlayer';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faCircleInfo } from '@fortawesome/free-solid-svg-icons';

export default function Profile() {
  const { showNotification, askConfirmation } = useNotification();
  const navigate = useNavigate();
  
  const [songs, setSongs] = useState([]);
  const [history, setHistory] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [songUrl, setSongUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(null);
  const [expandedSongs, setExpandedSongs] = useState({});

  const userId = localStorage.getItem('userId');
  const username = localStorage.getItem('username') || "User";

  const toggleInfo = (songId) => {
    setExpandedSongs(prev => ({
      ...prev,
      [songId]: !prev[songId]
    }));
  };
  useEffect(() => {
    if (!isModalOpen) {
      setSongUrl("");
    }
  }, [isModalOpen]);

  useEffect(() => {
    if (!userId) {
      navigate('/');
    } else {
      fetchData();
    }
  }, [userId]);

  const fetchData = async () => {
    try {
      // Fetch user songs
      const sRes = await fetch(`http://localhost:8000/my-songs/${userId}`);
      setSongs(await sRes.json());

      // Fetch user-specific history
      const hRes = await fetch(`http://localhost:8000/history/${userId}`);
      setHistory(await hRes.json());
    } catch (e) { 
      showNotification("Failed to fetch profile data.", "error");
    }
  };

  const handleAddByUrl = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/add-song-by-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: songUrl, user_id: userId })
      });

      if (res.ok) {
        showNotification("Song added and analyzed!", "success");
        setIsModalOpen(false);
        fetchData();
      } else {
        const data = await res.json();
        showNotification(data.detail || "Could not add song.", "error");
      }
    } catch (err) {
      showNotification("Error adding song.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (songId) => {
    askConfirmation(
      "This song will be permanently removed from your library.",
      async () => {
        try {
          const res = await fetch(`http://localhost:8000/delete-song/${songId}`, {
            method: 'DELETE'
          });
          if (res.ok) {
            showNotification("Song deleted successfully", "success");
            fetchData();
            if (currentUrl === songs.find(s => s.id === songId)?.url) setCurrentUrl(null);
          }
        } catch (e) {
          showNotification("Could not delete the song", "error");
        }
      },
      "Logout", 
      "danger-btn"
    );
  };

  const handleLogout = () => {
    askConfirmation(
      "Are you sure you want to log out?",
      () => {
        localStorage.clear();
        navigate('/');
      },
      "Logout",
      "danger-btn"
    );
  };

  return (
    <div className="profile-container">
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Add Song via Link</h3>
            <p>Paste a YouTube link to analyze its mood.</p>
            <form onSubmit={handleAddByUrl}>
              <input 
                type="url" 
                placeholder="https://www.youtube.com/watch?v=..." 
                value={songUrl}
                onChange={(e) => setSongUrl(e.target.value)}
                required
              />
              <div className="modal-actions">
                <button type="button" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" disabled={loading}>
                  {loading ? "Analyzing Lyrics..." : "Add Song"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <nav className="navbar">
        <div className="nav-left">
          <button onClick={() => navigate('/home')} className="back-btn">
            <FontAwesomeIcon icon={faArrowLeft} /> 
            <span>Back to Mood</span>
          </button>
        </div>

        <h1 className="logo">MusicMood</h1>

        <div className="nav-right">
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
      </nav>
      
      <div className="profile-layout">
        <div className="main-profile-column">
          <div className="profile-card user-header-card">
            <div className="user-info">
              <div className="avatar">{username[0].toUpperCase()}</div>
              <h2>{username}'s Library</h2>
            </div>
          </div>

          <div className="actions-bar">
            <button className="add-song-btn" onClick={() => setIsModalOpen(true)}>
              + Add New Song
            </button>
          </div>

          <div className="profile-card songs-card">
            <div className="songs-section">
              <h3>Saved Songs ({songs.length})</h3>
              <div className="songs-scroll">
                {songs.map(song => (
                  <div key={song.id} className="song-wrapper"> {/* Wrapped for better layout */}
                    <div className="song-item">
                      <div className="song-main-info" onClick={() => setCurrentUrl(song.url)} style={{cursor: 'pointer'}}>
                        <div className="music-note-icon">
                          <span className="status-icon">
                            {currentUrl === song.url ? "⏸" : "🎵"}
                          </span>
                          <span className="play-icon">▶</span>
                        </div>
                        <div className="song-details">
                          <p className="song-title">{song.title}</p>
                          <p className="song-artist">{song.artist}</p>
                        </div>
                      </div>
                      
                      <div className="song-actions"> {/* Grouped buttons */}
                        <button 
                          className={`info-btn ${expandedSongs[song.id] ? 'active' : ''}`} 
                          onClick={() => toggleInfo(song.id)}
                          title="Show Mood Info"
                        >
                          <FontAwesomeIcon icon={faCircleInfo} />
                        </button>
                        
                        <button className="delete-btn" onClick={() => handleDelete(song.id)}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Emotion tags appear here when active */}
                    {expandedSongs[song.id] && song.mood && (
                      <div className="song-mood-details">
                        <div className="emotion-tags">
                          {Object.entries(song.mood)
                            .sort((a, b) => b[1] - a[1]) // Sort highest to lowest
                            .map(([name, val]) => (
                              <span key={name} className={`mood-tag ${name}`}>
                                {name} ({(val * 100).toFixed(0)}%)
                              </span>
                            ))
                          }
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="history-column">
          <div className="profile-card history-card">
            <div className="history-section">
              <h3>Previous Moods</h3>
              <div className="history-list">
                {history.map((h, i) => (
                  <div key={i} className="history-item">
                    <p className="history-text">"{h.text}"</p>
                    <div className="emotion-tags">
                      {Object.entries(h.user_mood).sort((a,b) => b[1]-a[1]).map(([name, val]) => (
                        <span key={name} className={`mood-tag ${name}`}>{name}</span>
                      ))}
                    </div>
                    {h.recommendations && h.recommendations.length > 0 && (
                      <div className="history-recommendation">
                        <small>Recommended:</small> 
                        <span>{h.recommendations.map(r => r.title).join(", ")}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <MusicPlayer url={currentUrl} onClose={() => setCurrentUrl(null)} />
    </div>
  );
}