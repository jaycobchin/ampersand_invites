import { resolve } from 'node:path';
import express from 'express';
import { app } from './app.mjs';

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(resolve('dist'), { index: false, maxAge: '1h' }));
  app.get('/{*path}', (_req, res) => res.sendFile(resolve('dist/index.html')));
} else {
  const { createServer } = await import('vite');
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
  app.use(vite.middlewares);
}
const server = app.listen(Number(process.env.PORT || 3000), '0.0.0.0', (error) => {
  if (error) {
    console.error('Could not start the server:', error.message);
    process.exit(1);
  }
  console.log(`Ampersand Invites is ready on http://localhost:${process.env.PORT || 3000}`);
});
process.on('SIGTERM', () => server.close(() => process.exit(0)));
