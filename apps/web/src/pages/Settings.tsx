import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Settings() {
  const { user, logout } = useAuth();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <div className="space-y-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-500">Name</label>
            <p className="text-gray-900">{user?.name}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">Email</label>
            <p className="text-gray-900">{user?.email}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">Member since</label>
            <p className="text-gray-900">
              {user?.createdAt
                ? new Date(user.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                : '-'}
            </p>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Account</h2>
        <div className="space-y-4">
          <button onClick={logout} className="btn btn-secondary">
            Sign out
          </button>
        </div>
      </div>

      <div className="card border-red-200">
        <h2 className="text-lg font-semibold text-red-600 mb-4">Danger Zone</h2>
        <p className="text-sm text-gray-600 mb-4">
          Once you delete your account, there is no going back. Please be certain.
        </p>
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="btn btn-danger"
          >
            Delete Account
          </button>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-red-600 font-medium">
              Are you sure? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // TODO: Implement account deletion
                  alert('Account deletion not implemented yet');
                }}
                className="btn btn-danger"
              >
                Yes, delete my account
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
