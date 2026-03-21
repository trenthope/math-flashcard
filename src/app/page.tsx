'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/store/userStore';

const TAG_COLORS = [
  { bg: 'bg-red-500', hover: 'hover:bg-red-600', ring: 'ring-red-300', light: 'bg-red-100', text: 'text-red-700' },
  { bg: 'bg-blue-500', hover: 'hover:bg-blue-600', ring: 'ring-blue-300', light: 'bg-blue-100', text: 'text-blue-700' },
  { bg: 'bg-green-500', hover: 'hover:bg-green-600', ring: 'ring-green-300', light: 'bg-green-100', text: 'text-green-700' },
  { bg: 'bg-yellow-500', hover: 'hover:bg-yellow-600', ring: 'ring-yellow-300', light: 'bg-yellow-100', text: 'text-yellow-700' },
  { bg: 'bg-purple-500', hover: 'hover:bg-purple-600', ring: 'ring-purple-300', light: 'bg-purple-100', text: 'text-purple-700' },
  { bg: 'bg-orange-500', hover: 'hover:bg-orange-600', ring: 'ring-orange-300', light: 'bg-orange-100', text: 'text-orange-700' },
];

function getColor(index: number) {
  return TAG_COLORS[index % TAG_COLORS.length];
}

export default function WhoIsPlayingPage() {
  const router = useRouter();
  const { users, addUser, selectUser, renameUser, deleteUser } = useUserStore();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleSelect = (id: string) => {
    if (editingId) return;
    selectUser(id);
    router.push('/settings');
  };

  const handleAdd = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const user = addUser(trimmed);
    setName('');
    setAdding(false);
    selectUser(user.id);
    router.push('/settings');
  };

  const startEdit = (id: string, currentName: string) => {
    setEditingId(id);
    setEditName(currentName);
  };

  const saveEdit = () => {
    if (!editingId) return;
    const trimmed = editName.trim();
    if (trimmed) {
      renameUser(editingId, trimmed);
    }
    setEditingId(null);
    setEditName('');
  };

  const handleDelete = (id: string, userName: string) => {
    if (window.confirm(`Delete ${userName}? Their history will remain but they won't appear here.`)) {
      deleteUser(id);
      if (editingId === id) {
        setEditingId(null);
        setEditName('');
      }
    }
  };

  return (
    <main className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-5xl font-bold text-gray-800" style={{ fontFamily: "'Fredoka', sans-serif" }}>
            Who&rsquo;s Playing? &#x1F3C6;
          </h1>
          <p className="text-lg text-gray-500 font-semibold">Pick your name to start!</p>
        </div>

        {/* Existing users */}
        <div className="grid gap-4">
          {users.map((u, i) => {
            const c = getColor(i);
            return (
              <div
                key={u.id}
                className={`group w-full flex items-center gap-4 bg-white border-3 border-gray-200 hover:border-gray-300 rounded-3xl px-5 py-4 transition-all duration-200 shadow-md hover:shadow-lg`}
              >
                <button
                  onClick={() => handleSelect(u.id)}
                  className="flex items-center gap-4 flex-1 min-w-0 text-left"
                >
                  <div className={`w-16 h-16 rounded-2xl ${c.bg} flex items-center justify-center shrink-0 shadow-lg group-hover:scale-105 transition-transform duration-200`}>
                    <span className="text-3xl font-bold text-white" style={{ fontFamily: "'Fredoka', sans-serif" }}>
                      {u.name.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  {editingId === u.id ? (
                    <input
                      autoFocus
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit();
                        if (e.key === 'Escape') { setEditingId(null); setEditName(''); }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="text-xl font-bold bg-gray-50 border-2 border-blue-300 text-gray-800 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all min-w-0 flex-1"
                      style={{ fontFamily: "'Fredoka', sans-serif" }}
                    />
                  ) : (
                    <span className="text-2xl font-bold text-gray-800 truncate" style={{ fontFamily: "'Fredoka', sans-serif" }}>
                      {u.name}
                    </span>
                  )}
                </button>

                {/* Action buttons */}
                <div className="flex items-center gap-1 shrink-0">
                  {editingId === u.id ? (
                    <>
                      <button
                        onClick={() => saveEdit()}
                        className="p-2 text-green-600 hover:bg-green-100 rounded-xl transition-all"
                        title="Save"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                          <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                        </svg>
                      </button>
                      <button
                        onClick={() => { setEditingId(null); setEditName(''); }}
                        className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl transition-all"
                        title="Cancel"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                          <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                        </svg>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); startEdit(u.id, u.name); }}
                        className="p-2 text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                        title="Edit name"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                          <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(u.id, u.name); }}
                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                        title="Delete player"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                          <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.519.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Add player */}
        {adding ? (
          <div className="bg-white rounded-3xl border-3 border-blue-300 p-6 space-y-4 shadow-lg">
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="Type your name..."
              className="w-full text-xl bg-blue-50 border-2 border-blue-200 text-gray-800 placeholder-gray-400 rounded-2xl px-5 py-4 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-all font-bold"
              style={{ fontFamily: "'Fredoka', sans-serif" }}
            />
            <div className="flex gap-3">
              <button
                onClick={handleAdd}
                disabled={!name.trim()}
                className="flex-1 bg-green-500 hover:bg-green-600 disabled:opacity-40 text-white font-bold py-3.5 rounded-2xl transition-all duration-200 shadow-lg text-lg"
                style={{ fontFamily: "'Fredoka', sans-serif" }}
              >
                Let&rsquo;s Go! &#x1F680;
              </button>
              <button
                onClick={() => { setAdding(false); setName(''); }}
                className="px-5 py-3.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-2xl transition-all font-bold"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="w-full border-3 border-dashed border-gray-300 hover:border-blue-400 rounded-3xl px-6 py-7 text-gray-400 hover:text-blue-500 font-bold text-xl transition-all duration-200 hover:bg-blue-50/50"
            style={{ fontFamily: "'Fredoka', sans-serif" }}
          >
            + Add Player
          </button>
        )}
      </div>
    </main>
  );
}
