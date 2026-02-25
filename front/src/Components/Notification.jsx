import React, { createContext, useState, useContext, useCallback } from 'react';
import './Notification.css';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notification, setNotification] = useState(null);
  const [confirmData, setConfirmData] = useState(null); 

  const showNotification = useCallback((message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  }, []);

  /**
   * askConfirmation now accepts optional confirmText and confirmClass
   * - confirmText: text shown on the confirm button
   * - confirmClass: CSS class for the confirm button
   */
  const askConfirmation = useCallback((message, onConfirm, confirmText = 'Confirm', confirmClass = 'danger-btn') => {
    setConfirmData({ message, onConfirm, confirmText, confirmClass });
  }, []);

  const closeConfirm = () => setConfirmData(null);

  return (
    <NotificationContext.Provider value={{ showNotification, askConfirmation }}>
      {children}
      
      {notification && (
        <div className={`toast-container ${notification.type}`}>
          <div className="toast-content">
            <p>{notification.message}</p>
          </div>
        </div>
      )}

      {confirmData && (
        <div className="confirm-overlay">
          <div className="confirm-modal">
            <h3>Are you sure?</h3>
            <p>{confirmData.message}</p>
            <div className="confirm-actions">
              <button className="cancel-btn" onClick={closeConfirm}>Cancel</button>
              <button 
                className={confirmData.confirmClass} 
                onClick={() => {
                  confirmData.onConfirm();
                  closeConfirm();
                }}
              >
                {confirmData.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => useContext(NotificationContext);