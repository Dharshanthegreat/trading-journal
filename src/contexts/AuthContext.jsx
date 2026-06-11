import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth as authApi } from '../services/api';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check session on mount
  useEffect(() => {
    authApi.me()
      .then(userData => {
        setUser(userData);
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const { user: userData } = await authApi.login(email, password);
    setUser(userData);
    return userData;
  };

  const register = async (email, password, displayName) => {
    const { user: userData } = await authApi.register(email, password, displayName);
    setUser(userData);
    return userData;
  };

  const updateProfile = async (data) => {
    const userData = await authApi.updateProfile(data);
    setUser(userData);
    return userData;
  };

  const logout = async () => {
    await authApi.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
