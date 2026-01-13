import { useState, useEffect } from 'react';
import type { Habit, CalendarData, HabitAnalytics } from '@habit-tracker/shared';
import { habitsApi, analyticsApi } from '../api/client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function Analytics() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);
  const [calendarData, setCalendarData] = useState<CalendarData[]>([]);
  const [habitAnalytics, setHabitAnalytics] = useState<HabitAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadInitialData = async () => {
      const [habitsRes, calendarRes] = await Promise.all([
        habitsApi.list(),
        analyticsApi.calendar(),
      ]);

      if (habitsRes.success && habitsRes.data) {
        const habitsData = habitsRes.data as Habit[];
        setHabits(habitsData);
        if (habitsData.length > 0) {
          setSelectedHabitId(habitsData[0].id);
        }
      }
      if (calendarRes.success && calendarRes.data) {
        setCalendarData(calendarRes.data as CalendarData[]);
      }
      setLoading(false);
    };

    loadInitialData();
  }, []);

  useEffect(() => {
    if (!selectedHabitId) return;

    const loadHabitAnalytics = async () => {
      const result = await analyticsApi.habit(selectedHabitId);
      if (result.success && result.data) {
        setHabitAnalytics(result.data as HabitAnalytics);
      }
    };

    loadHabitAnalytics();
  }, [selectedHabitId]);

  const getCalendarWeeks = () => {
    const weeks: (CalendarData | null)[][] = [];
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 364);
    startDate.setDate(startDate.getDate() - startDate.getDay());

    const calendarMap = new Map(calendarData.map(d => [d.date, d]));

    let currentWeek: (CalendarData | null)[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= today) {
      const dateStr = currentDate.toISOString().split('T')[0];
      currentWeek.push(calendarMap.get(dateStr) || { date: dateStr, count: 0, habits: [] });

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weeks.push(currentWeek);
    }

    return weeks;
  };

  const getColorIntensity = (count: number) => {
    if (count === 0) return 'bg-gray-100';
    if (count === 1) return 'bg-green-200';
    if (count === 2) return 'bg-green-300';
    if (count === 3) return 'bg-green-400';
    return 'bg-green-500';
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const weeks = getCalendarWeeks();
  const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>

      {/* Calendar Heatmap */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Activity Heatmap</h2>
        <div className="overflow-x-auto">
          <div className="inline-flex gap-1">
            <div className="flex flex-col gap-1 mr-2">
              {dayNames.map((day, i) => (
                <div key={i} className="h-3 text-xs text-gray-400 flex items-center">
                  {i % 2 === 1 ? day : ''}
                </div>
              ))}
            </div>
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col gap-1">
                {week.map((day, dayIndex) => (
                  <div
                    key={dayIndex}
                    className={`w-3 h-3 rounded-sm ${
                      day ? getColorIntensity(day.count) : 'bg-transparent'
                    }`}
                    title={day ? `${day.date}: ${day.count} completions` : ''}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 mt-4 text-xs text-gray-500">
          <span>Less</span>
          <div className="w-3 h-3 rounded-sm bg-gray-100" />
          <div className="w-3 h-3 rounded-sm bg-green-200" />
          <div className="w-3 h-3 rounded-sm bg-green-300" />
          <div className="w-3 h-3 rounded-sm bg-green-400" />
          <div className="w-3 h-3 rounded-sm bg-green-500" />
          <span>More</span>
        </div>
      </div>

      {/* Habit Selector and Charts */}
      {habits.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Habit Analytics</h2>
            <select
              value={selectedHabitId || ''}
              onChange={e => setSelectedHabitId(e.target.value)}
              className="input w-auto"
            >
              {habits.map(habit => (
                <option key={habit.id} value={habit.id}>
                  {habit.name}
                </option>
              ))}
            </select>
          </div>

          {habitAnalytics && (
            <div className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-primary-600">
                    {habitAnalytics.currentStreak}
                  </div>
                  <div className="text-sm text-gray-500">Current Streak</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-primary-600">
                    {habitAnalytics.longestStreak}
                  </div>
                  <div className="text-sm text-gray-500">Longest Streak</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-primary-600">
                    {habitAnalytics.completionRate}%
                  </div>
                  <div className="text-sm text-gray-500">Completion Rate</div>
                </div>
              </div>

              {/* Weekly Chart */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Last 12 Weeks</h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={habitAnalytics.completionsByWeek}>
                      <XAxis
                        dataKey="week"
                        tick={{ fontSize: 10 }}
                        tickFormatter={(value) => {
                          const date = new Date(value);
                          return `${date.getMonth() + 1}/${date.getDate()}`;
                        }}
                      />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip
                        labelFormatter={(value) => `Week of ${value}`}
                        formatter={(value: number) => [value, 'Completions']}
                      />
                      <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Day of Week Chart */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">By Day of Week</h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={habitAnalytics.completionsByDay.map(d => ({
                        ...d,
                        name: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.day],
                      }))}
                    >
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(value: number) => [value, 'Completions']} />
                      <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {habits.length === 0 && (
        <div className="card text-center py-12">
          <p className="text-gray-500">No habits yet. Create habits to see analytics!</p>
        </div>
      )}
    </div>
  );
}
