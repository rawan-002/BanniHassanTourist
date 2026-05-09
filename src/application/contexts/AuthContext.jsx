

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  subscribeToAuthState,
  signUp,
  signIn,
  logOut,
  resendVerification,
} from '../services/authService.js';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToAuthState((user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    isAuthenticated: !!currentUser,
    isLoading:       loading,
    signup:          signUp,
    login:           signIn,
    logout:          logOut,
    resendVerificationEmail: resendVerification,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
