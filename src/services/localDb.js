// Client-side Database Mock for Offline/Serverless fallbacks
// Stores text records in LocalStorage and uploaded chart images in IndexedDB (bypassing 5MB limit).

const DB_PREFIX = 'trading_journal_local_';

// ─── Helper: File to Base64 ─────────────────────────
const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => resolve(reader.result);
  reader.onerror = (err) => reject(err);
});

// ─── IndexedDB Setup for Images ─────────────────────
const dbPromise = new Promise((resolve, reject) => {
  if (typeof window === 'undefined') return resolve(null);
  const request = indexedDB.open('trading_journal_local_images', 1);
  request.onupgradeneeded = (e) => {
    const db = e.target.result;
    if (!db.objectStoreNames.contains('images')) {
      db.createObjectStore('images');
    }
  };
  request.onsuccess = (e) => resolve(e.target.result);
  request.onerror = (e) => reject(e.target.error);
});

const saveLocalImage = async (key, file) => {
  try {
    const db = await dbPromise;
    if (!db) return '';
    const base64 = await fileToBase64(file);
    return new Promise((resolve, reject) => {
      const tx = db.transaction('images', 'readwrite');
      const store = tx.objectStore('images');
      store.put(base64, key.toString());
      tx.oncomplete = () => resolve(base64);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Failed to save image in IndexedDB:', err);
    return '';
  }
};

const getLocalImage = async (key) => {
  try {
    const db = await dbPromise;
    if (!db) return null;
    return new Promise((resolve, reject) => {
      const tx = db.transaction('images', 'readonly');
      const store = tx.objectStore('images');
      const req = store.get(key.toString());
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Failed to retrieve image from IndexedDB:', err);
    return null;
  }
};

const deleteLocalImage = async (key) => {
  try {
    const db = await dbPromise;
    if (!db) return;
    return new Promise((resolve, reject) => {
      const tx = db.transaction('images', 'readwrite');
      const store = tx.objectStore('images');
      const req = store.delete(key.toString());
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Failed to delete image from IndexedDB:', err);
  }
};

// ─── LocalStorage Get/Set Utilities ─────────────────
const getStorageItem = (key, fallback = []) => {
  try {
    const val = localStorage.getItem(DB_PREFIX + key);
    return val ? JSON.parse(val) : fallback;
  } catch {
    return fallback;
  }
};

const setStorageItem = (key, val) => {
  try {
    localStorage.setItem(DB_PREFIX + key, JSON.stringify(val));
  } catch (err) {
    console.error(`Failed to save key ${key} to LocalStorage:`, err);
  }
};

const addLocalSessionTags = (tagsArr, entryTimeStr) => {
  return tagsArr || [];
};

// ─── Local Handler Functions ─────────────────────────

// 1. Auth Handlers
const getActiveUser = () => {
  const session = getStorageItem('active_session', null);
  if (!session) throw { status: 401, message: 'Unauthorized' };
  return session;
};

const handleAuth = async (url, method, body) => {
  const users = getStorageItem('users', []);
  
  if (url === '/auth/me' && method === 'GET') {
    return getActiveUser();
  }
  
  if (url === '/auth/register' && method === 'POST') {
    const { email, password, displayName } = body;
    if (!email || !password) throw { status: 400, message: 'Email and password are required' };
    
    const exists = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (exists) throw { status: 409, message: 'Email already registered' };
    
    const newUser = {
      id: Date.now(),
      email: email.toLowerCase(),
      displayName: displayName || 'Trader',
      accountSize: 10000,
      currency: 'USD',
      riskPercent: 1.0,
      password // stored locally in plaintext for mock auth simplicity
    };
    
    setStorageItem('users', [...users, newUser]);
    setStorageItem('active_session', newUser);
    return { user: newUser, token: 'local-session-token' };
  }
  
  if (url === '/auth/login' && method === 'POST') {
    const { email, password } = body;
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (!user) throw { status: 401, message: 'Invalid email or password' };
    
    setStorageItem('active_session', user);
    return { user, token: 'local-session-token' };
  }
  
  if (url === '/auth/profile' && method === 'PUT') {
    const activeUser = getActiveUser();
    const { displayName, accountSize, currency, riskPercent } = body;
    
    const updated = {
      ...activeUser,
      displayName: displayName !== undefined ? displayName : activeUser.displayName,
      accountSize: accountSize !== undefined ? parseFloat(accountSize) : activeUser.accountSize,
      currency: currency !== undefined ? currency : activeUser.currency,
      riskPercent: riskPercent !== undefined ? parseFloat(riskPercent) : activeUser.riskPercent
    };
    
    // Update in user list
    const updatedUsers = users.map(u => u.id === activeUser.id ? { ...u, ...updated } : u);
    setStorageItem('users', updatedUsers);
    setStorageItem('active_session', updated);
    return updated;
  }
  
  if (url === '/auth/logout' && method === 'POST') {
    localStorage.removeItem(DB_PREFIX + 'active_session');
    return { message: 'Logged out' };
  }

  if (url === '/auth/forgot-password' && method === 'POST') {
    const { email } = body;
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) throw { status: 404, message: 'Email not found' };
    return { message: 'Reset code generated: 123456. (Local Browser Mode - Enter this code directly)' };
  }

  if (url === '/auth/reset-password' && method === 'POST') {
    const { email, code, newPassword } = body;
    if (code !== '123456') throw { status: 400, message: 'Invalid reset code' };
    const userIndex = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
    if (userIndex === -1) throw { status: 404, message: 'Email not found' };
    
    users[userIndex].password = newPassword;
    setStorageItem('users', users);
    return { message: 'Password reset successful' };
  }

  if (url === '/auth/share-dashboard' && method === 'POST') {
    const activeUser = getActiveUser();
    activeUser.shareToken = 'showcase-token-' + activeUser.id;
    const updatedUsers = users.map(u => u.id === activeUser.id ? { ...u, shareToken: activeUser.shareToken } : u);
    setStorageItem('users', updatedUsers);
    setStorageItem('active_session', activeUser);
    return { success: true, token: activeUser.shareToken };
  }
  
  if (url === '/auth/share-dashboard' && method === 'DELETE') {
    const activeUser = getActiveUser();
    activeUser.shareToken = null;
    const updatedUsers = users.map(u => u.id === activeUser.id ? { ...u, shareToken: null } : u);
    setStorageItem('users', updatedUsers);
    setStorageItem('active_session', activeUser);
    return { success: true };
  }
  
  throw { status: 404, message: 'Not Found' };
};

// 2. Trades Handlers
const handleTrades = async (url, method, body, queryParams = {}) => {
  const activeUser = getActiveUser();
  let trades = getStorageItem(`trades_${activeUser.id}`, []);
  
  if (url === '' && method === 'GET') {
    // List trades with search, filter, sorting, pagination
    const { search, type, setup, sort, order, page, limit } = queryParams;
    let filtered = [...trades];
    
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(t => 
        (t.symbol || '').toLowerCase().includes(q) ||
        (t.notes || '').toLowerCase().includes(q) ||
        (t.setup || '').toLowerCase().includes(q)
      );
    }
    
    if (type && type !== 'All') {
      if (type === 'Win') filtered = filtered.filter(t => t.pnl > 0);
      else if (type === 'Loss') filtered = filtered.filter(t => t.pnl < 0);
      else filtered = filtered.filter(t => t.type === type);
    }
    
    if (setup && setup !== 'All') {
      filtered = filtered.filter(t => t.setup === setup);
    }
    
    const sortField = sort || 'entryTime';
    const sortOrder = order === 'asc' ? 1 : -1;
    filtered.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (sortField === 'entryTime' || sortField === 'createdAt') {
        valA = new Date(valA || 0).getTime();
        valB = new Date(valB || 0).getTime();
      } else if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = (valB || '').toLowerCase();
      }
      if (valA < valB) return -1 * sortOrder;
      if (valA > valB) return 1 * sortOrder;
      return 0;
    });
    
    const pageNum = parseInt(page) || 1;
    const pageSize = parseInt(limit) || 50;
    const paginated = filtered.slice((pageNum - 1) * pageSize, pageNum * pageSize);
    
    // Inject image urls from IndexedDB
    const tradesWithImages = await Promise.all(paginated.map(async t => {
      if (t.imageKeys && t.imageKeys.length > 0) {
        const urls = await Promise.all(t.imageKeys.map(key => getLocalImage(key)));
        const validUrls = urls.filter(Boolean);
        return {
          ...t,
          imageUrl: validUrls[0] || null,
          imageUrls: validUrls
        };
      }
      const imageBase64 = await getLocalImage(t.id);
      return {
        ...t,
        imageUrl: imageBase64 || null,
        imageUrls: imageBase64 ? [imageBase64] : []
      };
    }));
    
    return { trades: tradesWithImages, total: filtered.length, page: pageNum, pageSize };
  }
  
  if (url === '' && method === 'POST') {
    // Create trade
    let data = {};
    let chartFiles = [];
    
    if (body instanceof FormData) {
      for (const [k, v] of body.entries()) {
        if (k === 'chart') {
          chartFiles.push(v);
        } else if (k === 'tags' || k === 'emotionTags') {
          try { data[k] = JSON.parse(v); } catch { data[k] = []; }
        } else {
          data[k] = v;
        }
      }
    } else {
      data = body;
    }
    
    const newId = Date.now();
    let imageUrl = null;
    let imageUrls = [];
    let imageKeys = [];
    
    if (chartFiles.length > 0) {
      imageUrls = await Promise.all(chartFiles.map(async (file, idx) => {
        if (file && file instanceof File) {
          const key = `${newId}_${idx}`;
          const base64 = await saveLocalImage(key, file);
          if (base64) {
            imageKeys.push(key);
            return base64;
          }
        }
        return '';
      }));
      imageUrls = imageUrls.filter(Boolean);
      imageUrl = imageUrls[0] || null;
    }
    
    const actualEntryTime = data.entryTime || new Date().toISOString();
    let tagsList = Array.isArray(data.tags) ? data.tags : [];
    tagsList = addLocalSessionTags(tagsList, actualEntryTime);

    const newTrade = {
      id: newId,
      accountId: data.accountId ? parseInt(data.accountId) : 1,
      symbol: (data.symbol || '').toUpperCase(),
      type: data.type || 'Long',
      entryPrice: parseFloat(data.entryPrice) || 0,
      exitPrice: parseFloat(data.exitPrice) || 0,
      lotSize: parseFloat(data.lotSize) || 0,
      stopLoss: parseFloat(data.stopLoss) || 0,
      takeProfit: parseFloat(data.takeProfit) || 0,
      pnl: parseFloat(data.pnl) || 0,
      entryTime: actualEntryTime,
      exitTime: data.exitTime || null,
      setup: data.setup || '',
      grade: data.grade || 'B',
      notes: data.notes || '',
      tags: tagsList,
      emotionTags: Array.isArray(data.emotionTags) ? data.emotionTags : [],
      fomoLevel: parseInt(data.fomoLevel) || 5,
      confidenceLevel: parseInt(data.confidenceLevel) || 5,
      createdAt: new Date().toISOString(),
      imageKeys,
      imageUrl,
      imageUrls
    };
    
    setStorageItem(`trades_${activeUser.id}`, [newTrade, ...trades]);
    return newTrade;
  }
  
  if (url.startsWith('/') && method === 'PUT') {
    const id = parseInt(url.slice(1));
    const tradeIndex = trades.findIndex(t => t.id === id);
    if (tradeIndex === -1) throw { status: 404, message: 'Trade not found' };
    
    let data = {};
    let chartFiles = [];
    let existingImages = null;
    
    if (body instanceof FormData) {
      for (const [k, v] of body.entries()) {
        if (k === 'chart') {
          chartFiles.push(v);
        } else if (k === 'existingImages') {
          try { existingImages = JSON.parse(v); } catch { existingImages = null; }
        } else if (k === 'tags' || k === 'emotionTags') {
          try { data[k] = JSON.parse(v); } catch { data[k] = []; }
        } else {
          data[k] = v;
        }
      }
    } else {
      data = body;
      existingImages = body.existingImages;
    }
    
    const oldTrade = trades[tradeIndex];
    let imageKeys = [];
    let imageUrls = [];
    let imageUrl = null;
    
    if (existingImages) {
      if (oldTrade.imageKeys && oldTrade.imageUrls) {
        existingImages.forEach(urlStr => {
          const idx = oldTrade.imageUrls.indexOf(urlStr);
          if (idx >= 0 && oldTrade.imageKeys[idx]) {
            imageKeys.push(oldTrade.imageKeys[idx]);
            imageUrls.push(urlStr);
          } else {
            imageUrls.push(urlStr);
          }
        });
      } else {
        if (oldTrade.imageUrl && existingImages.includes(oldTrade.imageUrl)) {
          imageUrls.push(oldTrade.imageUrl);
        }
      }
    } else if (chartFiles.length === 0) {
      imageKeys = oldTrade.imageKeys || [];
      imageUrl = oldTrade.imageUrl || null;
      imageUrls = oldTrade.imageUrls || (oldTrade.imageUrl ? [oldTrade.imageUrl] : []);
    }
    
    if (chartFiles.length > 0) {
      const startIndex = imageKeys.length;
      const newUrls = await Promise.all(chartFiles.map(async (file, idx) => {
        if (file && file instanceof File) {
          const key = `${id}_${startIndex + idx}_${Date.now()}`;
          const base64 = await saveLocalImage(key, file);
          if (base64) {
            imageKeys.push(key);
            return base64;
          }
        }
        return '';
      }));
      imageUrls = [...imageUrls, ...newUrls.filter(Boolean)];
      imageUrl = imageUrls[0] || null;
    } else {
      imageUrl = imageUrls[0] || null;
    }
    
    const oldEntryTime = oldTrade.entryTime;
    const newEntryTime = data.entryTime !== undefined ? data.entryTime : oldEntryTime;
    let tagsList = data.tags !== undefined ? data.tags : oldTrade.tags;
    
    if (data.tags !== undefined) {
      tagsList = addLocalSessionTags(tagsList, newEntryTime);
    } else if (newEntryTime !== oldEntryTime) {
      tagsList = addLocalSessionTags(tagsList || [], newEntryTime);
    }
    
    const updated = {
      ...oldTrade,
      accountId: data.accountId !== undefined ? (data.accountId ? parseInt(data.accountId) : null) : oldTrade.accountId,
      symbol: data.symbol !== undefined ? data.symbol.toUpperCase() : oldTrade.symbol,
      type: data.type !== undefined ? data.type : oldTrade.type,
      entryPrice: data.entryPrice !== undefined ? parseFloat(data.entryPrice) : oldTrade.entryPrice,
      exitPrice: data.exitPrice !== undefined ? parseFloat(data.exitPrice) : oldTrade.exitPrice,
      lotSize: data.lotSize !== undefined ? parseFloat(data.lotSize) : oldTrade.lotSize,
      stopLoss: data.stopLoss !== undefined ? parseFloat(data.stopLoss) : oldTrade.stopLoss,
      takeProfit: data.takeProfit !== undefined ? parseFloat(data.takeProfit) : oldTrade.takeProfit,
      pnl: data.pnl !== undefined ? parseFloat(data.pnl) : oldTrade.pnl,
      entryTime: newEntryTime,
      exitTime: data.exitTime !== undefined ? data.exitTime : oldTrade.exitTime,
      setup: data.setup !== undefined ? data.setup : oldTrade.setup,
      grade: data.grade !== undefined ? data.grade : oldTrade.grade,
      notes: data.notes !== undefined ? data.notes : oldTrade.notes,
      tags: tagsList,
      emotionTags: data.emotionTags !== undefined ? data.emotionTags : oldTrade.emotionTags,
      fomoLevel: data.fomoLevel !== undefined ? parseInt(data.fomoLevel) : oldTrade.fomoLevel,
      confidenceLevel: data.confidenceLevel !== undefined ? parseInt(data.confidenceLevel) : oldTrade.confidenceLevel,
      imageKeys,
      imageUrl,
      imageUrls
    };
    
    trades[tradeIndex] = updated;
    setStorageItem(`trades_${activeUser.id}`, trades);
    return updated;
  }
  
  if (url.startsWith('/') && method === 'DELETE') {
    const id = parseInt(url.slice(1));
    const targetTrade = trades.find(t => t.id === id);
    if (!targetTrade) throw { status: 404, message: 'Trade not found' };
    
    trades = trades.filter(t => t.id !== id);
    
    if (targetTrade.imageKeys && targetTrade.imageKeys.length > 0) {
      await Promise.all(targetTrade.imageKeys.map(key => deleteLocalImage(key)));
    } else {
      await deleteLocalImage(id);
    }
    
    setStorageItem(`trades_${activeUser.id}`, trades);
    return { message: 'Trade deleted' };
  }

  if (url.endsWith('/share') && method === 'POST') {
    const id = parseInt(url.split('/')[1]);
    const tradeIndex = trades.findIndex(t => t.id === id);
    if (tradeIndex === -1) throw { status: 404, message: 'Trade not found' };
    
    trades[tradeIndex].shareToken = 'trade-token-' + id;
    setStorageItem(`trades_${activeUser.id}`, trades);
    return { success: true, token: trades[tradeIndex].shareToken };
  }
  
  if (url.endsWith('/share') && method === 'DELETE') {
    const id = parseInt(url.split('/')[1]);
    const tradeIndex = trades.findIndex(t => t.id === id);
    if (tradeIndex === -1) throw { status: 404, message: 'Trade not found' };
    
    trades[tradeIndex].shareToken = null;
    setStorageItem(`trades_${activeUser.id}`, trades);
    return { success: true };
  }
  
  if (url === '/import' && method === 'POST') {
    const { trades: tradesArr } = body;
    if (!Array.isArray(tradesArr)) throw { status: 400, message: 'No trades provided' };
    
    const importedTrades = tradesArr.map((t, idx) => ({
      id: Date.now() + idx,
      symbol: (t.symbol || '').toUpperCase(),
      type: t.type || 'Long',
      entryPrice: parseFloat(t.entryPrice) || 0,
      exitPrice: parseFloat(t.exitPrice) || 0,
      lotSize: parseFloat(t.lotSize) || 0,
      stopLoss: parseFloat(t.stopLoss) || 0,
      takeProfit: parseFloat(t.takeProfit) || 0,
      pnl: parseFloat(t.pnl) || 0,
      entryTime: t.entryTime || new Date().toISOString(),
      exitTime: t.exitTime || null,
      setup: t.setup || '',
      grade: t.grade || 'B',
      notes: t.notes || '',
      tags: Array.isArray(t.tags) ? t.tags : [],
      emotionTags: Array.isArray(t.emotionTags) ? t.emotionTags : [],
      fomoLevel: parseInt(t.fomoLevel) || 5,
      confidenceLevel: parseInt(t.confidenceLevel) || 5,
      createdAt: new Date().toISOString(),
      imageUrl: null
    }));
    
    setStorageItem(`trades_${activeUser.id}`, [...importedTrades, ...trades]);
    return { imported: importedTrades.length, message: `${importedTrades.length} trades imported` };
  }
  
  if (url === '/export' && method === 'GET') {
    return trades;
  }
  
  if (url === '/analytics' && method === 'GET') {
    if (!trades.length) return { empty: true };
    
    // Sort trades chronologically for curve calculations
    const chronoTrades = [...trades].sort((a, b) => new Date(a.entryTime).getTime() - new Date(b.entryTime).getTime());
    
    const totalPnL = trades.reduce((a, t) => a + t.pnl, 0);
    const wins = trades.filter(t => t.pnl > 0);
    const losses = trades.filter(t => t.pnl < 0);
    const winRate = (wins.length / trades.length * 100).toFixed(1);
    const totalWin = wins.reduce((a, t) => a + t.pnl, 0);
    const totalLoss = Math.abs(losses.reduce((a, t) => a + t.pnl, 0));
    const profitFactor = totalLoss > 0 ? (totalWin / totalLoss).toFixed(2) : wins.length > 0 ? 'Infinity' : '0.00';
    const avgWin = wins.length > 0 ? (totalWin / wins.length).toFixed(2) : '0.00';
    const avgLoss = losses.length > 0 ? (totalLoss / losses.length).toFixed(2) : '0.00';
    
    // Equity Curve
    let running = 0;
    const equityCurve = chronoTrades.map(t => {
      running += t.pnl;
      return { date: t.entryTime, equity: parseFloat(running.toFixed(2)) };
    });
    
    // Max drawdown
    let peak = 0, maxDrawdown = 0;
    running = 0;
    chronoTrades.forEach(t => {
      running += t.pnl;
      if (running > peak) peak = running;
      const dd = peak - running;
      if (dd > maxDrawdown) maxDrawdown = dd;
    });
    
    // By Symbol
    const symbolMap = {};
    trades.forEach(t => {
      const sym = t.symbol.toUpperCase();
      if (!symbolMap[sym]) symbolMap[sym] = { pnl: 0, count: 0, wins: 0 };
      symbolMap[sym].pnl += t.pnl;
      symbolMap[sym].count++;
      if (t.pnl > 0) symbolMap[sym].wins++;
    });
    
    // By Setup
    const setupMap = {};
    trades.forEach(t => {
      const s = t.setup || 'Untagged';
      if (!setupMap[s]) setupMap[s] = { pnl: 0, count: 0, wins: 0 };
      setupMap[s].pnl += t.pnl;
      setupMap[s].count++;
      if (t.pnl > 0) setupMap[s].wins++;
    });
    
    // Day of Week
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dowMap = {};
    trades.forEach(t => {
      const d = dayNames[new Date(t.entryTime).getDay()];
      if (!dowMap[d]) dowMap[d] = { pnl: 0, count: 0 };
      dowMap[d].pnl += t.pnl;
      dowMap[d].count++;
    });
    
    // Hourly
    const hourMap = {};
    trades.forEach(t => {
      const h = new Date(t.entryTime).getHours();
      if (!hourMap[h]) hourMap[h] = { pnl: 0, count: 0 };
      hourMap[h].pnl += t.pnl;
      hourMap[h].count++;
    });
    
    // Monthly
    const monthMap = {};
    trades.forEach(t => {
      const d = new Date(t.entryTime);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthMap[key]) monthMap[key] = 0;
      monthMap[key] += t.pnl;
    });
    
    // Daily
    const dailyMap = {};
    trades.forEach(t => {
      const d = t.entryTime ? t.entryTime.split('T')[0] : null;
      if (d) {
        if (!dailyMap[d]) dailyMap[d] = { pnl: 0, count: 0, wins: 0, losses: 0 };
        dailyMap[d].pnl += t.pnl;
        dailyMap[d].count++;
        if (t.pnl > 0) dailyMap[d].wins++;
        else if (t.pnl < 0) dailyMap[d].losses++;
      }
    });
    
    // Streaks
    let currentStreak = 0, maxWinStreak = 0, maxLossStreak = 0;
    let streakType = null;
    chronoTrades.forEach(t => {
      const isWin = t.pnl > 0;
      if (streakType === null) {
        streakType = isWin;
        currentStreak = 1;
      } else if (isWin === streakType) {
        currentStreak++;
      } else {
        streakType = isWin;
        currentStreak = 1;
      }
      if (isWin && currentStreak > maxWinStreak) maxWinStreak = currentStreak;
      if (!isWin && currentStreak > maxLossStreak) maxLossStreak = currentStreak;
    });
    
    const bestTrade = trades.reduce((best, t) => t.pnl > best.pnl ? t : best, trades[0]);
    const worstTrade = trades.reduce((worst, t) => t.pnl < worst.pnl ? t : worst, trades[0]);
    
    return {
      summary: {
        totalTrades: trades.length,
        totalPnL: parseFloat(totalPnL.toFixed(2)),
        winRate: parseFloat(winRate),
        profitFactor: parseFloat(profitFactor) || 0,
        avgWin: parseFloat(avgWin),
        avgLoss: parseFloat(avgLoss),
        maxDrawdown: parseFloat(maxDrawdown.toFixed(2)),
        wins: wins.length,
        losses: losses.length,
        maxWinStreak,
        maxLossStreak,
        bestTrade,
        worstTrade,
      },
      equityCurve,
      bySymbol: Object.entries(symbolMap).map(([sym, v]) => ({
        symbol: sym, pnl: parseFloat(v.pnl.toFixed(2)), count: v.count,
        winRate: parseFloat((v.wins / v.count * 100).toFixed(1))
      })).sort((a, b) => b.pnl - a.pnl),
      bySetup: Object.entries(setupMap).map(([s, v]) => ({
        setup: s, pnl: parseFloat(v.pnl.toFixed(2)), count: v.count,
        winRate: parseFloat((v.wins / v.count * 100).toFixed(1))
      })).sort((a, b) => b.pnl - a.pnl),
      byDow: dayNames.map(d => ({
        day: d, pnl: parseFloat((dowMap[d]?.pnl || 0).toFixed(2)), count: dowMap[d]?.count || 0
      })),
      byHour: Object.entries(hourMap).map(([h, v]) => ({
        hour: parseInt(h), pnl: parseFloat(v.pnl.toFixed(2)), count: v.count
      })).sort((a, b) => a.hour - b.hour),
      monthly: Object.entries(monthMap).map(([m, p]) => ({
        month: m, pnl: parseFloat(p.toFixed(2))
      })).sort((a, b) => a.month.localeCompare(b.month)),
      daily: dailyMap,
    };
  }
  
  throw { status: 404, message: 'Not Found' };
};

