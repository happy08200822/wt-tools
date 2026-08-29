'use client';

import { useEffect, useState } from 'react';

type UserOption = { _id: string; name: string; email: string };

type PostItem = {
  _id: string;
  user: { _id: string; name: string; email: string } | null;
  content: string;
  createdAt: string;
};

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return '剛剛';
  if (minutes < 60) return `${minutes} 分鐘前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小時前`;
  const days = Math.floor(hours / 24);
  return `${days} 天前`;
}

export default function BoardPage() {
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [anonymous, setAnonymous] = useState(false);

  useEffect(() => {
    fetch('/api/users')
      .then((res) => res.json())
      .then((data: UserOption[]) => {
        setUsers(data);
        if (data.length > 0) setSelectedUserId(data[0]._id);
      })
      .catch(() => setError('讀取使用者清單失敗'));
  }, []);

  async function loadPosts() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/posts');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '讀取失敗');
      setPosts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '讀取失敗');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPosts();
  }, []);

  async function handlePost() {
    if ((!anonymous && !selectedUserId) || !content.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: anonymous ? null : selectedUserId,
          content: content.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '發表失敗');
      setContent('');
      await loadPosts();
    } catch (err) {
      setError(err instanceof Error ? err.message : '發表失敗');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    setError('');
    try {
      const res = await fetch(`/api/posts/${id}?userId=${selectedUserId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '刪除失敗');
      await loadPosts();
    } catch (err) {
      setError(err instanceof Error ? err.message : '刪除失敗');
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center gap-6 p-8 bg-gradient-to-br from-sky-200 via-blue-400 to-sky-700">
      <div className="flex flex-col items-center gap-1 mt-4">
        <h1
          className="text-4xl md:text-5xl font-extrabold text-white tracking-wide"
          style={{ textShadow: '0 2px 6px rgba(0,0,0,0.25), 0 0 24px rgba(255,255,255,0.5)' }}
        >
          留言板
        </h1>
        <p className="text-white text-sm font-semibold" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.45)' }}>
          選擇身份，發表你的想法
        </p>
      </div>

      <div className="w-full max-w-2xl bg-white/95 backdrop-blur rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-xs font-semibold text-gray-600">
          目前身份
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-black text-sm outline-none focus:ring-2 focus:ring-sky-400 bg-white"
          >
            {users.length === 0 && <option value="">目前沒有使用者</option>}
            {users.map((u) => (
              <option key={u._id} value={u._id}>
                {u.name}（{u.email}）
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-col gap-2">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            placeholder="想說點什麼？"
            className="border border-gray-300 rounded-lg px-3 py-2 text-black text-sm outline-none focus:ring-2 focus:ring-sky-400 resize-none"
          />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={anonymous}
                onChange={(e) => setAnonymous(e.target.checked)}
              />
              匿名發表（發表後任何人都無法刪除）
            </label>
            <button
              onClick={handlePost}
              disabled={submitting || (!anonymous && !selectedUserId) || !content.trim()}
              className="px-6 py-2 rounded-full bg-sky-600 disabled:bg-gray-300 text-white font-bold shadow hover:bg-sky-700 transition-colors"
            >
              {submitting ? '發表中...' : '發表'}
            </button>
          </div>
        </div>

        {error && <p className="text-center text-red-500 text-sm">{error}</p>}
      </div>

      <div className="w-full max-w-2xl flex flex-col gap-3">
        {loading && <p className="text-center text-white text-sm">讀取中...</p>}
        {!loading && posts.length === 0 && (
          <p className="text-center text-white/80 text-sm py-6">目前還沒有任何文章</p>
        )}
        {posts.map((post) => (
          <div key={post._id} className="bg-white/95 backdrop-blur rounded-2xl p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <p className={`text-sm font-bold ${post.user ? 'text-gray-800' : 'text-gray-400 italic'}`}>
                {post.user ? post.user.name : '匿名'}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{timeAgo(post.createdAt)}</span>
                {post.user && post.user._id === selectedUserId && (
                  <button
                    onClick={() => handleDelete(post._id)}
                    className="text-xs font-semibold text-red-500 hover:text-red-600"
                  >
                    刪除
                  </button>
                )}
              </div>
            </div>
            <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap break-words">{post.content}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
