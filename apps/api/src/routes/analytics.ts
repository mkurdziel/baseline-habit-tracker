import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';
import type { OverviewStats, CalendarData, HabitAnalytics } from '@habit-tracker/shared';

function calculateStreak(completions: Date[], frequency: string, customDays: number[]): { current: number; longest: number } {
  if (completions.length === 0) return { current: 0, longest: 0 };

  const sortedDates = completions
    .map(d => new Date(d).toISOString().split('T')[0])
    .sort()
    .reverse();

  const uniqueDates = [...new Set(sortedDates)];

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  // Check if streak is active (completed today or yesterday)
  const streakActive = uniqueDates[0] === today || uniqueDates[0] === yesterday;

  for (let i = 0; i < uniqueDates.length; i++) {
    const currentDate = new Date(uniqueDates[i]);
    const prevDate = i > 0 ? new Date(uniqueDates[i - 1]) : null;

    if (i === 0) {
      tempStreak = 1;
    } else {
      const dayDiff = prevDate
        ? Math.floor((prevDate.getTime() - currentDate.getTime()) / 86400000)
        : 0;

      if (dayDiff === 1) {
        tempStreak++;
      } else {
        if (tempStreak > longestStreak) longestStreak = tempStreak;
        tempStreak = 1;
      }
    }
  }

  if (tempStreak > longestStreak) longestStreak = tempStreak;
  currentStreak = streakActive ? tempStreak : 0;

  // Recalculate current streak from today/yesterday backwards
  if (streakActive) {
    currentStreak = 0;
    let checkDate = uniqueDates[0] === today ? today : yesterday;

    for (const date of uniqueDates) {
      if (date === checkDate) {
        currentStreak++;
        checkDate = new Date(new Date(checkDate).getTime() - 86400000).toISOString().split('T')[0];
      } else if (date < checkDate) {
        break;
      }
    }
  }

  return { current: currentStreak, longest: longestStreak };
}

function calculateCompletionRate(
  completions: Date[],
  createdAt: Date,
  frequency: string,
  customDays: number[],
  targetPerWeek: number | null
): number {
  const now = new Date();
  const start = new Date(createdAt);
  const daysSinceCreation = Math.floor((now.getTime() - start.getTime()) / 86400000) + 1;

  if (daysSinceCreation <= 0) return 0;

  let expectedCompletions = 0;

  if (frequency === 'DAILY') {
    expectedCompletions = daysSinceCreation;
  } else if (frequency === 'WEEKLY') {
    expectedCompletions = Math.ceil(daysSinceCreation / 7) * (targetPerWeek || 1);
  } else if (frequency === 'CUSTOM' && customDays.length > 0) {
    // Count how many of the custom days have passed
    for (let i = 0; i < daysSinceCreation; i++) {
      const checkDate = new Date(start.getTime() + i * 86400000);
      if (customDays.includes(checkDate.getDay())) {
        expectedCompletions++;
      }
    }
  }

  if (expectedCompletions === 0) return 0;

  return Math.min(100, Math.round((completions.length / expectedCompletions) * 100));
}

