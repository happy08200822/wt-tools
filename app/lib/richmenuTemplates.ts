// LINE 官方帳號圖文選單（Rich Menu）的官方版型定義。
// 大版型畫布比例約 1.483（2500x1686 / 1200x810 / 800x540）
// 小版型畫布比例約 2.966（2500x843 / 1200x405 / 800x270）

export type Region = { x: number; y: number; w: number; h: number };
export type SizeOption = { id: string; width: number; height: number };
export type Template = {
  id: string;
  category: 'large' | 'small';
  label: string;
  regions: Region[];
  layoutDesc: string;
};

export const LARGE_SIZES: SizeOption[] = [
  { id: '2500x1686', width: 2500, height: 1686 },
  { id: '1200x810', width: 1200, height: 810 },
  { id: '800x540', width: 800, height: 540 },
];

export const SMALL_SIZES: SizeOption[] = [
  { id: '2500x843', width: 2500, height: 843 },
  { id: '1200x405', width: 1200, height: 405 },
  { id: '800x270', width: 800, height: 270 },
];

export const TEMPLATES: Template[] = [
  {
    id: 'large-grid-3x2',
    category: 'large',
    label: '6 等分（3 欄 x 2 列）',
    layoutDesc: '整張圖平均分成 3 欄 x 2 列，共 6 個等大的區塊',
    regions: [
      { x: 0, y: 0, w: 1 / 3, h: 1 / 2 },
      { x: 1 / 3, y: 0, w: 1 / 3, h: 1 / 2 },
      { x: 2 / 3, y: 0, w: 1 / 3, h: 1 / 2 },
      { x: 0, y: 1 / 2, w: 1 / 3, h: 1 / 2 },
      { x: 1 / 3, y: 1 / 2, w: 1 / 3, h: 1 / 2 },
      { x: 2 / 3, y: 1 / 2, w: 1 / 3, h: 1 / 2 },
    ],
  },
  {
    id: 'large-grid-2x2',
    category: 'large',
    label: '4 等分（2 欄 x 2 列）',
    layoutDesc: '整張圖平均分成 2 欄 x 2 列，共 4 個等大的區塊',
    regions: [
      { x: 0, y: 0, w: 1 / 2, h: 1 / 2 },
      { x: 1 / 2, y: 0, w: 1 / 2, h: 1 / 2 },
      { x: 0, y: 1 / 2, w: 1 / 2, h: 1 / 2 },
      { x: 1 / 2, y: 1 / 2, w: 1 / 2, h: 1 / 2 },
    ],
  },
  {
    id: 'large-top1-bottom2',
    category: 'large',
    label: '上方 1 大格 + 下方 2 小格',
    layoutDesc: '上方為滿版寬的大區塊，下方平均分成左右 2 個區塊',
    regions: [
      { x: 0, y: 0, w: 1, h: 1 / 2 },
      { x: 0, y: 1 / 2, w: 1 / 2, h: 1 / 2 },
      { x: 1 / 2, y: 1 / 2, w: 1 / 2, h: 1 / 2 },
    ],
  },
  {
    id: 'large-top2-bottom1',
    category: 'large',
    label: '上方 2 小格 + 下方 1 大格',
    layoutDesc: '上方平均分成左右 2 個區塊，下方為滿版寬的大區塊',
    regions: [
      { x: 0, y: 0, w: 1 / 2, h: 1 / 2 },
      { x: 1 / 2, y: 0, w: 1 / 2, h: 1 / 2 },
      { x: 0, y: 1 / 2, w: 1, h: 1 / 2 },
    ],
  },
  {
    id: 'large-left1-right2',
    category: 'large',
    label: '左側 1 大格 + 右側 2 小格',
    layoutDesc: '左側為滿版高的大區塊，右側上下平均分成 2 個區塊',
    regions: [
      { x: 0, y: 0, w: 1 / 2, h: 1 },
      { x: 1 / 2, y: 0, w: 1 / 2, h: 1 / 2 },
      { x: 1 / 2, y: 1 / 2, w: 1 / 2, h: 1 / 2 },
    ],
  },
  {
    id: 'large-right1-left2',
    category: 'large',
    label: '右側 1 大格 + 左側 2 小格',
    layoutDesc: '右側為滿版高的大區塊，左側上下平均分成 2 個區塊',
    regions: [
      { x: 1 / 2, y: 0, w: 1 / 2, h: 1 },
      { x: 0, y: 0, w: 1 / 2, h: 1 / 2 },
      { x: 0, y: 1 / 2, w: 1 / 2, h: 1 / 2 },
    ],
  },
  {
    id: 'large-full',
    category: 'large',
    label: '整張不分割',
    layoutDesc: '整張圖是單一區塊，不做任何切割',
    regions: [{ x: 0, y: 0, w: 1, h: 1 }],
  },
  {
    id: 'small-3equal',
    category: 'small',
    label: '橫向 3 等分',
    layoutDesc: '整張圖平均分成左中右 3 個等寬區塊',
    regions: [
      { x: 0, y: 0, w: 1 / 3, h: 1 },
      { x: 1 / 3, y: 0, w: 1 / 3, h: 1 },
      { x: 2 / 3, y: 0, w: 1 / 3, h: 1 },
    ],
  },
  {
    id: 'small-2unequal',
    category: 'small',
    label: '橫向 2 分（左寬右窄）',
    layoutDesc: '左側區塊較寬（約佔 2/3），右側區塊較窄（約佔 1/3）',
    regions: [
      { x: 0, y: 0, w: 2 / 3, h: 1 },
      { x: 2 / 3, y: 0, w: 1 / 3, h: 1 },
    ],
  },
  {
    id: 'small-2equal',
    category: 'small',
    label: '橫向 2 等分',
    layoutDesc: '整張圖平均分成左右 2 個等寬區塊',
    regions: [
      { x: 0, y: 0, w: 1 / 2, h: 1 },
      { x: 1 / 2, y: 0, w: 1 / 2, h: 1 },
    ],
  },
  {
    id: 'small-full',
    category: 'small',
    label: '整張不分割',
    layoutDesc: '整張圖是單一區塊，不做任何切割',
    regions: [{ x: 0, y: 0, w: 1, h: 1 }],
  },
];

export function getTemplate(id: string): Template {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}

export function sizesForCategory(category: 'large' | 'small'): SizeOption[] {
  return category === 'large' ? LARGE_SIZES : SMALL_SIZES;
}

export function getSize(category: 'large' | 'small', sizeId: string): SizeOption {
  const list = sizesForCategory(category);
  return list.find((s) => s.id === sizeId) ?? list[0];
}
