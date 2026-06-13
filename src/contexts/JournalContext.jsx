import React, { createContext, useContext, useState, useCallback } from 'react';
import { journal as journalApi } from '../services/api';
import { useAuth } from './AuthContext';

const JournalContext = createContext();
export const useJournal = () => useContext(JournalContext);

export const JournalProvider = ({ children }) => {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [currentEntry, setCurrentEntry] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchEntries = useCallback(async (params = {}) => {
    if (!user) return;
    setLoading(true);
    try {
      if (user.isGuest) {
        const { publicApi } = await import('../services/api');
        const data = await publicApi.getDashboard(user.guestToken);
        setEntries(data.journalEntries || []);
      } else {
        const data = await journalApi.list(params);
        setEntries(data);
      }
    } catch (err) {
      console.error('Failed to fetch journal entries:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const getEntry = useCallback(async (date) => {
    if (!user) return null;
    try {
      if (user.isGuest) {
        const entry = entries.find(e => e.date === date) || null;
        setCurrentEntry(entry);
        return entry;
      }
      const entry = await journalApi.getByDate(date);
      setCurrentEntry(entry);
      return entry;
    } catch (err) {
      console.error('Failed to get journal entry:', err);
      return null;
    }
  }, [user, entries]);

  const saveEntry = async (entryData) => {
    if (user?.isGuest) {
      alert("This is a read-only showcase dashboard. You cannot save journal entries.");
      return null;
    }
    const saved = await journalApi.save(entryData);
    setCurrentEntry(saved);
    setEntries(prev => {
      const idx = prev.findIndex(e => e.date === saved.date);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = saved;
        return updated;
      }
      return [saved, ...prev];
    });
    return saved;
  };

  const deleteEntry = async (id) => {
    if (user?.isGuest) {
      alert("This is a read-only showcase dashboard. You cannot delete journal entries.");
      return;
    }
    await journalApi.delete(id);
    setEntries(prev => prev.filter(e => e.id !== id));
    setCurrentEntry(null);
  };

  return (
    <JournalContext.Provider value={{
      entries, currentEntry, loading,
      fetchEntries, getEntry, saveEntry, deleteEntry,
    }}>
      {children}
    </JournalContext.Provider>
  );
};
