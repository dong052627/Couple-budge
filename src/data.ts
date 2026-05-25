import { ExpenseItem, CategoryType, CategoryInfo } from './types';

export const CATEGORY_CONFIG: Record<CategoryType, CategoryInfo & { iconName: string }> = {
  '餐飲': { iconName: 'Utensils', bgColor: 'bg-orange-50', textColor: 'text-orange-600' },
  '飲料': { iconName: 'CupSoda', bgColor: 'bg-amber-50', textColor: 'text-amber-600' },
  '日用品': { iconName: 'ShoppingBag', bgColor: 'bg-blue-50', textColor: 'text-blue-600' },
  '交通': { iconName: 'Car', bgColor: 'bg-cyan-50', textColor: 'text-cyan-600' },
  '房租': { iconName: 'Home', bgColor: 'bg-purple-50', textColor: 'text-purple-600' },
  '水電瓦斯': { iconName: 'Flame', bgColor: 'bg-indigo-50', textColor: 'text-indigo-600' },
  '娛樂': { iconName: 'Gamepad2', bgColor: 'bg-rose-50', textColor: 'text-rose-600' },
  '旅遊': { iconName: 'Compass', bgColor: 'bg-emerald-50', textColor: 'text-emerald-600' },
  '禮物': { iconName: 'Gift', bgColor: 'bg-pink-50', textColor: 'text-pink-600' },
  '其他': { iconName: 'MoreHorizontal', bgColor: 'bg-slate-50', textColor: 'text-slate-600' }
};

export const INITIAL_EXPENSES: ExpenseItem[] = [
  {
    id: 'exp_1',
    category: '餐飲',
    amount: 1200,
    payer: '阿明',
    date: '2026-05-25',
    note: '晚餐吃麻辣火鍋',
    split: { type: '50/50' }
  },
  {
    id: 'exp_2',
    category: '飲料',
    amount: 120,
    payer: '小美',
    date: '2026-05-25',
    note: '手搖飲 50 嵐',
    split: { type: '50/50' }
  },
  {
    id: 'exp_3',
    category: '日用品',
    amount: 3200,
    payer: '小美',
    date: '2026-05-22',
    note: '好市多採購衛生紙與民生用品',
    split: { type: '50/50' }
  },
  {
    id: 'exp_4',
    category: '交通',
    amount: 500,
    payer: '阿明',
    date: '2026-05-20',
    note: '悠遊卡加值',
    split: { type: '50/50' }
  },
  {
    id: 'exp_5',
    category: '水電瓦斯',
    amount: 2100,
    payer: '小美',
    date: '2026-05-18',
    note: '9-10 月夏季電費',
    split: { type: '50/50' }
  },
  {
    id: 'exp_6',
    category: '娛樂',
    amount: 680,
    payer: '阿明',
    date: '2026-05-15',
    note: '電影雙人票與爆米花',
    split: { type: '50/50' }
  },
  {
    id: 'exp_7',
    category: '旅遊',
    amount: 3800,
    payer: '小美',
    date: '2026-05-12',
    note: '週末宜蘭文青民宿住宿費用',
    split: { type: '50/50' }
  },
  {
    id: 'exp_8',
    category: '禮物',
    amount: 2500,
    payer: '阿明',
    date: '2026-05-08',
    note: '交往週年紀念櫻花對杯小禮物',
    split: { type: 'single', fullBearer: '阿明' }
  },
  {
    id: 'exp_9',
    category: '其他',
    amount: 50,
    payer: '小美',
    date: '2026-05-05',
    note: '超商黑白影印合約文件',
    split: { type: '50/50' }
  },
  {
    id: 'exp_10',
    category: '房租',
    amount: 15000,
    payer: '阿明',
    date: '2026-05-01',
    note: '10月份合租套房租金及大樓管理費',
    split: { type: '50/50' }
  }
];

export interface SettlementResult {
  totalExpense: number;
  paidA: number;
  paidB: number;
  shareA: number;
  shareB: number;
  debtor: string | 'none';
  creditor: string | 'none';
  debtAmount: number;
}

export function calculateSettlement(
  expenses: ExpenseItem[],
  nameA: string = '阿明',
  nameB: string = '小美'
): SettlementResult {
  let totalExpense = 0;
  let paidA = 0; // Member A paid total
  let paidB = 0; // Member B paid total
  let shareA = 0; // Member A share total
  let shareB = 0; // Member B share total

  const isA = (name: string | undefined) => {
    if (!name) return true;
    return name === nameA || name === '我' || (name !== nameB && name !== '另一半');
  };

  expenses.forEach(item => {
    totalExpense += item.amount;
    
    // Who paid
    if (isA(item.payer)) {
      paidA += item.amount;
    } else {
      paidB += item.amount;
    }

    // Who shares
    if (item.split.type === '50/50') {
      const half = item.amount / 2;
      shareA += half;
      shareB += half;
    } else if (item.split.type === 'single') {
      const bearer = item.split.fullBearer || item.payer;
      if (isA(bearer)) {
        shareA += item.amount;
      } else {
        shareB += item.amount;
      }
    } else if (item.split.type === 'custom') {
      const shares = item.split.customShares || {};
      let valA: number | undefined;
      let valB: number | undefined;

      Object.entries(shares).forEach(([k, val]) => {
        if (isA(k)) {
          valA = val;
        } else {
          valB = val;
        }
      });

      const actualValA = valA !== undefined ? valA : 50;
      const actualValB = valB !== undefined ? valB : 50;
      const totalShare = actualValA + actualValB;
      if (totalShare > 0) {
        shareA += (item.amount * actualValA) / totalShare;
        shareB += (item.amount * actualValB) / totalShare;
      } else {
        const half = item.amount / 2;
        shareA += half;
        shareB += half;
      }
    }
  });

  const rPaidA = Math.round(paidA);
  const rPaidB = Math.round(paidB);
  const rShareA = Math.round(shareA);
  const rShareB = Math.round(shareB);
  const rTotal = Math.round(totalExpense);

  const netA = rPaidA - rShareA;
  const netB = rPaidB - rShareB;

  let debtor: string | 'none' = 'none';
  let creditor: string | 'none' = 'none';
  let debtAmount = 0;

  if (netA > 0) {
    debtor = nameB;
    creditor = nameA;
    debtAmount = netA;
  } else if (netB > 0) {
    debtor = nameA;
    creditor = nameB;
    debtAmount = netB;
  }

  return {
    totalExpense: rTotal,
    paidA: rPaidA,
    paidB: rPaidB,
    shareA: rShareA,
    shareB: rShareB,
    debtor,
    creditor,
    debtAmount: Math.abs(debtAmount)
  };
}
