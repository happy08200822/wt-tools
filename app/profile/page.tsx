'use client';

import { useEffect, useState } from 'react';

type Profile = { name: string; email: string; image?: string; role: 'admin' | 'user' };

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/profile')
      .then((res) => res.json())
      .then((data) => setProfile(data))
      .catch(() => setError('讀取個人資料失敗'))
      .finally(() => setLoading(false));
  }, []);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setError('');
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error || '上傳失敗');

      const patchRes = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: uploadData.url }),
      });
      const patchData = await patchRes.json();
      if (!patchRes.ok) throw new Error(patchData.error || '更新失敗');

      setProfile(patchData);
    } catch (err) {
      setError(err instanceof Error ? err.message : '上傳失敗');
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-200 via-cyan-400 to-teal-700">
        <p className="text-white font-semibold">讀取中...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 p-8 bg-gradient-to-br from-teal-200 via-cyan-400 to-teal-700">
      <div className="flex flex-col items-center gap-1">
        <h1
          className="text-4xl md:text-5xl font-extrabold text-white tracking-wide"
          style={{ textShadow: '0 2px 6px rgba(0,0,0,0.25), 0 0 24px rgba(255,255,255,0.5)' }}
        >
          個人資料
        </h1>
      </div>

      <div className="flex flex-col items-center gap-5 w-full max-w-sm bg-white/95 backdrop-blur rounded-3xl p-6 sm:p-8 shadow-2xl">
        <div className="relative">
          {profile?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.image}
              alt="大頭照"
              className="h-28 w-28 rounded-full object-cover border-4 border-teal-100 shadow"
            />
          ) : (
            <div className="h-28 w-28 rounded-full bg-teal-100 flex items-center justify-center text-3xl font-bold text-teal-600 border-4 border-teal-100">
              {profile?.name?.[0] ?? '?'}
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
              <span className="h-5 w-5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
            </div>
          )}
        </div>

        <div className="text-center">
          <p className="text-lg font-bold text-gray-800">{profile?.name}</p>
          <p className="text-sm text-gray-500">{profile?.email}</p>
        </div>

        <label className="w-full">
          <input type="file" accept="image/*" onChange={handleFileChange} disabled={uploading} className="hidden" />
          <span className="block text-center w-full px-6 py-2.5 rounded-full bg-teal-600 text-white font-semibold text-sm shadow hover:bg-teal-700 transition-colors cursor-pointer">
            {uploading ? '上傳中...' : '更換大頭照'}
          </span>
        </label>

        {error && <p className="text-center text-red-500 text-sm">{error}</p>}
      </div>
    </main>
  );
}
