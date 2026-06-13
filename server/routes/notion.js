import { Router } from 'express';
import db from '../db.js';

const router = Router();

// ─── Proxy Notion Embed to Bypass Frame Restrictions ─
router.get('/proxy', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).send('Missing url parameter');
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    if (!response.ok) {
      return res.status(response.status).send(`Failed to fetch Notion content: ${response.statusText}`);
    }

    let contentType = response.headers.get('content-type') || 'text/html';
    if (contentType.includes(';')) {
      contentType = contentType.split(';')[0];
    }
    
    res.setHeader('Content-Type', contentType);

    if (contentType.includes('text/html')) {
      let html = await response.text();
      
      const parsedUrl = new URL(targetUrl);
      const baseDomain = `${parsedUrl.protocol}//${parsedUrl.host}`;
      const encodedDomain = Buffer.from(baseDomain).toString('base64url');
      
      // Inject base tag
      const baseTag = `<base href="/api/notion/proxy-asset/${encodedDomain}/">`;
      
      // Hook script to intercept and redirect relative fetches and XMLHttpRequests
      const hookScript = `
<script>
  (function() {
    const encodedDomain = "${encodedDomain}";
    const prefix = "/api/notion/proxy-asset/" + encodedDomain;
    
    // Intercept fetch
    const originalFetch = window.fetch;
    window.fetch = function(input, init) {
      if (typeof input === 'string') {
        if (input.startsWith('/') && !input.startsWith(prefix) && !input.startsWith('/api/notion/')) {
          input = prefix + input;
        }
      } else if (input instanceof Request) {
        let url = input.url;
        const origin = window.location.origin;
        if (url.startsWith(origin) && !url.includes('/api/notion/')) {
          const path = url.substring(origin.length);
          if (path.startsWith('/') && !path.startsWith(prefix)) {
            input = new Request(origin + prefix + path, input);
          }
        }
      }
      return originalFetch.call(this, input, init);
    };

    // Intercept XMLHttpRequest
    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
      if (typeof url === 'string') {
        if (url.startsWith('/') && !url.startsWith(prefix) && !url.startsWith('/api/notion/')) {
          url = prefix + url;
        } else {
          const origin = window.location.origin;
          if (url.startsWith(origin) && !url.includes('/api/notion/')) {
            const path = url.substring(origin.length);
            if (path.startsWith('/') && !path.startsWith(prefix)) {
              url = origin + prefix + path;
            }
          }
        }
      }
      return originalOpen.call(this, method, url, async, user, password);
    };
  })();
</script>
`;

      if (html.includes('<head>')) {
        html = html.replace('<head>', `<head>${baseTag}${hookScript}`);
      } else {
        html = `${baseTag}${hookScript}${html}`;
      }

      // Rewrite root-relative URLs in static HTML
      const rewritePrefix = `/api/notion/proxy-asset/${encodedDomain}/`;
      html = html.replace(/(href|src)="\/([^\/][^"]*)"/g, `$1="${rewritePrefix}$2"`);
      html = html.replace(/(href|src)='\/([^\/][^']*)'/g, `$1='${rewritePrefix}$2'`);

      res.send(html);
    } else {
      const buffer = await response.arrayBuffer();
      res.send(Buffer.from(buffer));
    }
  } catch (err) {
    console.error('Notion Proxy error:', err);
    res.status(500).send('Error loading page: ' + err.message);
  }
});