export async function analyticsRoutes(server: FastifyInstance) {
  server.addHook('preHandler', authenticate);

  // Overview stats
  server.get('/overview', async (request: FastifyRequest, reply: FastifyReply) => {
    const { user } = request as AuthenticatedRequest;

    const habits = await prisma.habit.findMany({
      where: { userId: user.id, archived: false },
      include: {
        completions: {
          orderBy: { completedAt: 'desc' },
        },
      },
    });

    const today = new Date().toISOString().split('T')[0];

    const completedToday = habits.filter(h =>
      h.completions.some(c => c.completedAt.toISOString().split('T')[0] === today)
    ).length;

    const streaks = habits.map(h => {
      const { current } = calculateStreak(
        h.completions.map(c => c.completedAt),
        h.frequency,
        h.customDays
      );
      return { habitId: h.id, habitName: h.name, streak: current };
    }).filter(s => s.streak > 0).sort((a, b) => b.streak - a.streak);

    const totalRate = habits.length > 0
      ? Math.round(
          habits.reduce((sum, h) => {
            return sum + calculateCompletionRate(
              h.completions.map(c => c.completedAt),
              h.createdAt,
              h.frequency,
              h.customDays,
              h.targetPerWeek
            );
          }, 0) / habits.length
        )
      : 0;

    const stats: OverviewStats = {
      totalHabits: habits.length,
      activeHabits: habits.filter(h => !h.archived).length,
      completedToday,
      overallCompletionRate: totalRate,
      currentStreaks: streaks.slice(0, 5),
    };

    return reply.send({ success: true, data: stats });
  });

  // Calendar heatmap data
  server.get('/calendar', async (request: FastifyRequest, reply: FastifyReply) => {
    const { user } = request as AuthenticatedRequest;
    const { from, to } = request.query as { from?: string; to?: string };

    const fromDate = from ? new Date(from) : new Date(Date.now() - 365 * 86400000);
    const toDate = to ? new Date(to) : new Date();

    const habits = await prisma.habit.findMany({
      where: { userId: user.id, archived: false },
      include: {
        completions: {
          where: {
            completedAt: {
              gte: fromDate,
              lte: toDate,
            },
          },
        },
      },
    });

    const calendarMap = new Map<string, { count: number; habits: { id: string; name: string; color: string }[] }>();

    for (const habit of habits) {
      for (const completion of habit.completions) {
        const dateStr = completion.completedAt.toISOString().split('T')[0];
        const existing = calendarMap.get(dateStr) || { count: 0, habits: [] };
        existing.count++;
        existing.habits.push({ id: habit.id, name: habit.name, color: habit.color });
        calendarMap.set(dateStr, existing);
      }
    }

    const calendarData: CalendarData[] = Array.from(calendarMap.entries()).map(([date, data]) => ({
      date,
      count: data.count,
      habits: data.habits,
    }));

    return reply.send({ success: true, data: calendarData });
  });

  // Per-habit analytics
  server.get('/habit/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { user } = request as AuthenticatedRequest;
    const { id } = request.params as { id: string };

    const habit = await prisma.habit.findFirst({
      where: { id, userId: user.id },
      include: {
        completions: {
          orderBy: { completedAt: 'desc' },
        },
      },
    });

    if (!habit) {
      return reply.status(404).send({ success: false, error: 'Habit not found' });
    }

    const completionDates = habit.completions.map(c => c.completedAt);
    const { current, longest } = calculateStreak(completionDates, habit.frequency, habit.customDays);
    const completionRate = calculateCompletionRate(
      completionDates,
      habit.createdAt,
      habit.frequency,
      habit.customDays,
      habit.targetPerWeek
    );

    // Completions by day of week
    const byDay = [0, 0, 0, 0, 0, 0, 0];
    for (const completion of habit.completions) {
      byDay[completion.completedAt.getDay()]++;
    }

    // Completions by week (last 12 weeks)
    const byWeek: { week: string; count: number }[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const weekStart = new Date(now.getTime() - (i * 7 + now.getDay()) * 86400000);
      const weekEnd = new Date(weekStart.getTime() + 6 * 86400000);
      const weekStr = weekStart.toISOString().split('T')[0];
      const count = habit.completions.filter(c => {
        const d = c.completedAt;
        return d >= weekStart && d <= weekEnd;
      }).length;
      byWeek.push({ week: weekStr, count });
    }

    // Completions by month (last 12 months)
    const byMonth: { month: string; count: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = monthDate.toISOString().slice(0, 7);
      const count = habit.completions.filter(c => {
        return c.completedAt.toISOString().slice(0, 7) === monthStr;
      }).length;
      byMonth.push({ month: monthStr, count });
    }

    const analytics: HabitAnalytics = {
      habitId: habit.id,
      currentStreak: current,
      longestStreak: longest,
      completionRate,
      completionsByDay: byDay.map((count, day) => ({ day, count })),
      completionsByWeek: byWeek,
      completionsByMonth: byMonth,
    };

    return reply.send({ success: true, data: analytics });
  });
}
