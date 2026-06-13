import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth as authApi, publicApi } from '../services/api';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check session on mount
  useEffect(() => {
    const checkSession = async () => {
      // First check if we are landing on a share page to capture the token
      let token = null;
      if (window.location.pathname.startsWith('/shared/dashboard/')) {
        const parts = window.location.pathname.split('/');
        token = parts[parts.length - 1];
        if (token) {
          sessionStorage.setItem('guestToken', token);
        }
      }

      const guestToken = sessionStorage.getItem('guestToken');
      if (guestToken) {
        try {
          const data = await publicApi.getDashboard(guestToken);
          setUser({
            isGuest: true,
            guestToken,
            displayName: data?.user?.displayName || 'Trader',
            accountSize: data?.user?.accountSize || '100000',
            currency: data?.user?.currency || 'USD',
            riskPercent: data?.user?.riskPercent || '1',
          });
        } catch (err) {
          console.error('Failed to load guest showcase:', err);
          sessionStorage.removeItem('guestToken');
          setUser(null);
        } finally {
          setLoading(false);
        }
        return;
      }

      // Normal auth
      try {
        const userData = await authApi.me();
        setUser(userData);
      } catch (err) {
        localStorage.removeItem('token');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  const login = async (email, password) => {
    const { user: userData, token } = await authApi.login(email, password);
    if (token) {
      localStorage.setItem('token', token);
    }
    setUser(userData);
    return userData;
  };

  const register = async (email, password, displayName) => {
    const { user: userData, token } = await authApi.register(email, password, displayName);
    if (token) {
      localStorage.setItem('token', token);
    }
    setUser(userData);
    return userData;
  };

  const updateProfile = async (data) => {
    const userData = await authApi.updateProfile(data);
    setUser(userData);
    return userData;
  };

  const refreshUser = async () => {
    try {
      const userData = await authApi.me();
      setUser(userData);
      return userData;
    } catch (err) {
      localStorage.removeItem('token');
      setUser(null);
    }
  };

  const logout = async () => {
    localStorage.removeItem('token');
    if (sessionStorage.getItem('guestToken')) {
      sessionStorage.removeItem('guestToken');
      setUser(null);
      return;
    }
    await authApi.logout().catch(() => {});
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateProfile, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};
