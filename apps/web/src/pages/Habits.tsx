import { useState, useEffect } from 'react';
import type { Habit } from '@habit-tracker/shared';
import { habitsApi } from '../api/client';
import HabitForm from '../components/HabitForm';

export default function Habits() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const loadHabits = async () => {
    const result = await habitsApi.list(showArchived);
    if (result.success && result.data) {
      setHabits(result.data as Habit[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadHabits();
  }, [showArchived]);

  const handleCreate = () => {
    setEditingHabit(null);
    setShowForm(true);
  };

  const handleEdit = (habit: Habit) => {
    setEditingHabit(habit);
    setShowForm(true);
  };

  const handleDelete = async (habit: Habit) => {
    if (!confirm(`Are you sure you want to archive "${habit.name}"?`)) return;

    const result = await habitsApi.delete(habit.id);
    if (result.success) {
      loadHabits();
    }
  };

  const handleFormSubmit = async (data: any) => {
    if (editingHabit) {
      const result = await habitsApi.update(editingHabit.id, data);
      if (result.success) {
        setShowForm(false);
        loadHabits();
      }
    } else {
      const result = await habitsApi.create(data);
      if (result.success) {
        setShowForm(false);
        loadHabits();
      }
    }
  };

  const frequencyLabel = (habit: Habit) => {
    if (habit.frequency === 'DAILY') return 'Daily';
    if (habit.frequency === 'WEEKLY') return `${habit.targetPerWeek}x per week`;
    if (habit.frequency === 'CUSTOM' && habit.customDays) {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return habit.customDays.map(d => days[d]).join(', ');
    }
    return '';
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Habits</h1>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={e => setShowArchived(e.target.checked)}
              className="rounded border-gray-300"
            />
            Show archived
          </label>
          <button onClick={handleCreate} className="btn btn-primary">
            Add Habit
          </button>
        </div>
      </div>

      {habits.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500">No habits yet. Create your first habit to get started!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {habits.map(habit => (
            <div
              key={habit.id}
              className={`card ${habit.archived ? 'opacity-60' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: habit.color }}
                  />
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {habit.name}
                      {habit.archived && (
                        <span className="ml-2 text-xs text-gray-400">(archived)</span>
                      )}
                    </h3>
                    {habit.description && (
                      <p className="text-sm text-gray-500">{habit.description}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">{frequencyLabel(habit)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(habit)}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Edit
                  </button>
                  {!habit.archived && (
                    <button
                      onClick={() => handleDelete(habit)}
                      className="text-sm text-red-500 hover:text-red-700"
                    >
                      Archive
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <HabitForm
          habit={editingHabit}
          onSubmit={handleFormSubmit}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
