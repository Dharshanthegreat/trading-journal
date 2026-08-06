import React, { createContext, useContext, useState, useCallback } from 'react';
import { trades as tradesApi } from '../services/api';
import { useAuth } from './AuthContext';

const TradeContext = createContext();
export const useTrades = () => useContext(TradeContext);

export const sortTradesByDateDesc = (tradesList) => {
  if (!Array.isArray(tradesList)) return [];
  return [...tradesList].sort((a, b) => {
    const timeA = new Date(a.entryTime || a.entry_time || a.date || a.createdAt || a.created_at || 0).getTime();
    const timeB = new Date(b.entryTime || b.entry_time || b.date || b.createdAt || b.created_at || 0).getTime();
    if (timeB !== timeA) return timeB - timeA;
    const createdA = new Date(a.createdAt || a.created_at || 0).getTime() || (parseInt(a.id) || 0);
    const createdB = new Date(b.createdAt || b.created_at || 0).getTime() || (parseInt(b.id) || 0);
    return createdB - createdA;
  });
};

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
      if (user.isGuest) {
        const { publicApi } = await import('../services/api');
        const data = await publicApi.getDashboard(user.guestToken);
        setTrades(sortTradesByDateDesc(data.trades || []));
        setTotal(data.trades ? data.trades.length : 0);
        if (data.analytics) setAnalytics(data.analytics);
      } else {
        const data = await tradesApi.list(params);
        setTrades(sortTradesByDateDesc(data.trades || []));
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error('Failed to fetch trades:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchAnalytics = useCallback(async () => {
    if (!user) return;
    try {
      if (user.isGuest) {
        const { publicApi } = await import('../services/api');
        const data = await publicApi.getDashboard(user.guestToken);
        setAnalytics(data.analytics);
        return data.analytics;
      } else {
        const data = await tradesApi.analytics();
        setAnalytics(data);
        return data;
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    }
  }, [user]);

  const addTrade = async (tradeData, files) => {
    if (user?.isGuest) {
      alert("This is a read-only showcase dashboard. You cannot add trades.");
      return null;
    }
    const formData = new FormData();
    Object.entries(tradeData).forEach(([key, val]) => {
      if (val !== null && val !== undefined) {
        if (Array.isArray(val) || (typeof val === 'object' && val !== null)) {
          formData.append(key, JSON.stringify(val));
        } else {
          formData.append(key, val);
        }
      }
    });
    if (files) {
      if (Array.isArray(files)) {
        files.forEach(f => formData.append('chart', f));
      } else {
        formData.append('chart', files);
      }
    }

    const newTrade = await tradesApi.create(formData);
    setTrades(prev => sortTradesByDateDesc([newTrade, ...prev]));
    return newTrade;
  };

  const updateTrade = async (id, tradeData, files, existingImages = null) => {
    if (user?.isGuest) {
      alert("This is a read-only showcase dashboard. You cannot modify trades.");
      return null;
    }
    const formData = new FormData();
    Object.entries(tradeData).forEach(([key, val]) => {
      if (val !== null && val !== undefined) {
        if (Array.isArray(val) || (typeof val === 'object' && val !== null)) {
          formData.append(key, JSON.stringify(val));
        } else {
          formData.append(key, val);
        }
      }
    });
    if (existingImages) {
      formData.append('existingImages', JSON.stringify(existingImages));
    }
    if (files) {
      if (Array.isArray(files)) {
        files.forEach(f => formData.append('chart', f));
      } else {
        formData.append('chart', files);
      }
    }

    const updated = await tradesApi.update(id, formData);
    setTrades(prev => sortTradesByDateDesc(prev.map(t => t.id === id ? updated : t)));
    return updated;
  };

  const deleteTrade = async (id) => {
    if (user?.isGuest) {
      alert("This is a read-only showcase dashboard. You cannot delete trades.");
      return;
    }
    await tradesApi.delete(id);
    setTrades(prev => prev.filter(t => t.id !== id));
  };

  const shareTrade = async (id) => {
    if (user?.isGuest) {
      alert("This is a read-only showcase dashboard. You cannot share trades.");
      return null;
    }
    const res = await tradesApi.share(id);
    const shareToken = res?.shareToken || res?.token;
    setTrades(prev => prev.map(t => t.id === id ? { ...t, shareToken } : t));
    return shareToken;
  };

  const unshareTrade = async (id) => {
    if (user?.isGuest) {
      alert("This is a read-only showcase dashboard. You cannot modify trades.");
      return;
    }
    await tradesApi.unshare(id);
    setTrades(prev => prev.map(t => t.id === id ? { ...t, shareToken: null } : t));
  };

  const importTrades = async (tradesArr) => {
    if (user?.isGuest) {
      alert("This is a read-only showcase dashboard. You cannot import trades.");
      return null;
    }
    const result = await tradesApi.import(tradesArr);
    await fetchTrades(); // Refresh
    return result;
  };

  const exportTrades = async () => {
    if (user?.isGuest) {
      alert("This is a read-only showcase dashboard. You cannot export trades.");
      return null;
    }
    return await tradesApi.export();
  };

  const restoreTrade = async (id) => {
    if (user?.isGuest) {
      alert("This is a read-only showcase dashboard. You cannot restore trades.");
      return;
    }
    await tradesApi.restore(id);
    await fetchTrades();
  };

  const restoreAllTrades = async () => {
    if (user?.isGuest) {
      alert("This is a read-only showcase dashboard. You cannot restore trades.");
      return;
    }
    await tradesApi.restoreAll();
    await fetchTrades();
  };

  const value = useMemo(() => ({
    trades, loading, total, analytics,
    fetchTrades, fetchAnalytics,
    addTrade, updateTrade, deleteTrade,
    shareTrade, unshareTrade,
    importTrades, exportTrades,
    restoreTrade, restoreAllTrades
  }), [
    trades, loading, total, analytics,
    fetchTrades, fetchAnalytics
  ]);

  return (
    <TradeContext.Provider value={value}>
      {children}
    </TradeContext.Provider>
  );
};
