import { useState } from 'react';
import type { Habit, Frequency } from '@habit-tracker/shared';

interface HabitFormProps {
  habit: Habit | null;
  onSubmit: (data: any) => void;
  onClose: () => void;
}

const COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#06b6d4', '#3b82f6',
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function HabitForm({ habit, onSubmit, onClose }: HabitFormProps) {
  const [name, setName] = useState(habit?.name || '');
  const [description, setDescription] = useState(habit?.description || '');
  const [color, setColor] = useState(habit?.color || COLORS[0]);
  const [frequency, setFrequency] = useState<Frequency>(habit?.frequency || 'DAILY');
  const [customDays, setCustomDays] = useState<number[]>(habit?.customDays || []);
  const [targetPerWeek, setTargetPerWeek] = useState(habit?.targetPerWeek || 3);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const data: any = {
      name,
      description: description || undefined,
      color,
      frequency,
    };

    if (frequency === 'CUSTOM') {
      data.customDays = customDays;
    } else if (frequency === 'WEEKLY') {
      data.targetPerWeek = targetPerWeek;
    }

    await onSubmit(data);
    setLoading(false);
  };

  const toggleDay = (day: number) => {
    if (customDays.includes(day)) {
      setCustomDays(customDays.filter(d => d !== day));
    } else {
      setCustomDays([...customDays, day].sort());
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {habit ? 'Edit Habit' : 'Create Habit'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                maxLength={100}
                className="input"
                placeholder="e.g., Exercise, Read, Meditate"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (optional)
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                maxLength={500}
                rows={2}
                className="input"
                placeholder="Add a description..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Color
              </label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded-full transition-transform ${
                      color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Frequency
              </label>
              <div className="flex gap-2">
                {(['DAILY', 'WEEKLY', 'CUSTOM'] as Frequency[]).map(f => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFrequency(f)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      frequency === f
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {f === 'DAILY' ? 'Daily' : f === 'WEEKLY' ? 'Weekly' : 'Custom'}
                  </button>
                ))}
              </div>
            </div>

            {frequency === 'WEEKLY' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Times per week
                </label>
                <input
                  type="number"
                  value={targetPerWeek}
                  onChange={e => setTargetPerWeek(parseInt(e.target.value) || 1)}
                  min={1}
                  max={7}
                  className="input w-24"
                />
              </div>
            )}

            {frequency === 'CUSTOM' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select days
                </label>
                <div className="flex gap-2">
                  {DAYS.map((day, index) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(index)}
                      className={`w-10 h-10 rounded-full text-sm font-medium transition-colors ${
                        customDays.includes(index)
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {day[0]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !name.trim()}
                className="btn btn-primary flex-1"
              >
                {loading ? 'Saving...' : habit ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
