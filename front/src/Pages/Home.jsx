import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';
import { useNotification } from '../Components/Notification';
import MusicPlayer from '../Components/MusicPlayer';

export default function Home() {
  const { showNotification, askConfirmation } = useNotification();
  const navigate = useNavigate();
  const [moodText, setMoodText] = useState("");
  const [currentUrl, setCurrentUrl] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleLogout = () => {
    askConfirmation("Do you want to sign out?", () => {
      localStorage.clear();
      navigate('/');
    });
  };

  const handleRecommend = async () => {
    if (!moodText.trim()) return;
    setLoading(true);
    try {
      const userId = localStorage.getItem('userId'); // <-- get logged-in user ID
      const response = await fetch('http://localhost:8000/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: moodText, user_id: userId }), // <-- send user_id
      });
      const data = await response.json();
      if (response.ok) {
        setResults(data);
        showNotification("Analysis complete!", "success");
      } else {
        showNotification(data.detail || "Error", "error");
      }
    } catch (error) {
      showNotification("Backend is offline!", "error");
    } finally { setLoading(false); }
  };

  return (
    <div className="home-container">
    <nav className="navbar">
      <div className="nav-left"></div> 

      <h1 className="logo">MusicMood</h1>

      <div className="nav-right">
        <button onClick={() => navigate('/profile')} className="nav-btn">Profile</button>
        <button onClick={handleLogout} className="logout-btn">Logout</button>
      </div>
    </nav>

      <main className="content">
        <section className="mood-section">
          <h2>How are you feeling today?</h2>
          <textarea 
            className="mood-input" 
            placeholder="Tell me about your day..."
            value={moodText}
            onChange={(e) => setMoodText(e.target.value)}
          ></textarea>
          <button className="generate-btn" onClick={handleRecommend} disabled={loading}>
            {loading ? "Analyzing..." : "Find my mood music"}
          </button>
        </section>

        {results && (
        <section className="results-section">
          <h3>Top 4 matches for you:</h3>
          <div className="recommendations-grid">
            {results.recommendations.map((song, index) => (
              <div key={index} className="recommendation-card" onClick={() => setCurrentUrl(song.url)}>
                <div className="match-score">{song.score}% Match</div>
                
                <div className="card-main-content">
                  <div className="music-note-icon">
                    <span className="status-icon">🎵</span>
                    <span className="play-icon">▶</span>
                  </div>

                  <div className="song-info">
                    <h4>{song.title}</h4>
                    <p>{song.artist}</p>
                    
                    <div className="mood-mini-tags">
                      {Object.entries(song.mood)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 2)
                        .map(([emo]) => (
                          <span key={emo} className={`mini-tag ${emo}`}>{emo}</span>
                        ))
                      }
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      </main>
      <MusicPlayer url={currentUrl} onClose={() => setCurrentUrl(null)} />
    </div>
  );
}