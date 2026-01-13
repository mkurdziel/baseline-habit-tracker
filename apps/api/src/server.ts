import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import { authRoutes } from './routes/auth.js';
import { habitRoutes } from './routes/habits.js';
import { completionRoutes } from './routes/completions.js';
import { analyticsRoutes } from './routes/analytics.js';

export async function buildServer() {
  const server = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      transport:
        process.env.NODE_ENV !== 'production'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
    },
  });

  // Register plugins
  await server.register(cors, {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  });

  await server.register(cookie);

  await server.register(jwt, {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    sign: { expiresIn: '15m' },
  });

  // Health check
  server.get('/api/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Register routes
  await server.register(authRoutes, { prefix: '/api/auth' });
  await server.register(habitRoutes, { prefix: '/api/habits' });
  await server.register(completionRoutes, { prefix: '/api/habits' });
  await server.register(analyticsRoutes, { prefix: '/api/analytics' });

  return server;
}
