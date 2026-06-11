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
      const data = await journalApi.list(params);
      setEntries(data);
    } catch (err) {
      console.error('Failed to fetch journal entries:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const getEntry = useCallback(async (date) => {
    if (!user) return null;
    try {
      const entry = await journalApi.getByDate(date);
      setCurrentEntry(entry);
      return entry;
    } catch (err) {
      console.error('Failed to get journal entry:', err);
      return null;
    }
  }, [user]);

  const saveEntry = async (entryData) => {
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
