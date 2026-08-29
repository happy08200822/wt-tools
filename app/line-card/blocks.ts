// 卡片是由一串「區塊」組成，模板只是預先組好的區塊清單，使用者可以在畫面上自由增刪調整

export type HeaderBlock = { id: string; type: 'header'; title: string };
export type HeroBlock = { id: string; type: 'hero'; imageUrl: string };
export type TextBlock = { id: string; type: 'text'; text: string };
export type InfoRowsBlock = { id: string; type: 'infoRows'; rows: { label: string; value: string }[] };
export type ItemListBlock = { id: string; type: 'itemList'; items: { name: string; price: string }[] };
export type SlotListBlock = { id: string; type: 'slotList'; slots: string[] };
// LINE 的 shareTargetPicker 送 Flex Message 時，按鈕動作只支援 uri（開連結），
// 放其他動作類型（例如 message）會導致整張卡片送出後「看起來成功、實際沒送到」且不報錯
export type ButtonStyle = 'primary' | 'secondary' | 'link';
export type ButtonAction = { type: 'uri'; label: string; url: string; style: ButtonStyle };
export type ButtonsBlock = { id: string; type: 'buttons'; buttons: ButtonAction[] };
export type FooterBlock = { id: string; type: 'footer'; text: string };

export type Block =
  | HeaderBlock
  | HeroBlock
  | TextBlock
  | InfoRowsBlock
  | ItemListBlock
  | SlotListBlock
  | ButtonsBlock
  | FooterBlock;

export const BLOCK_TYPE_LABEL: Record<Block['type'], string> = {
  header: '標題列',
  hero: '主圖',
  text: '文字段落',
  infoRows: '資訊列',
  itemList: '項目清單',
  slotList: '時段清單',
  buttons: '按鈕',
  footer: '落款',
};

export const BUTTON_STYLE_LABEL: Record<ButtonStyle, string> = {
  primary: '實心',
  secondary: '淺底',
  link: '純文字',
};