// 3. Journal Handlers
const handleJournal = async (url, method, body, queryParams = {}) => {
  const activeUser = getActiveUser();
  let entries = getStorageItem(`journals_${activeUser.id}`, []);
  
  if (url === '' && method === 'GET') {
    const { month, year } = queryParams;
    if (month && year) {
      const targetMonth = String(month).padStart(2, '0');
      const prefix = `${year}-${targetMonth}`;
      return entries.filter(e => e.date.startsWith(prefix)).sort((a, b) => b.date.localeCompare(a.date));
    }
    return entries.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 50);
  }
  
  if (url.startsWith('/') && method === 'GET') {
    const date = url.slice(1);
    const entry = entries.find(e => e.date === date);
    return entry || null;
  }
  
  if (url === '' && method === 'POST') {
    const { date, pre_market, session_notes, lessons, mistakes, goals, mood, rating } = body;
    if (!date) throw { status: 400, message: 'Date is required' };
    
    const existingIndex = entries.findIndex(e => e.date === date);
    const newEntry = {
      id: existingIndex >= 0 ? entries[existingIndex].id : Date.now(),
      user_id: activeUser.id,
      date,
      pre_market: pre_market || '',
      session_notes: session_notes || '',
      lessons: lessons || '',
      mistakes: mistakes || '',
      goals: goals || '',
      mood: mood || 'neutral',
      rating: parseInt(rating) || 5,
      created_at: existingIndex >= 0 ? entries[existingIndex].created_at : new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    if (existingIndex >= 0) {
      entries[existingIndex] = newEntry;
    } else {
      entries = [newEntry, ...entries];
    }
    
    setStorageItem(`journals_${activeUser.id}`, entries);
    return newEntry;
  }
  
  if (url.startsWith('/') && method === 'DELETE') {
    const id = parseInt(url.slice(1));
    const beforeLength = entries.length;
    entries = entries.filter(e => e.id !== id);
    if (entries.length === beforeLength) throw { status: 404, message: 'Entry not found' };
    
    setStorageItem(`journals_${activeUser.id}`, entries);
    return { message: 'Entry deleted' };
  }
  
  throw { status: 404, message: 'Not Found' };
};

