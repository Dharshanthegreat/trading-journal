// Parses a generic MT5 History CSV export
export const parseMT5CSV = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        // Basic CSV parsing (assuming comma or tab separated)
        // MT5 usually exports with tabs or commas. Let's try to detect.
        const lines = text.split('\n').filter(line => line.trim() !== '');
        
        if (lines.length === 0) throw new Error("Empty file");
        
        const isTabSeparated = lines[0].includes('\t');
        const separator = isTabSeparated ? '\t' : ',';
        
        const headers = lines[0].split(separator).map(h => h.trim().toLowerCase());
        
        // Find necessary column indices
        const getIdx = (keywords) => {
          for (let k of keywords) {
            const idx = headers.findIndex(h => h.includes(k));
            if (idx !== -1) return idx;
          }
          return -1;
        };

        const idxTime = getIdx(['time', 'date']);
        const idxSymbol = getIdx(['symbol', 'item']);
        const idxType = getIdx(['type', 'direction']);
        const idxPrice = getIdx(['price', 'entry']);
        const idxProfit = getIdx(['profit', 'pnl', 'result']);
        
        if (idxSymbol === -1 || idxProfit === -1) {
          throw new Error("Could not detect necessary columns (Symbol, Profit). Ensure this is an MT5 Trade History export.");
        }

        const parsedTrades = [];

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(separator).map(c => c.trim().replace(/"/g, ''));
          
          if (cols.length < headers.length - 2) continue; // Skip malformed lines

          const symbol = cols[idxSymbol];
          // Skip balance/deposit rows
          if (!symbol || symbol.toLowerCase() === 'balance' || symbol === '') continue;

          const pnlStr = cols[idxProfit];
          const pnl = parseFloat(pnlStr.replace(/[^0-9.-]/g, ''));
          
          if (isNaN(pnl)) continue;

          let type = "Unknown";
          if (idxType !== -1) {
            const rawType = cols[idxType].toLowerCase();
            if (rawType.includes('buy') || rawType.includes('long')) type = "Long";
            if (rawType.includes('sell') || rawType.includes('short')) type = "Short";
          } else {
            // Infer from profit? Hard to do without context. Defaulting to Unknown.
          }

          let entryPrice = 0;
          if (idxPrice !== -1) {
             entryPrice = parseFloat(cols[idxPrice]) || 0;
          }

          let timeStr = new Date().toISOString();
          if (idxTime !== -1 && cols[idxTime]) {
             // MT5 time format often: YYYY.MM.DD HH:MM:SS
             let parsedTime = new Date(cols[idxTime].replace(/\./g, '-'));
             if (!isNaN(parsedTime.getTime())) {
               timeStr = parsedTime.toISOString();
             }
          }

          parsedTrades.push({
            symbol: symbol.toUpperCase(),
            type,
            pnl,
            entryPrice,
            exitPrice: 0, // usually not on the same line in standard history unless specific export
            entryTime: timeStr,
            notes: "Imported from MT5",
            emotions: { fomo: 0, confidence: 5 }
          });
        }

        resolve(parsedTrades);
      } catch (err) {
        reject(err);
      }
    };
    
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
};