// ─── Proxy Notion Assets & APIs to Solve CORS ────────
router.all('/proxy-asset/:encodedDomain/*splat', async (req, res) => {
  const { encodedDomain, splat } = req.params;
  const remainingPath = Array.isArray(splat) ? splat.join('/') : (splat || '');
  
  try {
    const baseDomain = Buffer.from(encodedDomain, 'base64url').toString('utf8');
    const queryString = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
    const targetUrl = `${baseDomain}/${remainingPath}${queryString}`;

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9'
    };

    if (req.headers['content-type']) {
      headers['Content-Type'] = req.headers['content-type'];
    }

    const fetchOptions = {
      method: req.method,
      headers
    };

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (typeof req.body === 'object' && Object.keys(req.body).length > 0) {
        fetchOptions.body = JSON.stringify(req.body);
      } else if (req.body) {
        fetchOptions.body = req.body;
      }
    }

    const response = await fetch(targetUrl, fetchOptions);

    let contentType = response.headers.get('content-type') || 'application/octet-stream';
    if (contentType.includes(';')) {
      contentType = contentType.split(';')[0];
    }
    
    res.setHeader('Content-Type', contentType);

    const headersToForward = ['cache-control', 'etag'];
    headersToForward.forEach(h => {
      const val = response.headers.get(h);
      if (val) res.setHeader(h, val);
    });

    if (contentType.includes('text/html')) {
      let html = await response.text();
      const baseTag = `<base href="/api/notion/proxy-asset/${encodedDomain}/">`;
      
      const hookScript = `
<script>
  (function() {
    const encodedDomain = "${encodedDomain}";
    const prefix = "/api/notion/proxy-asset/" + encodedDomain;
    
    // Intercept fetch
    const originalFetch = window.fetch;
    window.fetch = function(input, init) {
      if (typeof input === 'string') {
        if (input.startsWith('/') && !input.startsWith(prefix) && !input.startsWith('/api/notion/')) {
          input = prefix + input;
        }
      } else if (input instanceof Request) {
        let url = input.url;
        const origin = window.location.origin;
        if (url.startsWith(origin) && !url.includes('/api/notion/')) {
          const path = url.substring(origin.length);
          if (path.startsWith('/') && !path.startsWith(prefix)) {
            input = new Request(origin + prefix + path, input);
          }
        }
      }
      return originalFetch.call(this, input, init);
    };

    // Intercept XMLHttpRequest
    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
      if (typeof url === 'string') {
        if (url.startsWith('/') && !url.startsWith(prefix) && !url.startsWith('/api/notion/')) {
          url = prefix + url;
        } else {
          const origin = window.location.origin;
          if (url.startsWith(origin) && !url.includes('/api/notion/')) {
            const path = url.substring(origin.length);
            if (path.startsWith('/') && !path.startsWith(prefix)) {
              url = origin + prefix + path;
            }
          }
        }
      }
      return originalOpen.call(this, method, url, async, user, password);
    };
  })();
</script>
`;

      if (html.includes('<head>')) {
        html = html.replace('<head>', `<head>${baseTag}${hookScript}`);
      } else {
        html = `${baseTag}${hookScript}${html}`;
      }

      const rewritePrefix = `/api/notion/proxy-asset/${encodedDomain}/`;
      html = html.replace(/(href|src)="\/([^\/][^"]*)"/g, `$1="${rewritePrefix}$2"`);
      html = html.replace(/(href|src)='\/([^\/][^']*)'/g, `$1='${rewritePrefix}$2'`);

      res.send(html);
    } else {
      const buffer = await response.arrayBuffer();
      res.send(Buffer.from(buffer));
    }
  } catch (err) {
    console.error('Notion Asset Proxy error:', err);
    res.status(500).send('Error proxying asset: ' + err.message);
  }
});

// Simple in-memory rate limiter for AI requests
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 15;