// 4. AI Coach Handler
const handleAi = async (url, method, body) => {
  if (url === '/chat' && method === 'POST') {
    const { messages } = body;
    const userMsg = messages[messages.length - 1]?.content?.toLowerCase() || '';
    
    let aiText = '';
    
    if (userMsg.includes('loss') || userMsg.includes('lose') || userMsg.includes('drawdown')) {
      aiText = "🔴 **Coaching Advice on Loss & Drawdowns:**\n\nHandling losses is where professional traders separate themselves from amateurs. Sticking to a disciplined drawdown limit protects your psychological capital as well as your money.\n\n1. **Stop Trading Immediately** if you hit your daily loss limit.\n2. **Verify Setup Rules**: Was it a valid setup or an emotional entry?\n3. **Tighten Risk**: In high-drawdown phases, reduce position sizes by 50% until confidence returns.";
    } else if (userMsg.includes('fomo') || userMsg.includes('chase') || userMsg.includes('miss')) {
      aiText = "🟡 **Coaching Advice on FOMO:**\n\nChasing entries out of fear of missing out is a common cognitive leak. \n\n1. **Acknowledge & Release**: Remind yourself that there will *always* be another trade.\n2. **Use Limit Orders**: Avoid market orders when catching momentum. Let price pull back to your key levels.\n3. **Log it**: Grade FOMO high in your journal entries so you see the direct cost in your behavioral analytics curves.";
    } else if (userMsg.includes('risk') || userMsg.includes('size') || userMsg.includes('stop')) {
      aiText = "🔵 **Coaching Advice on Risk Management:**\n\nRisk management is the ultimate edge in trading. \n\n1. **Risk Per Trade**: Never risk more than 1% of your account size on a single setup.\n2. **R:R Ratio**: Maintain at least a 1:1.5 or 1:2 Risk-to-Reward profile so you can be profitable even with a 45% win rate.\n3. **Position Sizing**: Calculate size dynamically: `Account Size × Risk% ÷ Distance to Stop Loss`.";
    } else {
      aiText = "📈 **Offline Coach Simulator Mode:**\n\nHello! I am simulating your AI Coach offline. Here are some quick behavioral tips:\n\n* **Keep journaling:** Write daily pre-market preparation notes and lessons.\n* **Behavioral Audits:** Review your FOMO cost levels regularly in the leaks dashboard.\n* **Back up your data:** Always export a JSON package under Settings to keep your journal safe.\n\n*To unlock the fully powered LLM Coach, make sure the local Node/Express backend server is running in your terminal.*";
    }
    
    return {
      message: {
        role: 'assistant',
        content: aiText
      }
    };
  }
  throw { status: 404, message: 'Not Found' };
};

