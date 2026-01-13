import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { randomUUID } from 'crypto';
import type { AuthResponse, User } from '@habit-tracker/shared';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(100),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const refreshSchema = z.object({
  refreshToken: z.string(),
});

export async function authRoutes(server: FastifyInstance) {
  // Register
  server.post('/register', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = registerSchema.parse(request.body);

      const existingUser = await prisma.user.findUnique({
        where: { email: body.email },
      });

      if (existingUser) {
        return reply.status(400).send({ success: false, error: 'Email already registered' });
      }

      const passwordHash = await bcrypt.hash(body.password, 12);

      const user = await prisma.user.create({
        data: {
          email: body.email,
          passwordHash,
          name: body.name,
        },
      });

      const accessToken = server.jwt.sign({ id: user.id, email: user.email });
      const refreshToken = randomUUID();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      await prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.id,
          expiresAt,
        },
      });

      const response: AuthResponse = {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt.toISOString(),
        },
        accessToken,
        refreshToken,
      };

      return reply.status(201).send({ success: true, data: response });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({ success: false, error: err.errors[0].message });
      }
      server.log.error(err);
      return reply.status(500).send({ success: false, error: 'Internal server error' });
    }
  });

  // Login
  server.post('/login', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = loginSchema.parse(request.body);

      const user = await prisma.user.findUnique({
        where: { email: body.email },
      });

      if (!user) {
        return reply.status(401).send({ success: false, error: 'Invalid email or password' });
      }

      const validPassword = await bcrypt.compare(body.password, user.passwordHash);

      if (!validPassword) {
        return reply.status(401).send({ success: false, error: 'Invalid email or password' });
      }

      const accessToken = server.jwt.sign({ id: user.id, email: user.email });
      const refreshToken = randomUUID();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.id,
          expiresAt,
        },
      });

      const response: AuthResponse = {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt.toISOString(),
        },
        accessToken,
        refreshToken,
      };

      return reply.send({ success: true, data: response });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({ success: false, error: err.errors[0].message });
      }
      server.log.error(err);
      return reply.status(500).send({ success: false, error: 'Internal server error' });
    }
  });

  // Refresh token
  server.post('/refresh', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = refreshSchema.parse(request.body);

      const storedToken = await prisma.refreshToken.findUnique({
        where: { token: body.refreshToken },
        include: { user: true },
      });

      if (!storedToken || storedToken.expiresAt < new Date()) {
        if (storedToken) {
          await prisma.refreshToken.delete({ where: { id: storedToken.id } });
        }
        return reply.status(401).send({ success: false, error: 'Invalid or expired refresh token' });
      }

      // Delete old token and create new one
      await prisma.refreshToken.delete({ where: { id: storedToken.id } });

      const accessToken = server.jwt.sign({
        id: storedToken.user.id,
        email: storedToken.user.email,
      });
      const newRefreshToken = randomUUID();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await prisma.refreshToken.create({
        data: {
          token: newRefreshToken,
          userId: storedToken.user.id,
          expiresAt,
        },
      });

      const response: AuthResponse = {
        user: {
          id: storedToken.user.id,
          email: storedToken.user.email,
          name: storedToken.user.name,
          createdAt: storedToken.user.createdAt.toISOString(),
        },
        accessToken,
        refreshToken: newRefreshToken,
      };

      return reply.send({ success: true, data: response });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({ success: false, error: err.errors[0].message });
      }
      throw err;
    }
  });

  // Logout
  server.post('/logout', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = refreshSchema.parse(request.body);

      await prisma.refreshToken.deleteMany({
        where: { token: body.refreshToken },
      });

      return reply.send({ success: true, data: { message: 'Logged out successfully' } });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({ success: false, error: err.errors[0].message });
      }
      throw err;
    }
  });

  // Get current user
  server.get('/me', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { user } = request as AuthenticatedRequest;

    const userData = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!userData) {
      return reply.status(404).send({ success: false, error: 'User not found' });
    }

    const response: User = {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      createdAt: userData.createdAt.toISOString(),
    };

    return reply.send({ success: true, data: response });
  });
}
