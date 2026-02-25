import React from 'react';
import './MusicPlayer.css';

export default function MusicPlayer({ url, onClose }) {
  if (!url) return null;

  const getYouTubeId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const videoId = getYouTubeId(url);

  if (!videoId) {
    return (
      <div className="floating-player-container">
        <button className="close-player" onClick={onClose}>×</button>
        <p style={{ padding: '20px', color: 'white' }}>Format link invalid</p>
      </div>
    );
  }

  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=1&rel=0&origin=${window.location.origin}`;

  return (
    <div className="floating-player-container">
      <button className="close-player" onClick={onClose}>×</button>
      <div className="player-wrapper">
        <iframe
          width="100%"
          height="100%"
          src={embedUrl}
          title="YouTube video player"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      </div>
    </div>
  );
}