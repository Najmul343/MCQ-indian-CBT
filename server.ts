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

  // Google Sheets Proxy endpoint to bypass CORS when fetching Google Sheets CSVs
  app.get('/api/sheets-proxy', async (req, res) => {
    const sheetUrl = req.query.url as string;
    if (!sheetUrl) {
      res.status(400).json({ error: 'Missing url parameter' });
      return;
    }

    try {
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
    const { requesterRole, targetUid } = req.body;
    if (requesterRole !== 'super_admin') {
      res.status(403).json({ error: 'Strict Permission Error: Requester claim is not super_admin' });
      return;
    }

    res.json({
      success: true,
      targetUid,
      token: `ghost_token_${targetUid}_${Date.now()}`,
      message: 'Ghost mode impersonation token minted successfully.'
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
