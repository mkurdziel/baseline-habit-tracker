import { useState, useEffect } from 'react';
import type { Habit, OverviewStats } from '@habit-tracker/shared';
import { habitsApi, analyticsApi } from '../api/client';
import HabitCard from '../components/HabitCard';

export default function Dashboard() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().split('T')[0];

  const loadData = async () => {
    const [habitsRes, statsRes] = await Promise.all([
      habitsApi.list(),
      analyticsApi.overview(),
    ]);

    if (habitsRes.success && habitsRes.data) {
      setHabits(habitsRes.data as Habit[]);
    }
    if (statsRes.success && statsRes.data) {
      setStats(statsRes.data as OverviewStats);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggle = async (habitId: string) => {
    const result = await habitsApi.toggle(habitId, today);
    if (result.success) {
      loadData();
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Today's Progress</div>
            <div className="mt-2 flex items-baseline">
              <span className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {stats.completedToday}
              </span>
              <span className="ml-2 text-gray-500 dark:text-gray-400">/ {stats.activeHabits}</span>
            </div>
          </div>

          <div className="card">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Completion Rate</div>
            <div className="mt-2">
              <span className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {stats.overallCompletionRate}%
              </span>
            </div>
          </div>

          <div className="card">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Habits</div>
            <div className="mt-2">
              <span className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {stats.activeHabits}
              </span>
            </div>
          </div>

          <div className="card">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Top Streak</div>
            <div className="mt-2">
              <span className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {stats.currentStreaks[0]?.streak || 0}
              </span>
              <span className="ml-2 text-gray-500 dark:text-gray-400">days</span>
            </div>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Today's Habits</h2>
        {habits.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">No habits yet. Create your first habit to get started!</p>
            <a href="/habits" className="btn btn-primary mt-4 inline-block">
              Create Habit
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {habits.map(habit => (
              <HabitCard
                key={habit.id}
                habit={habit}
                date={today}
                onToggle={() => handleToggle(habit.id)}
              />
            ))}
          </div>
        )}
      </div>

      {stats && stats.currentStreaks.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Current Streaks</h2>
          <div className="card">
            <div className="space-y-3">
              {stats.currentStreaks.map(streak => (
                <div key={streak.habitId} className="flex items-center justify-between">
                  <span className="text-gray-700 dark:text-gray-300">{streak.habitName}</span>
                  <span className="font-semibold text-primary-600">
                    {streak.streak} day{streak.streak !== 1 ? 's' : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
