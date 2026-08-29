// 卡片是由一串「區塊」組成，模板只是預先組好的區塊清單，使用者可以在畫面上自由增刪調整

export type HeaderBlock = { id: string; type: 'header'; title: string };
export type HeroBlock = { id: string; type: 'hero'; imageUrl: string };
export type TextBlock = { id: string; type: 'text'; text: string };
export type InfoRowsBlock = { id: string; type: 'infoRows'; rows: { label: string; value: string }[] };
export type ItemListBlock = { id: string; type: 'itemList'; items: { name: string; price: string }[] };
export type Plan = { title: string; badge: string; price: string; details: string[]; highlight: boolean };
// hidden：卡片本身跟預覽都不會顯示，只用來提供內容給「專屬報價追蹤連結」按鈕使用
export type PlanListBlock = { id: string; type: 'planList'; plans: Plan[]; hidden: boolean };
export type SlotListBlock = { id: string; type: 'slotList'; slots: string[] };
// LINE 的 shareTargetPicker 送 Flex Message 時，按鈕動作只支援 uri（開連結），
// 放其他動作類型（例如 message）會導致整張卡片送出後「看起來成功、實際沒送到」且不報錯
export type ButtonStyle = 'primary' | 'secondary' | 'link';
// linkType 'quoteLead'：網址不是使用者手動輸入，而是發送時系統自動產生的專屬報價追蹤連結
export type ButtonAction = {
  type: 'uri';
  label: string;
  url: string;
  style: ButtonStyle;
  linkType?: 'custom' | 'quoteLead';
};
export type ButtonsBlock = { id: string; type: 'buttons'; buttons: ButtonAction[] };
export type FooterBlock = { id: string; type: 'footer'; text: string };
// 內容太長時，插入這個區塊可以把卡片拆成兩張左右滑動的輪播卡片；標題列/落款每頁都會重複顯示，主圖只出現在第一頁
export type PageBreakBlock = { id: string; type: 'pageBreak' };

export type Block =
  | HeaderBlock
  | HeroBlock
  | TextBlock
  | InfoRowsBlock
  | ItemListBlock
  | PlanListBlock
  | SlotListBlock
  | ButtonsBlock
  | FooterBlock
  | PageBreakBlock;

export const BLOCK_TYPE_LABEL: Record<Block['type'], string> = {
  header: '標題列',
  hero: '主圖',
  text: '文字段落',
  infoRows: '資訊列',
  itemList: '項目清單',
  planList: '方案清單',
  slotList: '時段清單',
  buttons: '按鈕',
  footer: '落款',
  pageBreak: '分頁符',
};

// 每種區塊類型的識別色，用在區塊卡片左側色條，方便在一長串區塊裡快速分辨
export const BLOCK_TYPE_COLOR: Record<Block['type'], string> = {
  header: '#475569',
  hero: '#8B5CF6',
  text: '#3B82F6',
  infoRows: '#14B8A6',
  itemList: '#F59E0B',
  planList: '#10B981',
  slotList: '#06B6D4',
  buttons: '#F43F5E',
  footer: '#94A3B8',
  pageBreak: '#D946EF',
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
    case 'planList':
      return {
        id,
        type,
        plans: [{ title: '方案名稱', badge: '', price: '$0', details: ['方案內容'], highlight: false }],
        hidden: false,
      };
    case 'slotList':
      return { id, type, slots: [''] };
    case 'buttons':
      return { id, type, buttons: [{ type: 'uri', label: '按鈕文字', url: 'https://', style: 'primary' }] };
    case 'footer':
      return { id, type, text: '公司/品牌名稱' };
    case 'pageBreak':
      return { id, type };
  }
}

export type Template = { id: string; label: string; description: string; blocks: () => Block[] };

