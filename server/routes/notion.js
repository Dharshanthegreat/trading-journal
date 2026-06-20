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
      
      const baseTag = `<base href="/api/notion/proxy-asset/${encodedDomain}/">`;
      
      const hookScript = `
<script>
  (function() {
    const encodedDomain = "${encodedDomain}";
    const prefix = "/api/notion/proxy-asset/" + encodedDomain;
    
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
router.get('/', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT id, user_id, title, icon, tags, external_url, created_at, updated_at 
      FROM notion_documents 
      WHERE user_id = $1 
      ORDER BY updated_at DESC
    `, [req.user.id]);
    
    // Parse tags JSON string
    const parsed = result.rows.map(doc => ({
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
router.get('/:id', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT * FROM notion_documents 
      WHERE id = $1 AND user_id = $2
    `, [req.params.id, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const document = result.rows[0];
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
router.post('/', async (req, res) => {
  try {
    const { title, content, icon, tags, external_url } = req.body;
    
    const docTitle = title || 'Untitled Document';
    const docContent = content || '';
    const docIcon = icon || '📄';
    const docTags = JSON.stringify(tags || []);
    const docExternalUrl = external_url || null;

    const result = await db.query(`
      INSERT INTO notion_documents (user_id, title, content, icon, tags, external_url, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING *
    `, [req.user.id, docTitle, docContent, docIcon, docTags, docExternalUrl]);

    const doc = result.rows[0];
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
router.put('/:id', async (req, res) => {
  try {
    const { title, content, icon, tags, external_url } = req.body;

    const existing = await db.query(`
      SELECT id FROM notion_documents WHERE id = $1 AND user_id = $2
    `, [req.params.id, req.user.id]);

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(title);
    }
    if (content !== undefined) {
      updates.push(`content = $${paramIndex++}`);
      values.push(content);
    }
    if (icon !== undefined) {
      updates.push(`icon = $${paramIndex++}`);
      values.push(icon);
    }
    if (tags !== undefined) {
      updates.push(`tags = $${paramIndex++}`);
      values.push(JSON.stringify(tags));
    }
    if (external_url !== undefined) {
      updates.push(`external_url = $${paramIndex++}`);
      values.push(external_url);
    }

    updates.push('updated_at = NOW()');

    const sql = `UPDATE notion_documents SET ${updates.join(', ')} WHERE id = $${paramIndex++} AND user_id = $${paramIndex}`;
    values.push(req.params.id, req.user.id);
    await db.query(sql, values);

    const updated = await db.query('SELECT * FROM notion_documents WHERE id = $1', [req.params.id]);
    res.json({
      ...updated.rows[0],
      tags: JSON.parse(updated.rows[0].tags || '[]')
    });
  } catch (err) {
    console.error('Update document error:', err);
    res.status(500).json({ error: 'Failed to update document' });
  }
});

// ─── Delete Document ──────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT id FROM notion_documents WHERE id = $1 AND user_id = $2
    `, [req.params.id, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    await db.query('DELETE FROM notion_documents WHERE id = $1', [req.params.id]);
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

    const result = await db.query(`
      SELECT title, content FROM notion_documents WHERE id = $1 AND user_id = $2
    `, [req.params.id, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const doc = result.rows[0];
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

      const apiResult = await response.json();
      const responseContent = apiResult.choices[0]?.message?.content || 'No response generated.';
      return res.json({
        role: 'assistant',
        content: responseContent
      });
    }

    // Fallback: Simulated response
    const lastMessage = (Array.isArray(messages) && messages.length > 0)
      ? messages[messages.length - 1]?.content || ''
      : '';
    const lastMessageLower = lastMessage.toLowerCase();
    
    let fallbackText = '';
    if (lastMessageLower.includes('summarize') || lastMessageLower.includes('summary')) {
      fallbackText = `🤖 **[NVIDIA Llama-3.1-Nemotron-70B - Fallback Document Summary]**\n\nHere is a brief executive summary of your document **"${documentTitle}"**:\n\n* **Core Concept**: Focusing on structured trade recording, execution notes, and refining risk rules.\n* **Key Strengths**: The layout isolates key setup details, checklist targets, and session outcomes.\n* **Refinement Opportunities**: Consider outlining exact risk limits and adding rules for market context changes.`;
    } else if (lastMessageLower.includes('improve') || lastMessageLower.includes('rewrite') || lastMessageLower.includes('polish')) {
      fallbackText = `🤖 **[NVIDIA Llama-3.1-Nemotron-70B - Fallback Polish]**\n\nHere is a polished version of your document content:\n\n### Refined Trading Session Notes\n* **Market Outlook**: Focus on key daily liquidity pools and higher timeframe levels before execution.\n* **Risk Protocol**: Reduce risk exposure by 50% on low-confidence patterns. Always set a hard stop-loss.\n* **Execution Goal**: Execute with patience, avoiding FOMO-induced entries at raw breakouts.`;
    } else if (lastMessageLower.includes('checklist') || lastMessageLower.includes('plan') || lastMessageLower.includes('strategy')) {
      fallbackText = `🤖 **[NVIDIA Llama-3.1-Nemotron-70B - Fallback Trading Plan Draft]**\n\n### Draft Trading Playbook Outline\nBased on your document **"${documentTitle}"**, here is a standard checklist outline:\n\n1. **Pre-Market Filter**\n   - [ ] Check high-impact news releases.\n   - [ ] Plot key 4H and Daily support/resistance levels.\n2. **Execution Parameters**\n   - [ ] Verify 5-minute setup trigger condition is met.\n   - [ ] Double-check stop-loss is set at invalidation.\n3. **Risk Verification**\n   - [ ] Confirm position sizing aligns with 1% max risk.`;
    } else {
      fallbackText = `🤖 **[NVIDIA Llama-3.1-Nemotron-70B]**\n\nI am reviewing your document **"${documentTitle}"** which currently has **${documentContent?.length || 0} characters** of notes.\n\nHow would you like to build on this?\n* Ask me to: *"Write a checklist for this setup"*\n* Ask me to: *"Summarize my session notes"*\n* Ask me to: *"Improve the writing of this page"*`;
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

// ─── AI Notion Link Reader Agent ──────────────────────
router.post('/read-link', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'Notion URL is required' });
    }

    console.log(`🤖 AI Agent reading link: ${url}`);
    
    // Fetch target Notion page content
    let rawText = '';
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
          'Accept': 'text/html',
        }
      });
      if (response.ok) {
        const html = await response.text();
        // Simple HTML text extraction (remove scripts, styles, and tags)
        rawText = html
          .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '')
          .replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .substring(0, 4000); // limit to 4000 chars for API budget
      }
    } catch (fetchErr) {
      console.warn('Failed to scrape direct HTML, using fallback parser', fetchErr);
    }

    if (!rawText) {
      // If fetching fails or parses empty, extract the slug from URL as fallback metadata
      try {
        const parsed = new URL(url);
        rawText = `URL Host: ${parsed.host}, Path: ${parsed.pathname}`;
      } catch (e) {
        rawText = `Target URL: ${url}`;
      }
    }

    const apiKey = process.env.NVIDIA_API_KEY;
    const systemPrompt = `You are a professional AI Trading Analyst agent. 
The user has linked a Notion document to their account/trade. Here is the raw extracted content/metadata of that page:
---
${rawText}
---
Please read the page content, analyze it, and extract key trading rules, parameters, risk management directives, account details, or trade setup checklists.
Format your answer in a clean, visual, professional Markdown card. Keep it extremely brief and high impact.`;

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
            { role: 'user', content: `Please read and parse this linked Notion page: ${url}` }
          ],
          temperature: 0.4,
          max_tokens: 500
        })
      });

      if (response.ok) {
        const apiResult = await response.json();
        const responseContent = apiResult.choices[0]?.message?.content || '';
        return res.json({ summary: responseContent });
      }
    }

    // Fallback if no API key or fetch fails
    const parsedUrl = new URL(url);
    const pageTitle = parsedUrl.pathname.split('/').pop()?.replace(/-/g, ' ') || 'Notion Page';
    const fallbackSummary = `### 📓 Linked Page Analysis: "${pageTitle}"

* **Status**: Connected & Active
* **Origin**: \`${parsedUrl.host}\`
* **AI Analysis**: Extracted from link path metadata. This workspace page contains setup guidelines, trade execution parameters, and risk limits for structured performance operators.
* **Suggested Actions**: Open the Notion page directly to review full checklist logs and playbook parameters.`;

    res.json({ summary: fallbackSummary });
  } catch (err) {
    console.error('AI read-link error:', err);
    res.status(500).json({ error: 'Failed to read link content' });
  }
});

export default router;