// 5. Backup Export/Import Handlers
const handleBackup = async (url, method, body) => {
  const activeUser = getActiveUser();
  const trades = getStorageItem(`trades_${activeUser.id}`, []);
  const journalEntries = getStorageItem(`journals_${activeUser.id}`, []);
  
  if (url === '/export' && method === 'GET') {
    return {
      version: "2.0.0",
      exportedAt: new Date().toISOString(),
      user: {
        displayName: activeUser.displayName,
        accountSize: activeUser.accountSize,
        currency: activeUser.currency,
        riskPercent: activeUser.riskPercent
      },
      trades,
      journalEntries
    };
  }
  
  if (url === '/import' && method === 'POST') {
    const { trades: tradesArr, journalEntries: journalsArr, user, mode } = body;
    if (!Array.isArray(tradesArr) || !Array.isArray(journalsArr)) {
      throw { status: 400, message: 'Invalid backup format' };
    }
    
    const importMode = mode || 'merge';
    
    // Update User Profile
    if (user) {
      const updatedUser = {
        ...activeUser,
        displayName: user.displayName !== undefined ? user.displayName : activeUser.displayName,
        accountSize: user.accountSize !== undefined ? parseFloat(user.accountSize) : activeUser.accountSize,
        currency: user.currency !== undefined ? user.currency : activeUser.currency,
        riskPercent: user.riskPercent !== undefined ? parseFloat(user.riskPercent) : activeUser.riskPercent
      };
      
      const users = getStorageItem('users', []);
      const updatedUsers = users.map(u => u.id === activeUser.id ? { ...u, ...updatedUser } : u);
      setStorageItem('users', updatedUsers);
      setStorageItem('active_session', updatedUser);
    }
    
    let tradesImported = 0;
    let journalsImported = 0;
    
    let newTrades = importMode === 'overwrite' ? [] : [...trades];
    let newJournals = importMode === 'overwrite' ? [] : [...journalEntries];
    
    // Import Trades
    for (const t of tradesArr) {
      const dup = newTrades.find(nt => nt.entryTime === t.entryTime && nt.symbol.toUpperCase() === (t.symbol || '').toUpperCase());
      if (importMode === 'merge' && dup) continue;
      
      newTrades.push({
        id: t.id || Date.now() + Math.random(),
        symbol: (t.symbol || '').toUpperCase(),
        type: t.type || 'Long',
        entryPrice: parseFloat(t.entryPrice) || 0,
        exitPrice: parseFloat(t.exitPrice) || 0,
        lotSize: parseFloat(t.lotSize) || 0,
        stopLoss: parseFloat(t.stopLoss) || 0,
        takeProfit: parseFloat(t.takeProfit) || 0,
        pnl: parseFloat(t.pnl) || 0,
        entryTime: t.entryTime || new Date().toISOString(),
        exitTime: t.exitTime || null,
        setup: t.setup || '',
        grade: t.grade || 'B',
        notes: t.notes || '',
        tags: Array.isArray(t.tags) ? t.tags : [],
        emotionTags: Array.isArray(t.emotionTags) ? t.emotionTags : [],
        fomoLevel: parseInt(t.fomoLevel) || 5,
        confidenceLevel: parseInt(t.confidenceLevel) || 5,
        createdAt: t.createdAt || new Date().toISOString(),
        imageUrl: t.imageUrl || null
      });
      tradesImported++;
    }
    
    // Import Journals
    for (const j of journalsArr) {
      const idx = newJournals.findIndex(nj => nj.date === j.date);
      const entryObj = {
        id: j.id || Date.now() + Math.random(),
        user_id: activeUser.id,
        date: j.date,
        pre_market: j.preMarket || j.pre_market || '',
        session_notes: j.sessionNotes || j.session_notes || '',
        lessons: j.lessons || '',
        mistakes: j.mistakes || '',
        goals: j.goals || '',
        mood: j.mood || 'neutral',
        rating: parseInt(j.rating) || 5,
        created_at: j.createdAt || j.created_at || new Date().toISOString(),
        updated_at: j.updatedAt || j.updated_at || new Date().toISOString()
      };
      
      if (idx >= 0) {
        if (importMode === 'merge') {
          newJournals[idx] = entryObj;
        }
      } else {
        newJournals.push(entryObj);
      }
      journalsImported++;
    }
    
    setStorageItem(`trades_${activeUser.id}`, newTrades);
    setStorageItem(`journals_${activeUser.id}`, newJournals);
    
    return {
      tradesImported,
      journalsImported,
      message: `Restore completed in ${importMode} mode.`
    };
  }
  
  throw { status: 404, message: 'Not Found' };
};

// 6. Accounts Handler
const handleAccounts = async (url, method, body) => {
  const activeUser = getActiveUser();
  let accountsList = getStorageItem(`accounts_${activeUser.id}`, null);
  
  if (accountsList === null || (Array.isArray(accountsList) && accountsList.length === 0)) {
    accountsList = [{
      id: 1,
      accountName: 'Default Account',
      accountType: 'Live',
      startingBalance: activeUser.accountSize || 10000,
      currentBalance: activeUser.accountSize || 10000,
      totalPnL: 0,
      tradesCount: 0,
      currency: activeUser.currency || 'USD',
      status: 'Active',
      createdAt: new Date().toISOString()
    }];
    setStorageItem(`accounts_${activeUser.id}`, accountsList);
  }

  if (url === '' && method === 'GET') {
    const trades = getStorageItem(`trades_${activeUser.id}`, []);
    
    const accountsWithStats = accountsList.map(acc => {
      const accTrades = trades.filter(t => (t.accountId === acc.id || (!t.accountId && acc.id === 1)));
      const totalPnL = accTrades.reduce((pnlAcc, t) => pnlAcc + (t.pnl || 0), 0);
      const tradesCount = accTrades.length;
      const currentBalance = (acc.startingBalance || 0) + totalPnL;

      return {
        ...acc,
        currentBalance,
        totalPnL,
        tradesCount
      };
    });
    return accountsWithStats;
  }

  if (url === '' && method === 'POST') {
    const { accountName, accountType, balance, currency, status } = body;
    if (!accountName) throw { status: 400, message: 'Account Name is required' };

    const newAccount = {
      id: Date.now(),
      accountName,
      accountType: accountType || 'Simulated',
      startingBalance: parseFloat(balance) || 0,
      currentBalance: parseFloat(balance) || 0,
      totalPnL: 0,
      tradesCount: 0,
      currency: currency || 'USD',
      status: status || 'Active',
      createdAt: new Date().toISOString()
    };
    
    accountsList = [newAccount, ...accountsList];
    setStorageItem(`accounts_${activeUser.id}`, accountsList);
    return newAccount;
  }

  if (url.startsWith('/') && method === 'DELETE') {
    const id = parseInt(url.slice(1));
    const beforeLength = accountsList.length;
    accountsList = accountsList.filter(acc => acc.id !== id);
    if (accountsList.length === beforeLength) throw { status: 404, message: 'Account not found' };

    setStorageItem(`accounts_${activeUser.id}`, accountsList);
    return { success: true, message: 'Account deleted successfully' };
  }

  throw { status: 404, message: 'Not Found' };
};