export const TEMPLATES: Template[] = [
  {
    id: 'intro',
    label: '自我介紹',
    description: '第一次接觸客戶時的自我介紹卡片',
    blocks: () => [
      { id: newId(), type: 'header', title: '👋 哈囉您好！' },
      { id: newId(), type: 'hero', imageUrl: '' },
      {
        id: newId(),
        type: 'text',
        text: '我是 ezPretty 的業務 暐庭，看到您留下的資料，想簡單了解一下您目前的需求，方便跟您聊聊嗎？😊',
      },
      {
        id: newId(),
        type: 'infoRows',
        rows: [
          { label: '姓名', value: '黃暐庭 Wei' },
          { label: '公司', value: '預的科技行銷股份有限公司' },
          { label: '聯絡方式', value: '0985 009 294' },
        ],
      },
      {
        id: newId(),
        type: 'buttons',
        buttons: [{ type: 'uri', label: '加我好友', url: 'https://line.me/ti/p/', style: 'primary' }],
      },
      { id: newId(), type: 'footer', text: 'ezPretty 預約科技' },
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
    description: '列出方案與金額的報價卡片',
    blocks: () => [
      { id: newId(), type: 'header', title: '💰 報價方案' },
      {
        id: newId(),
        type: 'text',
        text: '老師您好！感謝您撥空聆聽我們的線上展示☕\n以下提供 ezPretty 預約系統報價給您做參考',
      },
      {
        id: newId(),
        type: 'planList',
        plans: [
          {
            title: '一年方案',
            badge: '',
            price: '$24,000',
            details: ['18,000 + 6,000（設定費）', '使用人數：1人＋贈2人，共3人'],
            highlight: false,
          },
          {
            title: '優惠兩年方案',
            badge: '免設定費',
            price: '$36,000',
            details: ['使用人數：1人＋贈2人，共3人', '現省 $6,000 設定費'],
            highlight: false,
          },
          {
            title: '優惠三年方案',
            badge: '最推薦',
            price: '$50,400',
            details: ['免設定費、月費 -100', '使用人數：1人＋贈2人，共3人', '現省 $6,000 設定費、$3,600 月費'],
            highlight: true,
          },
        ],
        hidden: false,
      },
      {
        id: newId(),
        type: 'text',
        text: '如果本月決定簽約的話，再多送您 3 個月（價值 $4,500）😌\n之後政府補助開放申請，可先登記排隊，申請通過後再贈送一年🎁',
      },
      {
        id: newId(),
        type: 'buttons',
        buttons: [{ type: 'uri', label: '確認訂購', url: 'https://', style: 'primary' }],
      },
      { id: newId(), type: 'footer', text: 'ezPretty 預約科技' },
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
    id: 'demoConfirm',
    label: '展示確認',
    description: '線上展示預約成功的確認卡片',
    blocks: () => [
      { id: newId(), type: 'header', title: '🗓️ 線上展示預約成功' },
      { id: newId(), type: 'text', text: '親愛的老闆您好，已為您安排線上展示' },
      {
        id: newId(),
        type: 'infoRows',
        rows: [
          { label: '🕐 時間', value: '' },
          { label: '👤 業務', value: '' },
        ],
      },
      {
        id: newId(),
        type: 'text',
        text: '📝 建議設備：\n建議使用電腦或平板參與，畫面較大且字體清晰，能獲得最佳展示體驗唷！將於展示前 5 分鐘發送會議連結，請留意訊息唷！',
      },
      {
        id: newId(),
        type: 'text',
        text: '💡 重要提醒：\n若您預計使用手機參與，請先下載 Google Meet App，以確保連結能順利開啟唷！\n⬇️ 下方按鈕點擊可直接下載唷 ⬇️',
      },
      {
        id: newId(),
        type: 'buttons',
        buttons: [
          {
            type: 'uri',
            label: 'iOS 下載',
            url: 'https://apps.apple.com/app/google-meet/id1013231476',
            style: 'primary',
          },
          {
            type: 'uri',
            label: '安卓下載',
            url: 'https://play.google.com/store/apps/details?id=com.google.android.apps.meetings',
            style: 'primary',
          },
        ],
      },
      { id: newId(), type: 'footer', text: 'ezPretty 預約科技' },
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
      if (btn.linkType === 'quoteLead') continue; // 網址是發送時才自動產生，這裡先不檢查
      if (!VALID_URI_PATTERN.test(btn.url.trim())) {
        return `按鈕「${btn.label}」的網址不完整或無效：${btn.url || '（空白）'}`;
      }
    }
  }
  return null;
}

// 把卡片裡所有「方案清單」區塊的內容攤平，給報價追蹤連結用
export function collectPlans(blocks: Block[]): Plan[] {
  return blocks
    .filter((b): b is PlanListBlock => b.type === 'planList')
    .flatMap((b) => b.plans)
    .filter((p) => p.title.trim());
}

// --- 分頁：用「分頁符」區塊把內容拆成多頁（多個 bubble），標題列/落款每頁重複，主圖只在第一頁 ---

export type PageSplit = {
  header?: HeaderBlock;
  hero?: HeroBlock;
  footer?: FooterBlock;
  pages: Block[][];
};

export function splitIntoPages(blocks: Block[]): PageSplit {
  let header: HeaderBlock | undefined;
  let hero: HeroBlock | undefined;
  let footer: FooterBlock | undefined;
  const pages: Block[][] = [];
  let current: Block[] = [];

  for (const block of blocks) {
    if (block.type === 'header') {
      header = block;
    } else if (block.type === 'hero') {
      if (block.imageUrl.trim()) hero = block;
    } else if (block.type === 'footer') {
      footer = block;
    } else if (block.type === 'pageBreak') {
      pages.push(current);
      current = [];
    } else {
      current.push(block);
    }
  }
  pages.push(current);

  return { header, hero, footer, pages };
}

// --- 把區塊組合轉成 LINE Flex Message JSON（單頁是 bubble，多頁自動包成 carousel） ---

type FlexContent = Record<string, unknown>;

function buildBubble(
  pageBlocks: Block[],
  accentColor: string,
  options: { header?: HeaderBlock; hero?: HeroBlock; footer?: FooterBlock }
): FlexContent {
  const { header, hero, footer } = options;
  const bodyContents: FlexContent[] = [];
  for (const block of pageBlocks) {
    bodyContents.push(...blockToFlexContents(block, accentColor));
  }
  if (footer) {
    bodyContents.push(...blockToFlexContents(footer, accentColor));
  }

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

export function buildFlexMessage(blocks: Block[], accentColor: string): FlexContent {
  const { header, hero, footer, pages } = splitIntoPages(blocks);

  const bubbles = pages.map((pageBlocks, i) =>
    buildBubble(pageBlocks, accentColor, { header, hero: i === 0 ? hero : undefined, footer })
  );

  if (bubbles.length <= 1) return bubbles[0];
  return { type: 'carousel', contents: bubbles };
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

    case 'planList': {
      if (block.hidden) return [];
      const plans = block.plans.filter((p) => p.title.trim());
      if (plans.length === 0) return [];
      return [
        {
          type: 'box',
          layout: 'vertical',
          spacing: 'md',
          contents: plans.map((p) => ({
            type: 'box',
            layout: 'vertical',
            backgroundColor: p.highlight ? lightenColor(accentColor, 0.92) : '#F7F8FA',
            cornerRadius: 'lg',
            paddingAll: '14px',
            spacing: 'xs',
            ...(p.highlight ? { borderWidth: '2px', borderColor: accentColor } : {}),
            contents: [
              {
                type: 'box',
                layout: 'horizontal',
                alignItems: 'center',
                contents: [
                  { type: 'text', text: p.title, weight: 'bold', size: 'md', color: '#111111', flex: 1, wrap: true },
                  ...(p.badge.trim()
                    ? [
                        {
                          type: 'box',
                          layout: 'vertical',
                          flex: 0,
                          backgroundColor: accentColor,
                          cornerRadius: '999px',
                          paddingAll: '4px',
                          paddingStart: '10px',
                          paddingEnd: '10px',
                          contents: [
                            {
                              type: 'text',
                              text: p.badge,
                              size: 'xxs',
                              color: '#FFFFFF',
                              weight: 'bold',
                              align: 'center',
                            },
                          ],
                        },
                      ]
                    : []),
                ],
              },
              { type: 'text', text: p.price, size: 'xxl', weight: 'bold', color: accentColor, margin: 'sm' },
              ...p.details
                .filter((d) => d.trim())
                .map((d) => ({ type: 'text', text: `・ ${d}`, size: 'xs', color: '#666666', wrap: true })),
            ],
          })),
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
