import React, { createContext, useContext, useState, useCallback } from 'react';
import { trades as tradesApi } from '../services/api';
import { useAuth } from './AuthContext';

const TradeContext = createContext();
export const useTrades = () => useContext(TradeContext);

export const TradeProvider = ({ children }) => {
  const { user } = useAuth();
  const [trades, setTrades] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  const fetchTrades = useCallback(async (params = {}) => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await tradesApi.list(params);
      setTrades(data.trades || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Failed to fetch trades:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchAnalytics = useCallback(async () => {
    if (!user) return;
    try {
      const data = await tradesApi.analytics();
      setAnalytics(data);
      return data;
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    }
  }, [user]);

  const addTrade = async (tradeData, file) => {
    const formData = new FormData();
    Object.entries(tradeData).forEach(([key, val]) => {
      if (val !== null && val !== undefined) {
        if (Array.isArray(val)) {
          formData.append(key, JSON.stringify(val));
        } else {
          formData.append(key, val);
        }
      }
    });
    if (file) formData.append('chart', file);

    const newTrade = await tradesApi.create(formData);
    setTrades(prev => [newTrade, ...prev]);
    return newTrade;
  };

  const updateTrade = async (id, tradeData, file) => {
    const formData = new FormData();
    Object.entries(tradeData).forEach(([key, val]) => {
      if (val !== null && val !== undefined) {
        if (Array.isArray(val)) {
          formData.append(key, JSON.stringify(val));
        } else {
          formData.append(key, val);
        }
      }
    });
    if (file) formData.append('chart', file);

    const updated = await tradesApi.update(id, formData);
    setTrades(prev => prev.map(t => t.id === id ? updated : t));
    return updated;
  };

  const deleteTrade = async (id) => {
    await tradesApi.delete(id);
    setTrades(prev => prev.filter(t => t.id !== id));
  };

  const shareTrade = async (id) => {
    const { shareToken } = await tradesApi.share(id);
    setTrades(prev => prev.map(t => t.id === id ? { ...t, shareToken } : t));
    return shareToken;
  };

  const unshareTrade = async (id) => {
    await tradesApi.unshare(id);
    setTrades(prev => prev.map(t => t.id === id ? { ...t, shareToken: null } : t));
  };

  const importTrades = async (tradesArr) => {
    const result = await tradesApi.import(tradesArr);
    await fetchTrades(); // Refresh
    return result;
  };

  const exportTrades = async () => {
    return await tradesApi.export();
  };

  return (
    <TradeContext.Provider value={{
      trades, loading, total, analytics,
      fetchTrades, fetchAnalytics,
      addTrade, updateTrade, deleteTrade,
      shareTrade, unshareTrade,
      importTrades, exportTrades,
    }}>
      {children}
    </TradeContext.Provider>
  );
};