// 把主色和白色依比例混合，用來算漸層背景的淺色端、以及 secondary 按鈕的淺底色
export function lightenColor(hex: string, ratio: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const mix = (channel: number) => Math.round(channel + (255 - channel) * ratio);
  return `#${[mix(r), mix(g), mix(b)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

let idCounter = 0;
function newId() {
  idCounter += 1;
  return `b${Date.now()}${idCounter}`;
}

export function createBlock(type: Block['type']): Block {
  const id = newId();
  switch (type) {
    case 'header':
      return { id, type, title: '標題文字' };
    case 'hero':
      return { id, type, imageUrl: '' };
    case 'text':
      return { id, type, text: '這裡是文字內容' };
    case 'infoRows':
      return { id, type, rows: [{ label: '項目', value: '內容' }] };
    case 'itemList':
      return { id, type, items: [{ name: '項目名稱', price: '0' }] };
    case 'slotList':
      return { id, type, slots: [''] };
    case 'buttons':
      return { id, type, buttons: [{ type: 'uri', label: '按鈕文字', url: 'https://', style: 'primary' }] };
    case 'footer':
      return { id, type, text: '公司/品牌名稱' };
  }
}

export type Template = { id: string; label: string; description: string; blocks: () => Block[] };

export const TEMPLATES: Template[] = [
  {
    id: 'intro',
    label: '自我介紹',
    description: '第一次接觸客戶時的自我介紹卡片',
    blocks: () => [
      { id: newId(), type: 'header', title: '👋 您好，很高興認識您' },
      {
        id: newId(),
        type: 'text',
        text: '您好，我是暐庭，很高興能為您服務！如果有任何需求歡迎隨時與我聯繫～',
      },
      {
        id: newId(),
        type: 'infoRows',
        rows: [
          { label: '姓名', value: '暐庭' },
          { label: '公司', value: '' },
          { label: '聯絡方式', value: '' },
        ],
      },
      {
        id: newId(),
        type: 'buttons',
        buttons: [{ type: 'uri', label: '加我好友', url: 'https://line.me/ti/p/', style: 'primary' }],
      },
      { id: newId(), type: 'footer', text: '' },
    ],
  },
  {
    id: 'reminder',
    label: '前一天提醒',
    description: '約定前一天提醒對方的通知卡片',
    blocks: () => [
      { id: newId(), type: 'header', title: '⏰ 明日提醒' },
      {
        id: newId(),
        type: 'text',
        text: '提醒您，明天有約定的行程唷，請記得準時參加！',
      },
      {
        id: newId(),
        type: 'infoRows',
        rows: [
          { label: '時間', value: '' },
          { label: '地點/連結', value: '' },
        ],
      },
      {
        id: newId(),
        type: 'buttons',
        buttons: [{ type: 'uri', label: '查看詳情', url: 'https://', style: 'primary' }],
      },
      { id: newId(), type: 'footer', text: '' },
    ],
  },
  {
    id: 'quote',
    label: '報價單',
    description: '列出項目與金額的報價卡片',
    blocks: () => [
      { id: newId(), type: 'header', title: '💰 報價明細' },
      { id: newId(), type: 'text', text: '以下是為您準備的報價，如有疑問歡迎隨時詢問。' },
      {
        id: newId(),
        type: 'itemList',
        items: [
          { name: '項目一', price: '1000' },
          { name: '項目二', price: '2000' },
        ],
      },
      { id: newId(), type: 'text', text: '＊ 報價有效期限 7 天，實際費用依最終確認為準。' },
      {
        id: newId(),
        type: 'buttons',
        buttons: [{ type: 'uri', label: '確認訂購', url: 'https://', style: 'primary' }],
      },
      { id: newId(), type: 'footer', text: '' },
    ],
  },
  {
    id: 'availability',
    label: '邀約展示',
    description: '顯示目前有空的時段，邀請對方預約',
    blocks: () => [
      { id: newId(), type: 'header', title: '🗓️ 邀請您預約展示' },
      { id: newId(), type: 'text', text: '您好，以下是我目前可以安排展示的時段，歡迎挑選您方便的時間回覆我～' },
      {
        id: newId(),
        type: 'slotList',
        slots: ['8/30（五）14:00', '8/31（六）10:00', '9/1（日）16:00'],
      },
      {
        id: newId(),
        type: 'buttons',
        buttons: [{ type: 'uri', label: '回覆預約時段', url: 'https://', style: 'primary' }],
      },
      { id: newId(), type: 'footer', text: '' },
    ],
  },
  {
    id: 'blank',
    label: '空白卡片',
    description: '從空白開始，自己組區塊',
    blocks: () => [{ id: newId(), type: 'header', title: '標題文字' }],
  },
];

// LINE 的 uri action 要求是完整可用的網址（http/https/tel/mailto/line://），
// 光是 "https://" 這種沒有主機名稱的字串會被判定為無效，導致整張卡片發送失敗
const VALID_URI_PATTERN = /^(https?:\/\/[^\s/]+|tel:\S+|mailto:\S+|line:\/\/\S+)/i;

export function validateBlocks(blocks: Block[]): string | null {
  for (const block of blocks) {
    if (block.type === 'hero' && block.imageUrl.trim() && !/^https?:\/\//i.test(block.imageUrl.trim())) {
      return `主圖網址不是有效的 http(s) 連結：${block.imageUrl}`;
    }
    if (block.type !== 'buttons') continue;
    for (const btn of block.buttons) {
      if (!btn.label.trim()) continue; // 空按鈕會被自動忽略，不用檔
      if (!VALID_URI_PATTERN.test(btn.url.trim())) {
        return `按鈕「${btn.label}」的網址不完整或無效：${btn.url || '（空白）'}`;
      }
    }
  }
  return null;
}

// --- 把區塊組合轉成 LINE Flex Message bubble JSON ---

type FlexContent = Record<string, unknown>;

export function buildFlexBubble(blocks: Block[], accentColor: string): FlexContent {
  const bodyContents: FlexContent[] = [];

  for (const block of blocks) {
    if (block.type === 'header' || block.type === 'hero') continue; // 另外處理
    bodyContents.push(...blockToFlexContents(block, accentColor));
  }

  const header = blocks.find((b): b is HeaderBlock => b.type === 'header');
  const hero = blocks.find((b): b is HeroBlock => b.type === 'hero' && b.imageUrl.trim() !== '');

  return {
    type: 'bubble',
    ...(hero
      ? {
          hero: {
            type: 'image',
            url: hero.imageUrl.trim(),
            size: 'full',
            aspectRatio: '20:13',
            aspectMode: 'cover',
          },
        }
      : {}),
    ...(header
      ? {
          header: {
            type: 'box',
            layout: 'vertical',
            background: {
              type: 'linearGradient',
              angle: '135deg',
              startColor: accentColor,
              endColor: lightenColor(accentColor, 0.35),
            },
            paddingAll: '16px',
            contents: [
              {
                type: 'text',
                text: header.title || ' ',
                color: '#FFFFFF',
                weight: 'bold',
                size: 'lg',
                align: 'center',
                wrap: true,
              },
            ],
          },
        }
      : {}),
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'md',
      paddingAll: '18px',
      contents: bodyContents.length > 0 ? bodyContents : [{ type: 'text', text: ' ' }],
    },
  };
}

function blockToFlexContents(block: Block, accentColor: string): FlexContent[] {
  switch (block.type) {
    case 'text':
      if (!block.text.trim()) return [];
      return [{ type: 'text', text: block.text, wrap: true, size: 'sm', color: '#333333' }];

    case 'infoRows': {
      const rows = block.rows.filter((r) => r.label.trim() || r.value.trim());
      if (rows.length === 0) return [];
      return [
        {
          type: 'box',
          layout: 'vertical',
          backgroundColor: '#F7F8FA',
          cornerRadius: 'md',
          paddingAll: '12px',
          spacing: 'sm',
          contents: rows.map((r) => ({
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: r.label, size: 'sm', color: '#666666', flex: 2 },
              { type: 'text', text: r.value, size: 'sm', weight: 'bold', color: '#111111', flex: 5, wrap: true },
            ],
          })),
        },
      ];
    }

    case 'itemList': {
      const items = block.items.filter((i) => i.name.trim());
      if (items.length === 0) return [];
      const total = items.reduce((sum, i) => sum + (Number(i.price) || 0), 0);
      return [
        {
          type: 'box',
          layout: 'vertical',
          backgroundColor: '#F7F8FA',
          cornerRadius: 'md',
          paddingAll: '12px',
          spacing: 'sm',
          contents: [
            ...items.map((i) => ({
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: i.name, size: 'sm', color: '#333333', flex: 4, wrap: true },
                {
                  type: 'text',
                  text: `$${(Number(i.price) || 0).toLocaleString()}`,
                  size: 'sm',
                  color: '#333333',
                  flex: 2,
                  align: 'end',
                },
              ],
            })),
            { type: 'separator', margin: 'sm' },
            {
              type: 'box',
              layout: 'horizontal',
              margin: 'sm',
              contents: [
                { type: 'text', text: '總計', size: 'sm', weight: 'bold', color: '#111111', flex: 4 },
                {
                  type: 'text',
                  text: `$${total.toLocaleString()}`,
                  size: 'sm',
                  weight: 'bold',
                  color: accentColor,
                  flex: 2,
                  align: 'end',
                },
              ],
            },
          ],
        },
      ];
    }

    case 'slotList': {
      const slots = block.slots.filter((s) => s.trim());
      if (slots.length === 0) return [];
      return [
        {
          type: 'box',
          layout: 'vertical',
          spacing: 'xs',
          contents: slots.map((s) => ({
            type: 'box',
            layout: 'horizontal',
            backgroundColor: '#F7F8FA',
            cornerRadius: 'md',
            paddingAll: '10px',
            contents: [{ type: 'text', text: `🕒 ${s}`, size: 'sm', color: '#333333' }],
          })),
        },
      ];
    }

    case 'buttons': {
      const buttons = block.buttons.filter((b) => b.label.trim() && b.url.trim());
      if (buttons.length === 0) return [];
      return [
        {
          type: 'box',
          layout: buttons.length > 1 ? 'horizontal' : 'vertical',
          spacing: 'md',
          margin: 'md',
          contents: buttons.map((b) => ({
            type: 'button',
            action: { type: 'uri', label: b.label, uri: b.url },
            style: b.style,
            color: b.style === 'secondary' ? lightenColor(accentColor, 0.85) : accentColor,
            height: 'sm',
          })),
        },
      ];
    }

    case 'footer':
      if (!block.text.trim()) return [];
      return [
        { type: 'separator', margin: 'lg' },
        { type: 'text', text: block.text, align: 'center', size: 'xs', color: '#AAAAAA', margin: 'md' },
      ];

    default:
      return [];
  }
}