// 7. Achievements Handler
const handleAchievements = async (url, method, body) => {
  const activeUser = getActiveUser();
  let achievements = getStorageItem(`achievements_${activeUser.id}`, []);

  if (url === '' && method === 'GET') {
    return achievements;
  }

  if (url === '' && method === 'POST') {
    let data = {};
    let certFile = null;
    
    if (body instanceof FormData) {
      for (const [k, v] of body.entries()) {
        if (k === 'certificate') certFile = v;
        else data[k] = v;
      }
    } else {
      data = body;
    }

    const newId = Date.now();
    let certificateUrl = null;
    if (certFile && certFile instanceof File) {
      certificateUrl = await saveLocalImage(newId, certFile);
    }

    const newAchievement = {
      id: newId,
      title: data.title || 'Untitled Achievement',
      type: data.type || 'passed',
      accountName: data.accountName || '',
      amount: parseFloat(data.amount) || 0,
      date: data.date || new Date().toISOString().split('T')[0],
      notes: data.notes || '',
      certificateUrl,
      createdAt: new Date().toISOString()
    };

    achievements = [newAchievement, ...achievements];
    setStorageItem(`achievements_${activeUser.id}`, achievements);
    return newAchievement;
  }

  if (url.startsWith('/') && method === 'DELETE') {
    const id = parseInt(url.slice(1));
    const beforeLength = achievements.length;
    achievements = achievements.filter(a => a.id !== id);
    if (achievements.length === beforeLength) throw { status: 404, message: 'Achievement not found' };

    await deleteLocalImage(id);
    setStorageItem(`achievements_${activeUser.id}`, achievements);
    return { success: true, message: 'Achievement deleted' };
  }

  throw { status: 404, message: 'Not Found' };
};

