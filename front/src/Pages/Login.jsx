import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Auth.css';
import { useNotification } from '../Components/Notification';

export default function Login() {
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ username: '', password: '' });

const handleLogin = async (e) => {
  e.preventDefault();
  
  try {
    const response = await fetch('http://localhost:8000/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    const data = await response.json();

    if (response.ok) {
      localStorage.setItem('username', data.username);
      localStorage.setItem('userId', data.id); 
      localStorage.setItem('isLoggedIn', 'true');
      showNotification("Login successful!", "success");
      navigate('/home');
    } else {
      showNotification(data.detail || "Invalid credentials", "error");
    }
  } catch (error) {
    showNotification("Could not connect to the backend server.", "error");
  }
};

  return (
    <div className="auth-wrapper">
      <form className="auth-card" onSubmit={handleLogin}>
        <div className="logo-brand">MusicMood</div>
        <h2>Welcome Back</h2>
        <p className="auth-subtitle">Log in to your account</p>
        
        <div className="input-group">
          <label>Username</label>
          <input 
            type="text" 
            placeholder="Enter your username" 
            onChange={(e) => setFormData({...formData, username: e.target.value})}
            required 
          />
        </div>
        
        <div className="input-group">
          <label>Password</label>
          <input 
            type="password" 
            placeholder="Enter your password" 
            onChange={(e) => setFormData({...formData, password: e.target.value})}
            required 
          />
        </div>
        
        <button type="submit" className="auth-btn">Log In</button>
        <p className="switch-text">
          Don't have an account? <Link to="/signup">Sign Up</Link>
        </p>
      </form>
    </div>
  );
}