function checkRateLimit(userId) {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(userId, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

// ─── Get All Documents ────────────────────────────────
router.get('/', (req, res) => {
  try {
    const documents = db.prepare(`
      SELECT id, user_id, title, icon, tags, external_url, created_at, updated_at 
      FROM notion_documents 
      WHERE user_id = ? 
      ORDER BY updated_at DESC
    `).all(req.user.id);
    
    // Parse tags JSON string
    const parsed = documents.map(doc => ({
      ...doc,
      tags: JSON.parse(doc.tags || '[]')
    }));

    res.json(parsed);
  } catch (err) {
    console.error('Get Notion documents error:', err);
    res.status(500).json({ error: 'Failed to retrieve documents' });
  }
});

// ─── Get Single Document ──────────────────────────────
router.get('/:id', (req, res) => {
  try {
    const document = db.prepare(`
      SELECT * FROM notion_documents 
      WHERE id = ? AND user_id = ?
    `).get(req.params.id, req.user.id);

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({
      ...document,
      tags: JSON.parse(document.tags || '[]')
    });
  } catch (err) {
    console.error('Get single document error:', err);
    res.status(500).json({ error: 'Failed to retrieve document' });
  }
});

// ─── Create Document ──────────────────────────────────
router.post('/', (req, res) => {
  try {
    const { title, content, icon, tags, external_url } = req.body;
    
    const docTitle = title || 'Untitled Document';
    const docContent = content || '';
    const docIcon = icon || '📄';
    const docTags = JSON.stringify(tags || []);
    const docExternalUrl = external_url || null;

    const result = db.prepare(`
      INSERT INTO notion_documents (user_id, title, content, icon, tags, external_url, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(req.user.id, docTitle, docContent, docIcon, docTags, docExternalUrl);

    const doc = db.prepare('SELECT * FROM notion_documents WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({
      ...doc,
      tags: JSON.parse(doc.tags || '[]')
    });
  } catch (err) {
    console.error('Create document error:', err);
    res.status(500).json({ error: 'Failed to create document' });
  }
});

// ─── Update Document ──────────────────────────────────
router.put('/:id', (req, res) => {
  try {
    const { title, content, icon, tags, external_url } = req.body;

    const existing = db.prepare(`
      SELECT id FROM notion_documents WHERE id = ? AND user_id = ?
    `).get(req.params.id, req.user.id);

    if (!existing) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const updates = [];
    const values = [];

    if (title !== undefined) {
      updates.push('title = ?');
      values.push(title);
    }
    if (content !== undefined) {
      updates.push('content = ?');
      values.push(content);
    }
    if (icon !== undefined) {
      updates.push('icon = ?');
      values.push(icon);
    }
    if (tags !== undefined) {
      updates.push('tags = ?');
      values.push(JSON.stringify(tags));
    }
    if (external_url !== undefined) {
      updates.push('external_url = ?');
      values.push(external_url);
    }

    updates.push("updated_at = datetime('now')");

    const sql = `UPDATE notion_documents SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`;
    db.prepare(sql).run(...values, req.params.id, req.user.id);

    const updated = db.prepare('SELECT * FROM notion_documents WHERE id = ?').get(req.params.id);
    res.json({
      ...updated,
      tags: JSON.parse(updated.tags || '[]')
    });
  } catch (err) {
    console.error('Update document error:', err);
    res.status(500).json({ error: 'Failed to update document' });
  }
});

// ─── Delete Document ──────────────────────────────────
router.delete('/:id', (req, res) => {
  try {
    const doc = db.prepare(`
      SELECT id FROM notion_documents WHERE id = ? AND user_id = ?
    `).get(req.params.id, req.user.id);

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    db.prepare('DELETE FROM notion_documents WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Document deleted' });
  } catch (err) {
    console.error('Delete document error:', err);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// ─── NVIDIA Llama AI Workspace Assistant ──────────────
router.post('/:id/ai', async (req, res) => {
  try {
    const { messages, content } = req.body;
    const userId = req.user.id;

    if (!checkRateLimit(userId)) {
      return res.status(429).json({ error: 'Too many requests. Please wait a minute.' });
    }

    const doc = db.prepare(`
      SELECT title, content FROM notion_documents WHERE id = ? AND user_id = ?
    `).get(req.params.id, req.user.id);

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Use current unsaved text content passed from client if available, else database content
    const documentContent = content !== undefined ? content : doc.content;
    const documentTitle = doc.title;

    const apiKey = process.env.NVIDIA_API_KEY;

    const systemPrompt = `You are a professional co-writer and trading coach powered by NVIDIA Llama-3.1-Nemotron-70B-Instruct.
You have direct access to the user's active Notion document workspace:
- Document Title: "${documentTitle}"
- Document Context Content:
---
${documentContent || '(Empty document)'}
---

Your role is to help the user co-write, review setups, write checklists, summarize notes, or design trading strategies. 
Structure all suggestions and analysis in extremely clean, readable Markdown. 
Keep answers concise, actionable, and focus on producing a high-performance trading playbook.`;

    if (apiKey) {
      const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'nvidia/llama-3.1-nemotron-70b-instruct',
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages
          ],
          temperature: 0.5,
          max_tokens: 1024
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`NVIDIA API Catalog returned error status ${response.status}: ${errText}`);
      }

      const result = await response.json();
      const responseContent = result.choices[0]?.message?.content || 'No response generated.';
      return res.json({
        role: 'assistant',
        content: responseContent
      });
    }

    // Fallback: Simulated Llama-3.1-Nemotron-70B-Instruct response for documents
    const lastMessage = (Array.isArray(messages) && messages.length > 0)
      ? messages[messages.length - 1]?.content || ''
      : '';
    const lastMessageLower = lastMessage.toLowerCase();
    
    let fallbackText = '';
    if (lastMessageLower.includes('summarize') || lastMessageLower.includes('summary')) {
      fallbackText = `🤖 **[NVIDIA Llama-3.1-Nemotron-70B - Fallback Document Summary]**

Here is a brief executive summary of your document **"${documentTitle}"**:

* **Core Concept**: Focusing on structured trade recording, execution notes, and refining risk rules.
* **Key Strengths**: The layout isolates key setup details, checklist targets, and session outcomes.
* **Refinement Opportunities**: Consider outlining exact risk limits (e.g. max daily drawdown) and adding rules for market context changes (breakout vs range).`;
    } else if (lastMessageLower.includes('improve') || lastMessageLower.includes('rewrite') || lastMessageLower.includes('polish')) {
      fallbackText = `🤖 **[NVIDIA Llama-3.1-Nemotron-70B - Fallback Polish]**

Here is a polished version of your document content:

### Refined Trading Session Notes
* **Market Outlook**: Focus on key daily liquidity pools and higher timeframe levels before execution.
* **Risk Protocol**: Reduce risk exposure by 50% on low-confidence patterns. Always set a hard stop-loss.
* **Execution Goal**: Execute with patience, avoiding FOMO-induced entries at raw breakouts.`;
    } else if (lastMessageLower.includes('checklist') || lastMessageLower.includes('plan') || lastMessageLower.includes('strategy')) {
      fallbackText = `🤖 **[NVIDIA Llama-3.1-Nemotron-70B - Fallback Trading Plan Draft]**

### Draft Trading Playbook Outline
Based on your document **"${documentTitle}"**, here is a standard checklist outline to copy into your notes:

1. **Pre-Market Filter**
   - [ ] Check high-impact news releases scheduled for the session.
   - [ ] Plot key 4H and Daily support/resistance levels.
2. **Execution Parameters**
   - [ ] Verify 5-minute setup trigger condition is met.
   - [ ] Double-check stop-loss is set at invalidation.
3. **Risk Verification**
   - [ ] Confirm position sizing aligns with 1% max risk.`;
    } else {
      fallbackText = `🤖 **[NVIDIA Llama-3.1-Nemotron-70B]**
      
I am reviewing your document **"${documentTitle}"** which currently has **${documentContent?.length || 0} characters** of notes.

How would you like to build on this?
* Ask me to: *"Write a checklist for this setup"*
* Ask me to: *"Summarize my session notes"*
* Ask me to: *"Improve the writing of this page"*`;
    }

    res.json({
      role: 'assistant',
      content: fallbackText
    });
  } catch (err) {
    console.error('AI document coach error:', err);
    res.status(500).json({ error: 'Failed to generate AI writing analysis' });
  }
});

export default router;