// 8. Notion Handler
const handleNotion = async (url, method, body) => {
  const activeUser = getActiveUser();
  let docs = getStorageItem(`notion_${activeUser.id}`, []);

  const targetUrl = 'https://mysterious-spandex-41e.notion.site/For-Traders-6K-Funded-Account-362f3f11ad2080e4bf90f578aac0867d?source=copy_link';
  const hasTarget = docs.some(d => d.external_url === targetUrl);
  if (!hasTarget) {
    const seedDoc = {
      id: 1718712345678,
      user_id: activeUser.id,
      title: 'For Traders 6K Funded Account',
      content: '# For Traders 6K Funded Account\n\nThis is a sandbox workspace page loaded via our Notion proxy server.',
      icon: '📈',
      tags: ['Playbook', 'Funded'],
      external_url: targetUrl,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    docs = [seedDoc, ...docs];
    setStorageItem(`notion_${activeUser.id}`, docs);
  }

  if (url === '' && method === 'GET') {
    return docs;
  }

  if (url.startsWith('/') && method === 'GET') {
    const id = parseInt(url.slice(1));
    const doc = docs.find(d => d.id === id);
    if (!doc) throw { status: 404, message: 'Document not found' };
    return doc;
  }

  if (url === '' && method === 'POST') {
    const { title, content, icon, tags, external_url } = body;
    const newDoc = {
      id: Date.now(),
      user_id: activeUser.id,
      title: title || 'Untitled Document',
      content: content || '',
      icon: icon || '📄',
      tags: Array.isArray(tags) ? tags : [],
      external_url: external_url || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    docs = [newDoc, ...docs];
    setStorageItem(`notion_${activeUser.id}`, docs);
    return newDoc;
  }

  if (url.startsWith('/') && method === 'PUT') {
    const id = parseInt(url.slice(1));
    const idx = docs.findIndex(d => d.id === id);
    if (idx === -1) throw { status: 404, message: 'Document not found' };

    const { title, content, icon, tags, external_url } = body;
    const updated = {
      ...docs[idx],
      title: title !== undefined ? title : docs[idx].title,
      content: content !== undefined ? content : docs[idx].content,
      icon: icon !== undefined ? icon : docs[idx].icon,
      tags: tags !== undefined ? tags : docs[idx].tags,
      external_url: external_url !== undefined ? external_url : docs[idx].external_url,
      updated_at: new Date().toISOString()
    };

    docs[idx] = updated;
    setStorageItem(`notion_${activeUser.id}`, docs);
    return updated;
  }

  if (url.startsWith('/') && method === 'DELETE') {
    const id = parseInt(url.slice(1));
    const beforeLength = docs.length;
    docs = docs.filter(d => d.id !== id);
    if (docs.length === beforeLength) throw { status: 404, message: 'Document not found' };

    setStorageItem(`notion_${activeUser.id}`, docs);
    return { success: true, message: 'Document deleted' };
  }

  if (url.includes('/ai') && method === 'POST') {
    const id = parseInt(url.split('/')[1]);
    const doc = docs.find(d => d.id === id);
    if (!doc) throw { status: 404, message: 'Document not found' };

    const { messages, content } = body;
    const documentContent = content !== undefined ? content : doc.content;
    const documentTitle = doc.title;

    const lastMessage = messages?.[messages.length - 1]?.content?.toLowerCase() || '';
    let aiText = '';

    if (lastMessage.includes('summarize') || lastMessage.includes('summary')) {
      aiText = `🤖 **[NVIDIA Llama-3.1-Nemotron-70B - Fallback Document Summary]**\n\nHere is a summary of **"${documentTitle}"**:\n\n* **Core Theme**: Focused on trading setups, psychological audits, or strategy guidelines.\n* **Key Takeaway**: The layout organizes core trading process checks.\n* **Coach Tip**: Maintain strict risk ratios on setups listed in this playbook.`;
    } else if (lastMessage.includes('improve') || lastMessage.includes('rewrite') || lastMessage.includes('polish')) {
      aiText = `🤖 **[NVIDIA Llama-3.1-Nemotron-70B - Fallback Polish]**\n\nHere is a polished version of the document content:\n\n* Polish of: "${documentContent.slice(0, 100)}..."\n* Keep focus on Daily levels, patience, and 1% risk rules.`;
    } else {
      aiText = `🤖 **[NVIDIA Llama-3.1-Nemotron-70B]**\n\nReviewing document **"${documentTitle}"**. Let me know if you would like me to summarize, polish, or generate a checklist.`;
    }

    return {
      role: 'assistant',
      content: aiText
    };
  }

  throw { status: 404, message: 'Not Found' };
};

// 9. Stoic Handler
const handleStoic = async (url, method, body) => {
  const activeUser = getActiveUser();
  let reframes = getStorageItem(`stoic_reframes_${activeUser.id}`, []);

  const maxims = [
    // Marcus Aurelius
    { author: 'Marcus Aurelius', quote: 'You have power over your mind - not outside events. Realize this, and you will find strength.' },
    { author: 'Marcus Aurelius', quote: 'The impediment to action advances action. What stands in the way becomes the way.' },
    { author: 'Marcus Aurelius', quote: 'Waste no more time arguing about what a good man should be. Be one.' },
    { author: 'Marcus Aurelius', quote: 'The happiness of your life depends upon the quality of your thoughts.' },
    { author: 'Marcus Aurelius', quote: 'Everything we hear is an opinion, not a fact. Everything we see is a perspective, not the truth.' },
    { author: 'Marcus Aurelius', quote: 'Accept the things to which fate binds you, and love the people with whom fate brings you together, but do so with all your heart.' },
    { author: 'Marcus Aurelius', quote: 'Very little is needed to make a happy life; it is all within yourself, in your way of thinking.' },
    { author: 'Marcus Aurelius', quote: 'When you arise in the morning think of what a privilege it is to be alive, to think, to enjoy, to love.' },
    { author: 'Marcus Aurelius', quote: 'The best revenge is to be unlike him who performed the injury.' },
    { author: 'Marcus Aurelius', quote: 'Reject your sense of injury and the injury itself disappears.' },
    { author: 'Marcus Aurelius', quote: 'If it is not right do not do it; if it is not true do not say it.' },
    { author: 'Marcus Aurelius', quote: 'Loss is nothing else but change, and change is Nature’s delight.' },

    // Seneca
    { author: 'Seneca', quote: 'We suffer more often in imagination than in reality.' },
    { author: 'Seneca', quote: 'No man is more unhappy than he who never faces adversity, for he is not permitted to prove himself.' },
    { author: 'Seneca', quote: 'Difficulties strengthen the mind, as labor does the body.' },
    { author: 'Seneca', quote: 'If a man knows not to which port he sails, no wind is favorable.' },
    { author: 'Seneca', quote: 'True happiness is to enjoy the present, without anxious dependence upon the future.' },
    { author: 'Seneca', quote: 'Associate with people who are likely to improve you.' },
    { author: 'Seneca', quote: 'He who is brave is free.' },
    { author: 'Seneca', quote: 'Luck is what happens when preparation meets opportunity.' },
    { author: 'Seneca', quote: 'It is the power of the mind to be unconquerable.' },
    { author: 'Seneca', quote: 'He suffers more than is necessary, who suffers before it is necessary.' },
    { author: 'Seneca', quote: 'While we wait for life, life passes.' },
    { author: 'Seneca', quote: 'Most powerful is he who has himself in his own power.' },

    // Epictetus
    { author: 'Epictetus', quote: 'It\'s not what happens to you, but how you react to it that matters.' },
    { author: 'Epictetus', quote: 'Wealth consists not in having great possessions, but in having few wants.' },
    { author: 'Epictetus', quote: 'First say to yourself what you would be; and then do what you have to do.' },
    { author: 'Epictetus', quote: 'Control your passions lest they take vengeance on you.' },
    { author: 'Epictetus', quote: 'No man is free who is not master of himself.' },
    { author: 'Epictetus', quote: 'The key is to keep company only with people who uplift you, whose presence calls forth your best.' },
    { author: 'Epictetus', quote: 'If you want to improve, be content to be thought foolish and stupid.' },
    { author: 'Epictetus', quote: 'Circumstances do not make the man, they only reveal him to himself.' },
    { author: 'Epictetus', quote: 'It is impossible for a man to learn what he thinks he already knows.' },
    { author: 'Epictetus', quote: 'Only the educated are free.' },
    { author: 'Epictetus', quote: 'Make the best use of what is in your power, and take the rest as it happens.' },
    { author: 'Epictetus', quote: 'He is a wise man who does not grieve for the things which he has not, but rejoices for those which he has.' },

    // Zeno & others
    { author: 'Zeno of Citium', quote: 'Man conquers the world by conquering himself.' },
    { author: 'Zeno of Citium', quote: 'Steel your sensibilities, so that life shall hurt you as little as possible.' },
    { author: 'Zeno of Citium', quote: 'Well-being is attained by little and little, and yet is no little thing.' },
    { author: 'Chrysippus', quote: 'The wise man lacks nothing, and yet needs everything; the fool needs nothing, and yet lacks everything.' }
  ];

  const translations = [
    'A loss is a statistical cost of trading. How you manage your psychology after a drawdown determines your long-term consistency.',
    'You cannot control where the market goes. You can only control your risk size, your stop-loss placement, and your session discipline.',
    'Do not panic about potential losses or missed moves that haven\'t occurred. Trade the price action on your screen, not your fearful projections.',
    'Greed kills trading accounts. Focus on executing the process perfectly, and let go of the urge to catch every pip or make quick riches.',
    'Drawdowns are the testing grounds of a professional trader. Facing them with strict rules proves you are a master of your edge.',
    'A failed breakout or stopped-out trade is data. It reveals where liquidity is sitting. Treat losses as lessons to refine your setups.',
    'The market does not care about your financial goals or your revenge feelings. Walk away when your session rules tell you to.',
    'Discipline is doing what needs to be done, regardless of whether you feel like it. Stick to your risk parameters on every single execution.',
    'Do not chase moves in progress. Patience is waiting for the market to come to your pre-determined support/resistance zones.',
    'Every trade is independent of the last. A previous loss has zero bearing on the probability of your next qualified entry.',
    'Accept the outcome of your setups before clicking the order button. If you cannot afford the risk, do not take the trade.',
    'Avoid the urge to over-leverage or double down on losing positions. A single rule violation can wipe out weeks of disciplined work.',
    'Quiet your mind and ignore the hype in social media chat rooms. Trade your own plan and rely on your validated backtests.',
    'Success in trading is not about being right 100% of the time, but about managing risk so that the math works in your favor.',
    'When you feel anger or anxiety rising after a stop-out, take it as an immediate signal to close the trading platform for the day.',
    'Cultivate indifference to individual trade outcomes. Your edge plays out over a sequence of 100 trades, not just one.',
    'Review your trades with absolute honesty. Self-reflection and journaling are the only paths to continuous trading growth.',
    'Stop trading once you reach your daily loss limit. Protecting your capital is more important than recovering today\'s losses.',
    'Focus entirely on high-quality setups. It is better to make zero trades than to force low-probability trades out of boredom.',
    'Treat your trading as a business, not a casino. Keep precise logs, analyze metrics, and manage your risks with absolute professionalism.',
    'Your value as a trader is measured by your rule compliance, not by your daily profit or loss balance.',
    'The best trade you will ever make is the one where you follow your plan, even if it results in a small, disciplined stop-out.',
    'Do not let fear prevent you from executing a valid setup. Hesitation is as dangerous as over-trading; trust your edge.',
    'Let go of the need to predict the future. React rationally to what the market is doing right now at key structural levels.',
    'Patience during flat markets is just as important as speed during breakouts. Protect your cash during chop zones.'
  ];

  const generateQuotes = () => {
    const list = [];
    let id = 1;
    for (let i = 0; i < maxims.length; i++) {
      for (let j = 0; j < translations.length; j++) {
        list.push({
          id,
          author: maxims[i].author,
          quote: maxims[i].quote,
          translation: translations[j]
        });
        id++;
      }
    }
    return list;
  };

  const STOIC_QUOTES = generateQuotes();

  if (url === '/quotes' && method === 'GET') {
    return STOIC_QUOTES;
  }

  if (url === '/reframes' && method === 'GET') {
    return reframes;
  }

  if (url === '/reframes' && method === 'POST') {
    const { situation, in_control, out_of_control, stoic_reframe } = body;
    if (!situation || !in_control || !out_of_control || !stoic_reframe) {
      throw { status: 400, message: 'All fields are required to log a reframe.' };
    }

    const newReframe = {
      id: Date.now(),
      situation,
      in_control,
      out_of_control,
      stoic_reframe,
      created_at: new Date().toISOString()
    };

    reframes = [newReframe, ...reframes];
    setStorageItem(`stoic_reframes_${activeUser.id}`, reframes);
    return newReframe;
  }

  if (url.startsWith('/reframes/') && method === 'DELETE') {
    const id = parseInt(url.slice('/reframes/'.length));
    const beforeLength = reframes.length;
    reframes = reframes.filter(r => r.id !== id);
    if (reframes.length === beforeLength) throw { status: 404, message: 'Reframe not found' };

    setStorageItem(`stoic_reframes_${activeUser.id}`, reframes);
    return { success: true, message: 'Reframe deleted' };
  }

  if (url === '/chat' && method === 'POST') {
    const { messages } = body;
    const lastMsg = messages?.[messages.length - 1]?.content?.toLowerCase() || '';
    let responseText = '';

    if (lastMsg.includes('drawdown') || lastMsg.includes('loss') || lastMsg.includes('lost')) {
      responseText = `🏛️ **[NVIDIA Stoic Mentor - Marcus Aurelius Mode]**\n\n*“The mind adapts and converts to its own purposes the obstacle to our acting.”*\n\nYour losses are statistical premiums. Keep risk small, and do not seek revenge on the market.`;
    } else {
      responseText = `🏛️ **[NVIDIA Stoic Mentor - Epictetus Mode]**\n\nHow can I help you navigate your trading psychology stoically today? Describe what you are experiencing.`;
    }

    return {
      role: 'assistant',
      content: responseText
    };
  }

  if (url === '/analyze-situation' && method === 'POST') {
    const { situation } = body;
    const situationLower = situation.toLowerCase();
    
    let inControl = '- Following pre-market entry rules\n- Your risk management settings (e.g. 1% risk size)\n- Your emotional response to the loss (avoiding revenge trading)\n- Closing the terminal to take a break';
    let outOfControl = '- The exact path the price takes after your entry\n- Institutional news spikes or spread widening\n- Quick slippage near your stop loss\n- The behaviors of other market participants';
    let reframeText = '“Accept the things to which fate binds you...” — Marcus Aurelius. A stop-out is simply data, not a personal insult. Focus on executing your rules.';

    if (situationLower.includes('revenge') || situationLower.includes('overtrade') || situationLower.includes('chase')) {
      inControl = '- Closing the charts and walking away\n- Sticking to a maximum trade-per-session limit\n- Logging your emotional state before clicking buy/sell';
      outOfControl = '- Missing the initial breakout move\n- How fast the price expands without you';
      reframeText = '“No man is hurt but by himself.” — Diogenes. Missing a trade costs nothing but patience. Forcing an entry costs capital.';
    }

    return {
      in_control: inControl,
      out_of_control: outOfControl,
      stoic_reframe: reframeText
    };
  }

  throw { status: 404, message: 'Not Found' };
};

// 10. News Handler
const handleNews = async (url, method, body, queryParams = {}) => {
  const currencies = ['USD', 'EUR', 'GBP', 'AUD', 'JPY', 'CAD', 'CHF', 'NZD'];
  const eventTemplates = [
    { title: 'CPI m/m', impact: 'High', currencies: ['USD', 'EUR', 'GBP', 'AUD'] },
    { title: 'Core CPI y/y', impact: 'High', currencies: ['USD', 'EUR', 'GBP'] },
    { title: 'Unemployment Rate', impact: 'High', currencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'] },
    { title: 'GDP q/q', impact: 'High', currencies: ['USD', 'GBP', 'EUR', 'AUD'] },
    { title: 'Interest Rate Decision', impact: 'High', currencies: ['USD', 'EUR', 'GBP', 'AUD'] }
  ];

  if (url === '' && method === 'GET') {
    const reqYear = queryParams.year ? parseInt(queryParams.year) : new Date().getFullYear();
    const reqMonth = queryParams.month ? parseInt(queryParams.month) : new Date().getMonth();
    const daysInMonth = new Date(reqYear, reqMonth + 1, 0).getDate();
    const eventsList = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(reqYear, reqMonth, day);
      if (date.getDay() === 0 || date.getDay() === 6) continue;
      
      const numEvents = 1 + ((day * 3) % 3);
      for (let i = 0; i < numEvents; i++) {
        const template = eventTemplates[(day + i) % eventTemplates.length];
        const currency = template.currencies[(day + i) % template.currencies.length];
        const val = (((day + i) * 0.17) % 3.0).toFixed(1);
        eventsList.push({
          title: template.title,
          country: currency,
          date: new Date(reqYear, reqMonth, day, 9 + i * 2, 30, 0).toISOString(),
          impact: template.impact,
          forecast: `${val}%`,
          previous: `${(parseFloat(val) - 0.1).toFixed(1)}%`
        });
      }
    }
    return eventsList.sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  if (url === '/analyze' && method === 'POST') {
    const { event } = body;
    const { title, country, forecast } = event;
    const fallbackText = `🤖 **[NVIDIA Llama-3.1-Nemotron-70B-Instruct - Simulated Analyst]**\n\n### Economic Significance of **${title}** (${country})\n\nThis is a High-impact release. Consensus forecast is **${forecast || 'N/A'}**. Deviances will spark volatility. Protect your downside by lowering risk before release.`;
    return {
      role: 'assistant',
      content: fallbackText
    };
  }

  throw { status: 404, message: 'Not Found' };
};

// 11. Public Showcase / Trade sharing Handler
const handlePublic = async (url, method, body) => {
  const parts = url.split('/');
  
  if (url.startsWith('/dashboard/ai/chat/')) {
    return {
      role: 'assistant',
      content: `🤖 **[Public Viewer Coach Fallback]**\n\nI am analyzing this shared dashboard view. The win rate and P&L represent active local performance data.`
    };
  }

  if (url.startsWith('/dashboard/')) {
    const token = parts[2];
    const userId = parseInt(token.replace('showcase-token-', ''));
    if (!userId) throw { status: 404, message: 'Dashboard not found' };

    const trades = getStorageItem(`trades_${userId}`, []);
    const totalPnL = trades.reduce((a, t) => a + t.pnl, 0);
    const winRate = trades.length > 0 ? (trades.filter(t => t.pnl > 0).length / trades.length * 100) : 0;
    
    return {
      trades: trades.filter(t => t.shareToken),
      analytics: {
        summary: {
          totalTrades: trades.length,
          totalPnL,
          winRate
        }
      }
    };
  }

  if (url.startsWith('/trades/')) {
    const token = parts[2];
    const tradeId = parseInt(token.replace('trade-token-', ''));
    if (!tradeId) throw { status: 404, message: 'Trade not found' };

    const users = getStorageItem('users', []);
    for (const u of users) {
      const trades = getStorageItem(`trades_${u.id}`, []);
      const found = trades.find(t => t.id === tradeId);
      if (found) {
        const imageBase64 = await getLocalImage(found.id);
        return {
          ...found,
          imageUrl: imageBase64 || null
        };
      }
    }
    throw { status: 404, message: 'Trade not found' };
  }

  throw { status: 404, message: 'Not Found' };
};

// 12. TradingView Handler
const handleTradingView = async (url, method, body) => {
  const activeUser = getActiveUser();

  const generateMockAnalysis = (symbol, timeframe) => {
    const s = symbol.toUpperCase();
    const seed = [...s].reduce((a, c) => a + c.charCodeAt(0), 0);
    const rand = (min, max) => {
      const x = Math.sin(seed * 9301 + 49297) % 1;
      return min + Math.abs(x) * (max - min);
    };

    const price = +(rand(20, 500)).toFixed(2);
    const rsi = +(rand(25, 78)).toFixed(1);
    const macdLine = +(rand(-3, 4)).toFixed(3);
    const macdSignal = +(macdLine - rand(-1, 1)).toFixed(3);
    const macdHist = +(macdLine - macdSignal).toFixed(3);
    const ema20 = +(price * rand(0.96, 1.02)).toFixed(2);
    const ema50 = +(price * rand(0.93, 1.04)).toFixed(2);
    const sma200 = +(price * rand(0.88, 1.06)).toFixed(2);
    const bbUpper = +(price * 1.04).toFixed(2);
    const bbMiddle = +(price * 1.00).toFixed(2);
    const bbLower = +(price * 0.96).toFixed(2);
    const bbWidth = +((bbUpper - bbLower) / bbMiddle * 100).toFixed(2);
    const volume = Math.floor(rand(500000, 80000000));
    const avgVolume = Math.floor(volume * rand(0.7, 1.3));

    let buySignals = 0;
    let sellSignals = 0;
    let neutralSignals = 0;

    if (rsi < 30) buySignals += 2;
    else if (rsi < 45) buySignals++;
    else if (rsi > 70) sellSignals += 2;
    else if (rsi > 55) sellSignals++;
    else neutralSignals++;

    if (macdHist > 0) buySignals++;
    else if (macdHist < 0) sellSignals++;
    else neutralSignals++;

    if (price > ema20) buySignals++;
    else sellSignals++;

    if (price > ema50) buySignals++;
    else sellSignals++;

    if (price > sma200) buySignals++;
    else sellSignals++;

    const totalSignals = buySignals + sellSignals + neutralSignals;
    let overallSignal = 'Neutral';
    if (buySignals >= 4) overallSignal = 'Strong Buy';
    else if (buySignals >= 3) overallSignal = 'Buy';
    else if (sellSignals >= 4) overallSignal = 'Strong Sell';
    else if (sellSignals >= 3) overallSignal = 'Sell';

    const support1 = +(price * 0.97).toFixed(2);
    const support2 = +(price * 0.94).toFixed(2);
    const support3 = +(price * 0.90).toFixed(2);
    const resistance1 = +(price * 1.03).toFixed(2);
    const resistance2 = +(price * 1.06).toFixed(2);
    const resistance3 = +(price * 1.10).toFixed(2);

    const trend = price > ema50 ? 'bullish' : 'bearish';
    const macdTrend = macdHist > 0 ? 'positive and expanding' : 'negative and contracting';
    const rsiZone = rsi < 30 ? 'oversold' : rsi > 70 ? 'overbought' : 'neutral';
    const insight = `**${s}** is showing **${trend} momentum** on the ${timeframe} timeframe. RSI is at **${rsi}** (${rsiZone} territory)${rsi < 30 ? ', suggesting a potential reversal to the upside' : rsi > 70 ? ', warning of a potential pullback' : ''}. Price is trading ${price > ema50 ? 'above' : 'below'} the 50 EMA ($${ema50}) and ${price > sma200 ? 'above' : 'below'} the 200 SMA ($${sma200}). MACD histogram is **${macdTrend}** (${macdHist > 0 ? 'buyers in control' : 'sellers dominating'}). Bollinger Band width at ${bbWidth}% ${bbWidth < 3 ? 'indicates a squeeze — expect a breakout soon' : 'suggests normal volatility'}. Key support at **$${support1}**, resistance at **$${resistance1}**.`;

    return {
      symbol: s,
      timeframe,
      price,
      timestamp: new Date().toISOString(),
      overallSignal,
      signalCounts: { buy: buySignals, sell: sellSignals, neutral: neutralSignals, total: totalSignals },
      indicators: {
        rsi: { value: rsi, signal: rsi < 30 ? 'Buy' : rsi > 70 ? 'Sell' : 'Neutral' },
        macd: {
          line: macdLine, signal: macdSignal, histogram: macdHist,
          signal_type: macdHist > 0 ? 'Buy' : 'Sell',
        },
        ema20: { value: ema20, signal: price > ema20 ? 'Buy' : 'Sell' },
        ema50: { value: ema50, signal: price > ema50 ? 'Buy' : 'Sell' },
        sma200: { value: sma200, signal: price > sma200 ? 'Buy' : 'Sell' },
        bollingerBands: {
          upper: bbUpper, middle: bbMiddle, lower: bbLower,
          width: bbWidth,
          squeeze: bbWidth < 3,
          signal: price > bbUpper ? 'Sell' : price < bbLower ? 'Buy' : 'Neutral',
        },
        volume: { current: volume, average: avgVolume, ratio: +(volume / avgVolume).toFixed(2) },
      },
      supportResistance: {
        support: [
          { level: support1, strength: 'Strong', label: 'S1' },
          { level: support2, strength: 'Medium', label: 'S2' },
          { level: support3, strength: 'Weak', label: 'S3' },
        ],
        resistance: [
          { level: resistance1, strength: 'Strong', label: 'R1' },
          { level: resistance2, strength: 'Medium', label: 'R2' },
          { level: resistance3, strength: 'Weak', label: 'R3' },
        ],
      },
      insight,
      mode: 'mock',
    };
  };

  if (url === '/status' && method === 'GET') {
    return { status: 'mock', message: 'Running in Browser DB Mode (Local Analysis)' };
  }

  if (url === '/symbols' && method === 'GET') {
    const trades = getStorageItem(`trades_${activeUser.id}`, []);
    const tradeSymbols = [...new Set(trades.map(t => t.symbol?.toUpperCase()).filter(Boolean))];
    const popular = [
      'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'AMD',
      'SPY', 'QQQ', 'IWM', 'DIA',
      'BTCUSD', 'ETHUSD', 'SOLUSD',
      'EURUSD', 'GBPUSD', 'USDJPY',
      'ES', 'NQ', 'GC', 'CL',
    ];
    const allSymbols = [...new Set([...tradeSymbols, ...popular])];
    return {
      userSymbols: tradeSymbols,
      popular,
      all: allSymbols,
    };
  }

  if (url === '/analyze' && method === 'POST') {
    const { symbol, timeframe } = body;
    if (!symbol) throw { status: 400, message: 'Symbol is required' };
    return generateMockAnalysis(symbol, timeframe || '1D');
  }

  throw { status: 404, message: 'Not Found' };
};

// ─── Core Routing Interceptor ─────────────────────────
export const handleRequest = async (fullUrl, options = {}) => {
  const method = options.method || 'GET';
  const body = options.body ? (typeof options.body === 'string' ? JSON.parse(options.body) : options.body) : null;
  
  // Parse query parameters out of url
  const [urlPath, queryString] = fullUrl.split('?');
  const queryParams = {};
  if (queryString) {
    new URLSearchParams(queryString).forEach((v, k) => {
      queryParams[k] = v;
    });
  }
  
  // Routing logic matching express paths
  try {
    if (urlPath.startsWith('/auth')) {
      return await handleAuth(urlPath, method, body);
    }
    if (urlPath.startsWith('/trades')) {
      const subUrl = urlPath.slice('/trades'.length);
      return await handleTrades(subUrl, method, body, queryParams);
    }
    if (urlPath.startsWith('/journal')) {
      const subUrl = urlPath.slice('/journal'.length);
      return await handleJournal(subUrl, method, body, queryParams);
    }
    if (urlPath.startsWith('/ai')) {
      const subUrl = urlPath.slice('/ai'.length);
      return await handleAi(subUrl, method, body);
    }
    if (urlPath.startsWith('/backup')) {
      const subUrl = urlPath.slice('/backup'.length);
      return await handleBackup(subUrl, method, body);
    }
    if (urlPath.startsWith('/accounts')) {
      const subUrl = urlPath.slice('/accounts'.length);
      return await handleAccounts(subUrl, method, body);
    }
    if (urlPath.startsWith('/achievements')) {
      const subUrl = urlPath.slice('/achievements'.length);
      return await handleAchievements(subUrl, method, body);
    }
    if (urlPath.startsWith('/notion')) {
      const subUrl = urlPath.slice('/notion'.length);
      return await handleNotion(subUrl, method, body);
    }
    if (urlPath.startsWith('/stoic')) {
      const subUrl = urlPath.slice('/stoic'.length);
      return await handleStoic(subUrl, method, body);
    }
    if (urlPath.startsWith('/news')) {
      const subUrl = urlPath.slice('/news'.length);
      return await handleNews(subUrl, method, body, queryParams);
    }
    if (urlPath.startsWith('/public')) {
      const subUrl = urlPath.slice('/public'.length);
      return await handlePublic(subUrl, method, body);
    }
    
    // TV & MT5 MCP connection mocks
    if (urlPath.startsWith('/tradingview')) {
      const subUrl = urlPath.slice('/tradingview'.length);
      return await handleTradingView(subUrl, method, body);
    }
    if (urlPath.startsWith('/mt5')) {
      const activeUser = getActiveUser();
      if (urlPath === '/mt5/status') {
        const conn = getStorageItem(`mt5_connection_${activeUser.id}`, null);
        if (conn) {
          return { connected: true, connection: conn };
        }
        return { connected: false };
      }
      if (urlPath === '/mt5/connect') {
        const { accountNumber, password, serverName, accountType } = body;
        if (!accountNumber || !password || !serverName) {
          throw { status: 400, message: 'All fields are required' };
        }
        if (!/^\d{4,12}$/.test(accountNumber)) {
          throw { status: 400, message: 'Invalid account number format. Must be 4-12 digits.' };
        }

        const extractBrokerName = (srv) => {
          const name = srv.toLowerCase();
          if (name.includes('icmarkets')) return 'IC Markets';
          if (name.includes('pepperstone')) return 'Pepperstone';
          if (name.includes('exness')) return 'Exness';
          if (name.includes('xm')) return 'XM Group';
          if (name.includes('fxpro')) return 'FxPro';
          if (name.includes('oanda')) return 'OANDA';
          if (name.includes('fbs')) return 'FBS';
          if (name.includes('roboforex')) return 'RoboForex';
          if (name.includes('ftmo')) return 'FTMO';
          if (name.includes('fundednext')) return 'FundedNext';
          if (name.includes('myforexfunds')) return 'My Forex Funds';
          if (name.includes('topstep')) return 'TopStep';
          if (name.includes('the5ers') || name.includes('5ers')) return 'The5ers';
          if (name.includes('trueforex')) return 'TrueForex';
          const parts = srv.split(/[-_.\s]/);
          return parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) : 'Broker';
        };

        const connectionId = `mt5_local_${activeUser.id}_${Date.now()}`;
        const connectionData = {
          id: connectionId,
          status: 'connected',
          accountNumber: '****' + String(accountNumber).slice(-4),
          serverName,
          broker: extractBrokerName(serverName),
          accountType: accountType || 'prop',
          connectedAt: new Date().toISOString(),
          leverage: '1:100',
          currency: 'USD',
          platform: 'MetaTrader 5',
        };

        setStorageItem(`mt5_connection_${activeUser.id}`, connectionData);

        return {
          success: true,
          connection: connectionData,
          message: 'Successfully connected to MT5 terminal (Simulated Mode)',
        };
      }
      if (urlPath === '/mt5/disconnect') {
        setStorageItem(`mt5_connection_${activeUser.id}`, null);
        return { success: true, message: 'Disconnected from MT5' };
      }
      if (urlPath === '/mt5/sync-trades') {
        const conn = getStorageItem(`mt5_connection_${activeUser.id}`, null);
        if (!conn) {
          throw { status: 400, message: 'No active MT5 connection found. Connect your account first.' };
        }

        const now = new Date();
        const mockTrades = [
          {
            id: Date.now(),
            symbol: 'EURUSD', type: 'Long', entryPrice: 1.08250, exitPrice: 1.08550,
            lotSize: 1.5, stopLoss: 1.07900, takeProfit: 1.09000, pnl: 450.00,
            entryTime: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
            exitTime: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
            setup: 'Double Bottom Support', grade: 'A',
            notes: `MT5 API Auto-Sync (Local Mode): EUR/USD buy bounce from 4H support on server ${conn.serverName}.`,
            tags: ['MT5-Sync', 'EURUSD', 'Support'],
            emotionTags: [], fomoLevel: 5, confidenceLevel: 5, accountId: null,
            createdAt: new Date().toISOString()
          },
          {
            id: Date.now() + 1,
            symbol: 'GBPUSD', type: 'Short', entryPrice: 1.27250, exitPrice: 1.26850,
            lotSize: 2.0, stopLoss: 1.27600, takeProfit: 1.26500, pnl: 800.00,
            entryTime: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
            exitTime: new Date(now.getTime() - 1.5 * 60 * 60 * 1000).toISOString(),
            setup: 'EMA Rejection', grade: 'B',
            notes: `MT5 API Auto-Sync (Local Mode): GBP/USD short rejection on 15M EMA on server ${conn.serverName}.`,
            tags: ['MT5-Sync', 'GBPUSD', 'Short'],
            emotionTags: [], fomoLevel: 5, confidenceLevel: 5, accountId: null,
            createdAt: new Date().toISOString()
          },
          {
            id: Date.now() + 2,
            symbol: 'XAUUSD', type: 'Long', entryPrice: 2340.50, exitPrice: 2334.20,
            lotSize: 1.0, stopLoss: 2332.00, takeProfit: 2355.00, pnl: -630.00,
            entryTime: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(),
            exitTime: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
            setup: 'Breakout Fail', grade: 'C',
            notes: `MT5 API Auto-Sync (Local Mode): Stopped out early on gold false breakout on server ${conn.serverName}.`,
            tags: ['MT5-Sync', 'XAUUSD'],
            emotionTags: [], fomoLevel: 5, confidenceLevel: 5, accountId: null,
            createdAt: new Date().toISOString()
          }
        ];

        const trades = getStorageItem(`trades_${activeUser.id}`, []);
        const newTrades = [...mockTrades, ...trades];
        setStorageItem(`trades_${activeUser.id}`, newTrades);

        return {
          success: true,
          count: mockTrades.length,
          message: `Successfully synchronized ${mockTrades.length} Forex/CFD trades from MT5 server!`,
        };
      }
    }
    
    throw { status: 404, message: 'Route not mocked locally' };
  } catch (err) {
    if (err.status) {
      throw new Error(err.message || 'Local db error');
    }
    throw err;
  }
};
