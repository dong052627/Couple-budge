export type CategoryType =
  | '餐飲'
  | '飲料'
  | '日用品'
  | '交通'
  | '房租'
  | '水電瓦斯'
  | '娛樂'
  | '旅遊'
  | '禮物'
  | '其他';

export type PayerType = string;

export type SplitMethodType = '50/50' | 'custom' | 'single';

export interface SplitDetail {
  type: SplitMethodType;
  fullBearer?: string; // For 'single' split method, who bears the cost
  fullBearerId?: string;
  customShares?: {
    [name: string]: number; // percentage (0-100) or share weight for each participant
  };
}

export interface ExpenseItem {
  id: string;
  category: CategoryType;
  amount: number;
  payer: PayerType;
  payerId?: string;
  date: string;
  note: string;
  split: SplitDetail;
}

export interface CategoryInfo {
  bgColor: string;
  textColor: string;
}
