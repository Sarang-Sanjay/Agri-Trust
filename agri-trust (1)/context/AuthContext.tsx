import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { AuthContextType, UserRole } from '../types';
import { LS_KEY_AUTH_STATE } from '../constants';

// Initial authentication state
const initialAuthState = {
  isAuthenticated: false,
  userRole: UserRole.NONE,
  userId: null,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState(initialAuthState);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const storedAuth = localStorage.getItem(LS_KEY_AUTH_STATE);
      if (storedAuth) {
        setAuthState(JSON.parse(storedAuth));
      }
    } catch (error) {
      console.error("Failed to parse auth state from localStorage:", error);
      localStorage.removeItem(LS_KEY_AUTH_STATE); // Clear potentially corrupt data
    } finally {
      setLoading(false);
    }
  }, []);

  // Use useCallback to memoize login and logout functions to prevent unnecessary re-renders
  const login = useCallback((role: UserRole, id: string) => {
    const newState = { isAuthenticated: true, userRole: role, userId: id };
    setAuthState(newState);
    localStorage.setItem(LS_KEY_AUTH_STATE, JSON.stringify(newState));
  }, []);

  const logout = useCallback(() => {
    // Before clearing auth state, save current role for feedback page if it was a valid role
    if (authState.userRole !== UserRole.NONE) {
      localStorage.setItem('lastUserRole', authState.userRole);
    }
    setAuthState(initialAuthState);
    localStorage.removeItem(LS_KEY_AUTH_STATE);
  }, [authState]); // Dependency on authState to get the correct role before it's reset

  return (
    <AuthContext.Provider value={{ ...authState, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};