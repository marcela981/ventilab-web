/**
 * =============================================================================
 * NotificationContext - Global Notification System
 * =============================================================================
 * Provides a centralized notification system using Material UI Snackbar
 * for displaying success, error, warning, and info messages.
 * =============================================================================
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Snackbar, Alert, Slide } from '@mui/material';

// =============================================================================
// Context Creation
// =============================================================================

const NotificationContext = createContext(undefined);

// =============================================================================
// Slide Transition Component
// =============================================================================

function SlideTransition(props) {
  return <Slide {...props} direction="down" />;
}

// =============================================================================
// NotificationProvider Component
// =============================================================================

/**
 * Notification Provider Component
 * Wraps the application and provides notification functions to all children
 *
 * @component
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to wrap
 * @returns {JSX.Element} Provider component with notification context
 */
export function NotificationProvider({ children }) {
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'info', // 'success' | 'error' | 'warning' | 'info'
    duration: 6000,
  });

  /**
   * Show a notification
   * @param {string} message - Message to display
   * @param {string} severity - Severity level (success, error, warning, info)
   * @param {number} duration - Duration in milliseconds (default: 6000)
   */
  const showNotification = useCallback((message, severity = 'info', duration = 6000) => {
    setNotification({
      open: true,
      message,
      severity,
      duration,
    });
  }, []);

  /**
   * Show success notification
   * @param {string} message - Success message
   */
  const showSuccess = useCallback((message) => {
    showNotification(message, 'success', 6000);
  }, [showNotification]);

  /**
   * Show error notification
   * @param {string} message - Error message
   */
  const showError = useCallback((message) => {
    showNotification(message, 'error', 8000);
  }, [showNotification]);

  /**
   * Show warning notification
   * @param {string} message - Warning message
   */
  const showWarning = useCallback((message) => {
    showNotification(message, 'warning', 6000);
  }, [showNotification]);

  /**
   * Show info notification
   * @param {string} message - Info message
   */
  const showInfo = useCallback((message) => {
    showNotification(message, 'info', 6000);
  }, [showNotification]);

  /**
   * Close notification
   */
  const handleClose = (event, reason) => {
    // Don't close if user clicked away
    if (reason === 'clickaway') {
      return;
    }

    setNotification((prev) => ({
      ...prev,
      open: false,
    }));
  };

  const contextValue = {
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}

      {/* Global Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={notification.duration}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        TransitionComponent={SlideTransition}
      >
        <Alert
          onClose={handleClose}
          severity={notification.severity}
          variant="filled"
          sx={{
            width: '100%',
            minWidth: 300,
            boxShadow: 3,
          }}
          elevation={6}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </NotificationContext.Provider>
  );
}

NotificationProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

// =============================================================================
// useNotification Hook
// =============================================================================

/**
 * Custom hook to use notification context
 *
 * @throws {Error} If used outside of NotificationProvider
 * @returns {Object} Notification functions
 *
 * @property {Function} showNotification - Show notification with custom settings
 * @property {Function} showSuccess - Show success notification
 * @property {Function} showError - Show error notification
 * @property {Function} showWarning - Show warning notification
 * @property {Function} showInfo - Show info notification
 *
 * @example
 * const { showSuccess, showError } = useNotification();
 *
 * // Show success message
 * showSuccess('Profile updated successfully!');
 *
 * // Show error message
 * showError('Failed to update profile');
 */
export function useNotification() {
  const context = useContext(NotificationContext);

  if (context === undefined) {
    throw new Error(
      'useNotification must be used within a NotificationProvider. ' +
      'Make sure your component is wrapped with <NotificationProvider>.'
    );
  }

  return context;
}

export default NotificationContext;

