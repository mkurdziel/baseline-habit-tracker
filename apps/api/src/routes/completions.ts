import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';
import type { HabitCompletion } from '@habit-tracker/shared';

const createCompletionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().max(500).optional(),
});

function formatCompletion(completion: any): HabitCompletion {
  return {
    id: completion.id,
    habitId: completion.habitId,
    completedAt: completion.completedAt.toISOString().split('T')[0],
    note: completion.note,
  };
}

export async function completionRoutes(server: FastifyInstance) {
  server.addHook('preHandler', authenticate);

  // Get completions for a habit
  server.get('/:id/completions', async (request: FastifyRequest, reply: FastifyReply) => {
    const { user } = request as AuthenticatedRequest;
    const { id } = request.params as { id: string };
    const { from, to } = request.query as { from?: string; to?: string };

    // Verify habit belongs to user
    const habit = await prisma.habit.findFirst({
      where: { id, userId: user.id },
    });

    if (!habit) {
      return reply.status(404).send({ success: false, error: 'Habit not found' });
    }

    const whereClause: any = { habitId: id };

    if (from || to) {
      whereClause.completedAt = {};
      if (from) whereClause.completedAt.gte = new Date(from);
      if (to) whereClause.completedAt.lte = new Date(to);
    }

    const completions = await prisma.habitCompletion.findMany({
      where: whereClause,
      orderBy: { completedAt: 'desc' },
    });

    return reply.send({
      success: true,
      data: completions.map(formatCompletion),
    });
  });

  // Mark habit complete for a date
  server.post('/:id/complete', async (request: FastifyRequest, reply: FastifyReply) => {
    const { user } = request as AuthenticatedRequest;
    const { id } = request.params as { id: string };

    try {
      const body = createCompletionSchema.parse(request.body);

      // Verify habit belongs to user
      const habit = await prisma.habit.findFirst({
        where: { id, userId: user.id },
      });

      if (!habit) {
        return reply.status(404).send({ success: false, error: 'Habit not found' });
      }

      const completedAt = new Date(body.date);

      // Check if already completed
      const existing = await prisma.habitCompletion.findUnique({
        where: {
          habitId_completedAt: {
            habitId: id,
            completedAt,
          },
        },
      });

      if (existing) {
        return reply.status(400).send({ success: false, error: 'Already completed for this date' });
      }

      const completion = await prisma.habitCompletion.create({
        data: {
          habitId: id,
          completedAt,
          note: body.note,
        },
      });

      return reply.status(201).send({ success: true, data: formatCompletion(completion) });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({ success: false, error: err.errors[0].message });
      }
      throw err;
    }
  });

  // Remove completion for a date
  server.delete('/:id/complete/:date', async (request: FastifyRequest, reply: FastifyReply) => {
    const { user } = request as AuthenticatedRequest;
    const { id, date } = request.params as { id: string; date: string };

    // Verify habit belongs to user
    const habit = await prisma.habit.findFirst({
      where: { id, userId: user.id },
    });

    if (!habit) {
      return reply.status(404).send({ success: false, error: 'Habit not found' });
    }

    const completedAt = new Date(date);

    const completion = await prisma.habitCompletion.findUnique({
      where: {
        habitId_completedAt: {
          habitId: id,
          completedAt,
        },
      },
    });

    if (!completion) {
      return reply.status(404).send({ success: false, error: 'Completion not found' });
    }

    await prisma.habitCompletion.delete({
      where: { id: completion.id },
    });

    return reply.send({ success: true, data: { message: 'Completion removed' } });
  });

  // Toggle completion (convenience endpoint)
  server.post('/:id/toggle', async (request: FastifyRequest, reply: FastifyReply) => {
    const { user } = request as AuthenticatedRequest;
    const { id } = request.params as { id: string };

    try {
      const body = createCompletionSchema.parse(request.body);

      // Verify habit belongs to user
      const habit = await prisma.habit.findFirst({
        where: { id, userId: user.id },
      });

      if (!habit) {
        return reply.status(404).send({ success: false, error: 'Habit not found' });
      }

      const completedAt = new Date(body.date);

      const existing = await prisma.habitCompletion.findUnique({
        where: {
          habitId_completedAt: {
            habitId: id,
            completedAt,
          },
        },
      });

      if (existing) {
        // Remove completion
        await prisma.habitCompletion.delete({
          where: { id: existing.id },
        });
        return reply.send({ success: true, data: { completed: false } });
      } else {
        // Add completion
        const completion = await prisma.habitCompletion.create({
          data: {
            habitId: id,
            completedAt,
            note: body.note,
          },
        });
        return reply.status(201).send({ success: true, data: { completed: true, completion: formatCompletion(completion) } });
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({ success: false, error: err.errors[0].message });
      }
      throw err;
    }
  });
}
