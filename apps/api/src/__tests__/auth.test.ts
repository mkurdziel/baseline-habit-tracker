import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { buildServer } from '../server.js';
import { prisma } from '../lib/prisma.js';
import type { FastifyInstance } from 'fastify';

describe('Authentication API', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    server = await buildServer();
  });

  afterAll(async () => {
    await server.close();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up database before each test
    await prisma.refreshToken.deleteMany();
    await prisma.habitCompletion.deleteMany();
    await prisma.habit.deleteMany();
    await prisma.user.deleteMany();
  });

  describe('POST /api/auth/register', () => {
    test('should successfully register a new user', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.user.email).toBe('test@example.com');
      expect(body.data.user.name).toBe('Test User');
      expect(body.data.accessToken).toBeDefined();
      expect(body.data.refreshToken).toBeDefined();
    });

    test('should reject duplicate email registration', async () => {
      // Register first user
      await server.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
        },
      });

      // Try to register with same email
      const response = await server.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'test@example.com',
          password: 'different123',
          name: 'Another User',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('Email already registered');
    });

    test('should reject invalid email format', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'invalid-email',
          password: 'password123',
          name: 'Test User',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.success).toBe(false);
    });

    test('should reject short password', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'test@example.com',
          password: 'short',
          name: 'Test User',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Register a test user before each login test
      await server.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
        },
      });
    });

    test('should successfully login with valid credentials', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'test@example.com',
          password: 'password123',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.user.email).toBe('test@example.com');
      expect(body.data.accessToken).toBeDefined();
      expect(body.data.refreshToken).toBeDefined();
    });

    test('should reject login with wrong password', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'test@example.com',
          password: 'wrongpassword',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('Invalid email or password');
    });

    test('should reject login with non-existent email', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'nonexistent@example.com',
          password: 'password123',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('Invalid email or password');
    });
  });

  describe('GET /api/auth/me', () => {
    let accessToken: string;

    beforeEach(async () => {
      // Register and login to get access token
      const response = await server.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
        },
      });

      const body = response.json();
      accessToken = body.data.accessToken;
    });

    test('should return user info with valid token', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.email).toBe('test@example.com');
      expect(body.data.name).toBe('Test User');
    });

    test('should reject request without token', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/auth/me',
      });

      expect(response.statusCode).toBe(401);
    });

    test('should reject request with invalid token', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: {
          authorization: 'Bearer invalid-token',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('POST /api/auth/refresh', () => {
    let refreshToken: string;
    let userId: string;

    beforeEach(async () => {
      // Register to get refresh token
      const response = await server.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
        },
      });

      const body = response.json();
      refreshToken = body.data.refreshToken;
      userId = body.data.user.id;
    });

    test('should refresh access token with valid refresh token', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/auth/refresh',
        payload: {
          refreshToken,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.accessToken).toBeDefined();
      expect(body.data.refreshToken).toBeDefined();
      expect(body.data.refreshToken).not.toBe(refreshToken); // Should be a new token
    });

    test('should reject invalid refresh token', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/auth/refresh',
        payload: {
          refreshToken: 'invalid-token',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.success).toBe(false);
    });
  });

  describe('POST /api/auth/logout', () => {
    let accessToken: string;
    let refreshToken: string;

    beforeEach(async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
        },
      });

      const body = response.json();
      accessToken = body.data.accessToken;
      refreshToken = body.data.refreshToken;
    });

    test('should successfully logout', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/auth/logout',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          refreshToken,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);

      // Verify refresh token is deleted
      const token = await prisma.refreshToken.findUnique({
        where: { token: refreshToken },
      });
      expect(token).toBeNull();
    });

    test('should reject logout without authentication', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/auth/logout',
        payload: {
          refreshToken,
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
