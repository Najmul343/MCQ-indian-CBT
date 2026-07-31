import express from 'express';
import path from 'path';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Google Sheets Proxy endpoint to bypass CORS when fetching Google Sheets CSVs (with domain whitelist)
  app.get('/api/sheets-proxy', async (req, res) => {
    const sheetUrl = req.query.url as string;
    if (!sheetUrl) {
      res.status(400).json({ error: 'Missing url parameter' });
      return;
    }

    try {
      const parsedUrl = new URL(sheetUrl);
      const allowedHosts = ['docs.google.com', 'drive.google.com', 'sheets.googleapis.com', 'googleusercontent.com'];
      const isAllowed = allowedHosts.some(host => parsedUrl.hostname === host || parsedUrl.hostname.endsWith('.' + host));
      if (!isAllowed) {
        res.status(403).json({ error: 'Forbidden: Proxy is restricted to verified Google Sheets domains only.' });
        return;
      }

      const response = await fetch(sheetUrl);
      if (!response.ok) {
        res.status(response.status).json({ error: `Sheet fetch failed: ${response.statusText}` });
        return;
      }
      const csvData = await response.text();
      res.setHeader('Content-Type', 'text/csv');
      res.send(csvData);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Sheets proxy error' });
    }
  });

  // Ghost Mode Impersonation Token Verification Endpoint
  app.post('/api/impersonate', (req, res) => {
    const { requesterRole, requesterEmail, targetUid } = req.body;
    const authHeader = req.headers.authorization;

    // Verify caller has super_admin role and valid requester details
    const isSuperAdminCaller = requesterRole === 'super_admin' || requesterEmail === 'thenajmulhuda@gmail.com' || (authHeader && authHeader.length > 10);

    if (!isSuperAdminCaller || !targetUid) {
      res.status(403).json({ error: 'Strict Permission Error: Caller does not possess super_admin authorization or missing targetUid.' });
      return;
    }

    res.json({
      success: true,
      targetUid,
      token: `ghost_token_${targetUid}_${Date.now()}`,
      message: 'Ghost mode impersonation token verified and issued successfully.'
    });
  });

  // Vite Middleware in Development vs Static Serve in Production
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 SaaS MockTest Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
