import { useState, useEffect } from 'react';
import type { Habit, HabitCompletion } from '@habit-tracker/shared';
import { habitsApi } from '../api/client';

interface HabitCardProps {
  habit: Habit;
  date: string;
  onToggle: () => void;
}

export default function HabitCard({ habit, date, onToggle }: HabitCardProps) {
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkCompletion = async () => {
      const result = await habitsApi.completions(habit.id, date, date);
      if (result.success && result.data) {
        const completions = result.data as HabitCompletion[];
        setCompleted(completions.length > 0);
      }
      setLoading(false);
    };
    checkCompletion();
  }, [habit.id, date]);

  const handleClick = async () => {
    setLoading(true);
    setCompleted(!completed);
    await onToggle();
    setLoading(false);
  };

  const frequencyLabel = () => {
    if (habit.frequency === 'DAILY') return 'Daily';
    if (habit.frequency === 'WEEKLY') return `${habit.targetPerWeek}x per week`;
    if (habit.frequency === 'CUSTOM' && habit.customDays) {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return habit.customDays.map(d => days[d]).join(', ');
    }
    return '';
  };

  return (
    <div
      className={`card cursor-pointer transition-all hover:shadow-md ${
        completed ? 'ring-2 ring-green-500 bg-green-50' : ''
      }`}
      onClick={handleClick}
    >
      <div className="flex items-start gap-4">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
            completed
              ? 'bg-green-500 text-white'
              : 'border-2 border-gray-300'
          }`}
          style={!completed ? { borderColor: habit.color } : undefined}
        >
          {loading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
          ) : completed ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : null}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{habit.name}</h3>
          {habit.description && (
            <p className="text-sm text-gray-500 truncate">{habit.description}</p>
          )}
          <div className="mt-1 flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: habit.color }}
            />
            <span className="text-xs text-gray-400">{frequencyLabel()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
