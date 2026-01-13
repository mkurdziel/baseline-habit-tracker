import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';
import type { Habit } from '@habit-tracker/shared';

const createHabitSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  frequency: z.enum(['DAILY', 'WEEKLY', 'CUSTOM']),
  customDays: z.array(z.number().min(0).max(6)).optional(),
  targetPerWeek: z.number().min(1).max(7).optional(),
});

const updateHabitSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  frequency: z.enum(['DAILY', 'WEEKLY', 'CUSTOM']).optional(),
  customDays: z.array(z.number().min(0).max(6)).nullable().optional(),
  targetPerWeek: z.number().min(1).max(7).nullable().optional(),
  archived: z.boolean().optional(),
});

function formatHabit(habit: any): Habit {
  return {
    id: habit.id,
    userId: habit.userId,
    name: habit.name,
    description: habit.description,
    color: habit.color,
    frequency: habit.frequency,
    customDays: habit.customDays.length > 0 ? habit.customDays : null,
    targetPerWeek: habit.targetPerWeek,
    createdAt: habit.createdAt.toISOString(),
    archived: habit.archived,
  };
}

export async function habitRoutes(server: FastifyInstance) {
  // Add auth to all routes
  server.addHook('preHandler', authenticate);

  // List habits
  server.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const { user } = request as AuthenticatedRequest;
    const { includeArchived } = request.query as { includeArchived?: string };

    const habits = await prisma.habit.findMany({
      where: {
        userId: user.id,
        ...(includeArchived !== 'true' && { archived: false }),
      },
      orderBy: { createdAt: 'desc' },
    });

    return reply.send({
      success: true,
      data: habits.map(formatHabit),
    });
  });

  // Get single habit
  server.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { user } = request as AuthenticatedRequest;
    const { id } = request.params as { id: string };

    const habit = await prisma.habit.findFirst({
      where: { id, userId: user.id },
    });

    if (!habit) {
      return reply.status(404).send({ success: false, error: 'Habit not found' });
    }

    return reply.send({ success: true, data: formatHabit(habit) });
  });

  // Create habit
  server.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const { user } = request as AuthenticatedRequest;

    try {
      const body = createHabitSchema.parse(request.body);

      const habit = await prisma.habit.create({
        data: {
          userId: user.id,
          name: body.name,
          description: body.description,
          color: body.color || '#6366f1',
          frequency: body.frequency,
          customDays: body.customDays || [],
          targetPerWeek: body.targetPerWeek,
        },
      });

      return reply.status(201).send({ success: true, data: formatHabit(habit) });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({ success: false, error: err.errors[0].message });
      }
      throw err;
    }
  });

  // Update habit
  server.patch('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { user } = request as AuthenticatedRequest;
    const { id } = request.params as { id: string };

    try {
      const body = updateHabitSchema.parse(request.body);

      const existing = await prisma.habit.findFirst({
        where: { id, userId: user.id },
      });

      if (!existing) {
        return reply.status(404).send({ success: false, error: 'Habit not found' });
      }

      const habit = await prisma.habit.update({
        where: { id },
        data: {
          ...(body.name !== undefined && { name: body.name }),
          ...(body.description !== undefined && { description: body.description }),
          ...(body.color !== undefined && { color: body.color }),
          ...(body.frequency !== undefined && { frequency: body.frequency }),
          ...(body.customDays !== undefined && { customDays: body.customDays || [] }),
          ...(body.targetPerWeek !== undefined && { targetPerWeek: body.targetPerWeek }),
          ...(body.archived !== undefined && { archived: body.archived }),
        },
      });

      return reply.send({ success: true, data: formatHabit(habit) });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({ success: false, error: err.errors[0].message });
      }
      throw err;
    }
  });

  // Delete (archive) habit
  server.delete('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { user } = request as AuthenticatedRequest;
    const { id } = request.params as { id: string };

    const existing = await prisma.habit.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return reply.status(404).send({ success: false, error: 'Habit not found' });
    }

    await prisma.habit.update({
      where: { id },
      data: { archived: true },
    });

    return reply.send({ success: true, data: { message: 'Habit archived' } });
  });
}
