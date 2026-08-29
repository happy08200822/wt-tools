'use client';

import { useState } from 'react';

type UserUsage = {
  code: string;
  name: string;
  count: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
};

type LogEntry = {
  code: string;
  name: string;
  time: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
};

type ContractUserStat = {
  userId: string;
  name: string;
  email?: string;
  count: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
};

type ContractLogEntry = {
  _id: string;
  fileName: string;
  riskLevel: 'low' | 'medium' | 'high';
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  createdAt: string;
  user?: { name: string; email: string } | null;
};

export default function RichMenuAdminPage() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [users, setUsers] = useState<UserUsage[] | null>(null);
  const [log, setLog] = useState<LogEntry[] | null>(null);
  const [contractUsers, setContractUsers] = useState<ContractUserStat[] | null>(null);
  const [contractLog, setContractLog] = useState<ContractLogEntry[] | null>(null);

  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [savingUser, setSavingUser] = useState(false);
  const [userError, setUserError] = useState('');

  async function callAdmin(extra: Record<string, unknown> = {}) {
    const res = await fetch('/api/richmenu/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, ...extra }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '操作失敗');
    return data as {
      users: UserUsage[];
      log: LogEntry[];
      contracts: { byUser: ContractUserStat[]; recent: ContractLogEntry[] };
    };
  }

  async function handleLoad() {
    setLoading(true);
    setError('');
    try {
      const data = await callAdmin();
      setUsers(data.users);
      setLog(data.log);
      setContractUsers(data.contracts.byUser);
      setContractLog(data.contracts.recent);
    } catch (err) {
      setError(err instanceof Error ? err.message : '讀取失敗');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddUser() {
    if (!newCode.trim() || !newName.trim()) return;
    setSavingUser(true);
    setUserError('');
    try {
      const data = await callAdmin({ action: 'addUser', code: newCode.trim(), name: newName.trim() });
      setUsers(data.users);
      setLog(data.log);
      setNewCode('');
      setNewName('');
    } catch (err) {
      setUserError(err instanceof Error ? err.message : '新增失敗');
    } finally {
      setSavingUser(false);
    }
  }

  async function handleRemoveUser(code: string) {
    setSavingUser(true);
    setUserError('');
    try {
      const data = await callAdmin({ action: 'removeUser', code });
      setUsers(data.users);
      setLog(data.log);
    } catch (err) {
      setUserError(err instanceof Error ? err.message : '移除失敗');
    } finally {
      setSavingUser(false);
    }
  }

  const totalCost = users?.reduce((sum, u) => sum + u.costUsd, 0) ?? 0;
  const totalCount = users?.reduce((sum, u) => sum + u.count, 0) ?? 0;

  return (
    <main className="min-h-screen flex flex-col items-center gap-6 p-8 bg-slate-100">
      <h1 className="text-2xl font-extrabold text-slate-800 mt-4">AI 用量報表</h1>

      <div className="flex gap-2 w-full max-w-md">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleLoad()}
          placeholder="管理密碼"
          className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-black text-sm outline-none focus:ring-2 focus:ring-slate-400 bg-white"
        />
        <button
          onClick={handleLoad}
          disabled={loading}
          className="px-5 py-2 rounded-lg bg-slate-800 disabled:bg-slate-400 text-white text-sm font-semibold"
        >
          {loading ? '查詢中...' : '查詢'}
        </button>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {users && (
        <div className="w-full max-w-3xl bg-white rounded-2xl shadow p-5 flex flex-col gap-3">
          <p className="text-sm font-semibold text-slate-600">新增使用者</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              placeholder="密碼"
              className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-black text-sm outline-none focus:ring-2 focus:ring-slate-400"
            />
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="姓名/店名"
              className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-black text-sm outline-none focus:ring-2 focus:ring-slate-400"
            />
            <button
              onClick={handleAddUser}
              disabled={savingUser || !newCode.trim() || !newName.trim()}
              className="px-5 py-2 rounded-lg bg-emerald-600 disabled:bg-slate-300 text-white text-sm font-semibold whitespace-nowrap"
            >
              {savingUser ? '處理中...' : '新增'}
            </button>
          </div>
          {userError && <p className="text-red-500 text-xs">{userError}</p>}

          <p className="text-sm text-slate-500 border-t border-slate-100 pt-3">
            總計：{totalCount} 張圖 ・ ${totalCost.toFixed(4)} USD（約 NT${(totalCost * 31.5).toFixed(1)}）
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="text-slate-400 border-b border-slate-200">
                  <th className="py-2 pr-4">姓名/店名</th>
                  <th className="py-2 pr-4">密碼</th>
                  <th className="py-2 pr-4">生成張數</th>
                  <th className="py-2 pr-4">Input tokens</th>
                  <th className="py-2 pr-4">Output tokens</th>
                  <th className="py-2 pr-4">花費 (USD)</th>
                  <th className="py-2 pr-4">花費 (約 NT$)</th>
                  <th className="py-2 pr-4"></th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-4 text-center text-slate-400">
                      目前沒有任何使用者，用上面的表單新增第一個吧
                    </td>
                  </tr>
                )}
                {users.map((u) => (
                  <tr key={u.code} className="border-b border-slate-100">
                    <td className="py-2 pr-4 font-semibold text-slate-800">{u.name}</td>
                    <td className="py-2 pr-4 text-slate-500">{u.code}</td>
                    <td className="py-2 pr-4 text-slate-700">{u.count}</td>
                    <td className="py-2 pr-4 text-slate-700">{u.inputTokens.toLocaleString()}</td>
                    <td className="py-2 pr-4 text-slate-700">{u.outputTokens.toLocaleString()}</td>
                    <td className="py-2 pr-4 text-slate-700">${u.costUsd.toFixed(4)}</td>
                    <td className="py-2 pr-4 text-slate-700">NT${(u.costUsd * 31.5).toFixed(1)}</td>
                    <td className="py-2 pr-4">
                      <button
                        onClick={() => handleRemoveUser(u.code)}
                        disabled={savingUser}
                        className="text-xs font-semibold text-red-500 hover:text-red-600"
                      >
                        移除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {log && log.length > 0 && (
        <div className="w-full max-w-3xl bg-white rounded-2xl shadow p-5 flex flex-col gap-3">
          <p className="text-sm font-semibold text-slate-600">最近生成紀錄（最多 50 筆）</p>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="text-slate-400 border-b border-slate-200">
                  <th className="py-1.5 pr-3">時間</th>
                  <th className="py-1.5 pr-3">姓名</th>
                  <th className="py-1.5 pr-3">Tokens (in/out)</th>
                  <th className="py-1.5 pr-3">花費</th>
                </tr>
              </thead>
              <tbody>
                {log.map((l, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="py-1.5 pr-3 text-slate-500">
                      {new Date(l.time).toLocaleString('zh-TW')}
                    </td>
                    <td className="py-1.5 pr-3 text-slate-800 font-medium">{l.name}</td>
                    <td className="py-1.5 pr-3 text-slate-700">
                      {l.inputTokens.toLocaleString()} / {l.outputTokens.toLocaleString()}
                    </td>
                    <td className="py-1.5 pr-3 text-slate-700">${l.costUsd.toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {contractUsers && (
        <div className="w-full max-w-3xl bg-white rounded-2xl shadow p-5 flex flex-col gap-3">
          <p className="text-sm font-semibold text-slate-600">AI 合約審查花費（依使用者）</p>
          {(() => {
            const totalContractCost = contractUsers.reduce((sum, u) => sum + u.costUsd, 0);
            const totalContractCount = contractUsers.reduce((sum, u) => sum + u.count, 0);
            return (
              <p className="text-sm text-slate-500">
                總計：{totalContractCount} 份合約 ・ ${totalContractCost.toFixed(4)} USD（約 NT
                {(totalContractCost * 31.5).toFixed(1)}）
              </p>
            );
          })()}
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="text-slate-400 border-b border-slate-200">
                  <th className="py-2 pr-4">使用者</th>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">審查份數</th>
                  <th className="py-2 pr-4">Input tokens</th>
                  <th className="py-2 pr-4">Output tokens</th>
                  <th className="py-2 pr-4">花費 (USD)</th>
                  <th className="py-2 pr-4">花費 (約 NT$)</th>
                </tr>
              </thead>
              <tbody>
                {contractUsers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-4 text-center text-slate-400">
                      目前還沒有任何合約審查紀錄
                    </td>
                  </tr>
                )}
                {contractUsers.map((u) => (
                  <tr key={u.userId} className="border-b border-slate-100">
                    <td className="py-2 pr-4 font-semibold text-slate-800">{u.name}</td>
                    <td className="py-2 pr-4 text-slate-500">{u.email ?? '-'}</td>
                    <td className="py-2 pr-4 text-slate-700">{u.count}</td>
                    <td className="py-2 pr-4 text-slate-700">{u.inputTokens.toLocaleString()}</td>
                    <td className="py-2 pr-4 text-slate-700">{u.outputTokens.toLocaleString()}</td>
                    <td className="py-2 pr-4 text-slate-700">${u.costUsd.toFixed(4)}</td>
                    <td className="py-2 pr-4 text-slate-700">NT${(u.costUsd * 31.5).toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {contractLog && contractLog.length > 0 && (
        <div className="w-full max-w-3xl bg-white rounded-2xl shadow p-5 flex flex-col gap-3">
          <p className="text-sm font-semibold text-slate-600">最近合約審查紀錄（最多 50 筆）</p>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="text-slate-400 border-b border-slate-200">
                  <th className="py-1.5 pr-3">時間</th>
                  <th className="py-1.5 pr-3">使用者</th>
                  <th className="py-1.5 pr-3">檔名</th>
                  <th className="py-1.5 pr-3">風險</th>
                  <th className="py-1.5 pr-3">Tokens (in/out)</th>
                  <th className="py-1.5 pr-3">花費</th>
                </tr>
              </thead>
              <tbody>
                {contractLog.map((l) => (
                  <tr key={l._id} className="border-b border-slate-100">
                    <td className="py-1.5 pr-3 text-slate-500">
                      {new Date(l.createdAt).toLocaleString('zh-TW')}
                    </td>
                    <td className="py-1.5 pr-3 text-slate-800 font-medium">
                      {l.user?.name ?? '（已刪除）'}
                    </td>
                    <td className="py-1.5 pr-3 text-slate-600 truncate max-w-[160px]">{l.fileName}</td>
                    <td className="py-1.5 pr-3 text-slate-700">{l.riskLevel}</td>
                    <td className="py-1.5 pr-3 text-slate-700">
                      {l.inputTokens.toLocaleString()} / {l.outputTokens.toLocaleString()}
                    </td>
                    <td className="py-1.5 pr-3 text-slate-700">${l.costUsd.toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}
