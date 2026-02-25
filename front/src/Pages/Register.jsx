import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Auth.css';
import { useNotification } from '../Components/Notification';

export default function Register() {
const { showNotification } = useNotification();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ username: '', password: '' });

const handleRegister = async (e) => {
  e.preventDefault();
  
  try {
    const response = await fetch('http://localhost:8000/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    const data = await response.json();

if (response.ok) {
  showNotification("Account created! Please log in.", "success");
  navigate('/'); 
} else if (response.status === 422) {
  const errorMsg = data.detail.map(err => `${err.loc[1]}: ${err.msg}`).join("\n");
  showNotification("Validation Error:\n" + errorMsg, "error");
} else {
  showNotification(data.detail || "Registration failed", "error");
}
  } catch (error) {
    console.error("Connection error:", error);
    showNotification("Backend is offline. Check if main.py is running.", "error");
  }
};

  return (
    <div className="auth-wrapper">
      <form className="auth-card" onSubmit={handleRegister}>
        <div className="logo-brand">MusicMood</div>
        <h2>Create Account</h2>
        <p className="auth-subtitle">Join the community today</p>
        
        <div className="input-group">
          <label>Username</label>
          <input 
            type="text" 
            placeholder="Choose a username" 
            onChange={(e) => setFormData({...formData, username: e.target.value})}
            required 
          />
        </div>
        
        <div className="input-group">
          <label>Password</label>
          <input 
            type="password" 
            placeholder="Choose a password" 
            onChange={(e) => setFormData({...formData, password: e.target.value})}
            required 
          />
        </div>
        
        <button type="submit" className="auth-btn">Sign Up</button>
        <p className="switch-text">
          Already have an account? <Link to="/">Log In</Link>
        </p>
      </form>
    </div>
  );
}