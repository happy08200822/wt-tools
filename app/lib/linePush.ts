// 用 LINE Messaging API 推播文字訊息給指定的 lineUserId（對方必須已加官方帳號好友）
export async function pushLineMessage(lineUserId: string, text: string): Promise<void> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return; // 沒設定就靜默略過，不影響呼叫端的主要流程（例如記錄瀏覽紀錄）

  try {
    await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to: lineUserId,
        messages: [{ type: 'text', text }],
      }),
    });
  } catch {
    // 推播失敗不應該讓客戶端的追蹤紀錄請求跟著失敗
  }
}
