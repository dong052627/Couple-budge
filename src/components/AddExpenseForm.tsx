import React, { useState } from 'react';
import { ArrowLeft, Calendar, Coins, Plus, Sparkles, User, HelpCircle } from 'lucide-react';
import { ExpenseItem, CategoryType, PayerType, SplitMethodType, SplitDetail } from '../types';
import { CATEGORY_CONFIG } from '../data';
import CategoryIcon from './CategoryIcon';

interface AddExpenseFormProps {
  currentUserProfile: any;
  onAddExpense: (newExpense: any) => void;
  onCancel: () => void;
}

const CATEGORY_LIST: CategoryType[] = [
  '餐飲',
  '飲料',
  '日用品',
  '交通',
  '房租',
  '水電瓦斯',
  '娛樂',
  '旅遊',
  '禮物',
  '其他',
];

export default function AddExpenseForm({ currentUserProfile, onAddExpense, onCancel }: AddExpenseFormProps) {
  const nameA = currentUserProfile?.displayName || '我';
  const nameB = currentUserProfile?.partnerName || '另一半';

  // Field values
  const [category, setCategory] = useState<CategoryType>('餐飲');
  const [amount, setAmount] = useState<string>('');
  const [payer, setPayer] = useState<string>(nameA);
  
  // Set fallback defaults for date picker input in standard ISO format (local date)
  const getTodayString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const [date, setDate] = useState<string>(getTodayString());
  const [note, setNote] = useState<string>('');
  
  // Split settings
  const [splitType, setSplitType] = useState<SplitMethodType>('single');
  const [shareA, setShareA] = useState<number>(50); // for 'custom' (A %)
  const [shareB, setShareB] = useState<number>(50); // for 'custom' (B %)

  const numAmount = parseFloat(amount) || 0;

  // Handle custom share A change (maintaining total = 100)
  const handleShareAChange = (val: number) => {
    const clamped = Math.max(0, Math.min(100, val));
    setShareA(clamped);
    setShareB(100 - clamped);
  };

  // Handle custom share B change (maintaining total = 100)
  const handleShareBChange = (val: number) => {
    const clamped = Math.max(0, Math.min(100, val));
    setShareB(clamped);
    setShareA(100 - clamped);
  };

  // Perform split breakdown preview math
  let pShareA = 0;
  let pShareB = 0;
  if (splitType === '50/50') {
    pShareA = numAmount / 2;
    pShareB = numAmount / 2;
  } else if (splitType === 'single') {
    if (payer === nameA) {
      pShareA = numAmount;
      pShareB = 0;
    } else {
      pShareA = 0;
      pShareB = numAmount;
    }
  } else if (splitType === 'custom') {
    pShareA = (numAmount * shareA) / 100;
    pShareB = (numAmount * shareB) / 100;
  }

  // Handle Submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || numAmount <= 0) {
      alert('請輸入大於 0 的金額喔！');
      return;
    }

    const splitDetail: SplitDetail = {
      type: splitType,
      ...(splitType === 'single' && { fullBearer: payer }),
      ...(splitType === 'custom' && {
        customShares: {
          [nameA]: shareA,
          [nameB]: shareB,
        },
      }),
    };

    const expensePayload = {
      category,
      amount: numAmount,
      payer,
      date,
      note: note.trim(),
      split: splitDetail,
    };

    onAddExpense(expensePayload);
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6 pb-24">
      
      {/* Dynamic Design Header bar */}
      <div className="flex items-center gap-3">
        <button
          onClick={onCancel}
          className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500 border border-slate-100/60 bg-white"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h2 className="text-sm font-black tracking-widest text-slate-400 uppercase flex items-center gap-1">
            <span className="w-3 h-px bg-slate-300"></span>
            新增此筆共同支出
          </h2>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* 1. Category Selector Grid */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 block">
            選擇消費分類 <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-5 gap-2">
            {CATEGORY_LIST.map((catKey) => {
              const config = CATEGORY_CONFIG[catKey] || CATEGORY_CONFIG['其他'];
              const isSelected = category === catKey;
              return (
                <button
                  key={catKey}
                  type="button"
                  onClick={() => setCategory(catKey)}
                  className={`flex flex-col items-center gap-1.5 p-2.5 rounded-2xl border transition-all select-none ${
                    isSelected
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100'
                      : 'bg-white border-slate-100 text-slate-600 hover:border-slate-200'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-indigo-505/80 text-white' : `${config.bgColor} ${config.textColor}`
                    }`}
                  >
                    <CategoryIcon name={config.iconName} className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold tracking-tight">{catKey}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Amount and Date Row */}
        <div className="grid grid-cols-2 gap-4">
          
          {/* Total Amount Input */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-505 block">
              消費總金額 (TWD) <span className="text-rose-505">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">NT$</span>
              <input
                type="number"
                inputMode="decimal"
                pattern="[0-9]*"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onWheel={(e) => e.currentTarget.blur()}
                required
                className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-100/80 rounded-2xl text-slate-800 font-extrabold text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100"
              />
            </div>
          </div>

          {/* Date Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-505 block">
              消費日期 <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full pl-11 pr-4 py-3 bg-white border border-slate-100/80 rounded-2xl text-slate-700 font-bold text-xs focus:outline-none focus:border-indigo-505 focus:ring-1 focus:ring-indigo-100"
              />
            </div>
          </div>

        </div>

        {/* 3. Payer and Note Row */}
        <div className="grid grid-cols-2 gap-4">

          {/* Payer Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 block">
              誰代墊付款？ <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2 bg-slate-100/80 p-1.5 rounded-2xl">
              <button
                type="button"
                onClick={() => setPayer(nameA)}
                className={`py-2 px-1.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  payer === nameA
                    ? 'bg-blue-500 text-white shadow-xs'
                    : 'text-slate-505 hover:text-slate-800'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${payer === nameA ? 'bg-white' : 'bg-blue-500'}`}></span>
                <span className="truncate max-w-[65px]">{nameA}</span>
              </button>
              <button
                type="button"
                onClick={() => setPayer(nameB)}
                className={`py-2 px-1.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  payer === nameB
                    ? 'bg-pink-500 text-white shadow-xs'
                    : 'text-slate-505 hover:text-slate-800'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${payer === nameB ? 'bg-white' : 'bg-pink-500'}`}></span>
                <span className="truncate max-w-[65px]">{nameB}</span>
              </button>
            </div>
          </div>

          {/* Note Input */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-505 block">
              消費備註/說明
            </label>
            <input
              type="text"
              placeholder="例如：全家晚餐、衛生紙..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-slate-100/80 rounded-2xl text-slate-705 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100"
            />
          </div>

        </div>

        {/* 4. Split Method Container */}
        <div className="bg-slate-50 border border-slate-100 rounded-3xl p-5 space-y-4 shadow-2xs">
          
          <div className="flex items-center gap-2 pb-2.5 border-b border-slate-200/50">
            <Coins className="w-4 h-4 text-indigo-500" />
            <span className="text-xs font-black text-slate-700">選擇這筆消費的分攤管道</span>
          </div>

          {/* Segmented Split Button Selectors */}
          <div className="grid grid-cols-3 gap-2 bg-slate-200/50 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setSplitType('single')}
              className={`py-1.5 px-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                splitType === 'single'
                  ? 'bg-white text-indigo-600 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              單人全額
            </button>
            <button
              type="button"
              onClick={() => setSplitType('50/50')}
              className={`py-1.5 px-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                splitType === '50/50'
                  ? 'bg-white text-indigo-600 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              50/50 均分
            </button>
            <button
              type="button"
              onClick={() => setSplitType('custom')}
              className={`py-1.5 px-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                splitType === 'custom'
                  ? 'bg-white text-indigo-600 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              自訂比例
            </button>
          </div>

          {/* Sub Panels Based on Split selection */}
          <div className="bg-white border border-slate-100/80 rounded-2xl p-4 animate-fade-in-down">
            
            {/* 50/50 panel */}
            {splitType === '50/50' && (
              <div className="space-y-1">
                <p className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                  情侶均分計算 (50%)
                </p>
                <p className="text-[10px] text-slate-400 leading-normal">
                  此方法最公平：兩人各自負擔消費的一半金額。
                </p>
              </div>
            )}

            {/* Single Bearer Panel */}
            {splitType === 'single' && (
              <div className="space-y-1">
                <p className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                  單人全額負擔 (100%)
                </p>
                <p className="text-[10px] text-slate-400 leading-normal">
                  此消費由代墊人<strong>{payer}</strong>全額自付，雙方不進行分攤。
                </p>
              </div>
            )}

            {/* Custom Split Panel */}
            {splitType === 'custom' && (
              <div className="space-y-4">
                <div>
                  <p className="text-[11px] font-bold text-slate-700 flex items-center gap-1 mb-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                    自訂兩人拆帳與負擔比例 (%)
                  </p>
                  <p className="text-[10px] text-slate-400 leading-normal">
                    自由分配您的各別負擔比例，總和需等於 100%。
                  </p>
                </div>

                {/* Symmetrical slider linked together */}
                <div className="space-y-3 bg-slate-50/50 p-3 rounded-xl border border-dotted border-slate-200">
                  {/* Slider */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-bold text-slate-505">
                      <span className="truncate max-w-[120px]">{nameA}: {shareA}%</span>
                      <span className="truncate max-w-[120px]">{nameB}: {shareB}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={shareA}
                      onChange={(e) => handleShareAChange(parseInt(e.target.value))}
                      className="w-full accent-indigo-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Manual Inputs for precise adjustments */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-slate-400 block p-0 truncate">{nameA}負擔比 (%)</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={shareA}
                        onChange={(e) => handleShareAChange(parseInt(e.target.value) || 0)}
                        onWheel={(e) => e.currentTarget.blur()}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-100 rounded-xl text-xs text-blue-800 font-extrabold text-center focus:outline-none focus:border-blue-400"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-slate-400 block p-0 truncate">{nameB}負擔比 (%)</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={shareB}
                        onChange={(e) => handleShareBChange(parseInt(e.target.value) || 0)}
                        onWheel={(e) => e.currentTarget.blur()}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-100 rounded-xl text-xs text-pink-800 font-extrabold text-center focus:outline-none focus:border-pink-400"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Split Amount Result Calculator Preview */}
            <div className="mt-4 border-t border-slate-100 pt-3 flex flex-col gap-2 bg-slate-50/40 p-2.5 rounded-xl border border-slate-100/60">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">本筆費用計算預覽 (各自承擔)</span>
              
              <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                <p className="text-blue-700 flex items-center justify-between bg-blue-50/20 px-2 py-1 rounded-lg">
                  <span className="truncate max-w-[100px]">{nameA}份額:</span>
                  <span className="font-black text-blue-900 shrink-0">NT$ {Math.round(pShareA).toLocaleString()}</span>
                </p>
                <p className="text-pink-700 flex items-center justify-between bg-pink-50/20 px-2 py-1 rounded-lg">
                  <span className="truncate max-w-[100px]">{nameB}份額:</span>
                  <span className="font-black text-pink-900 shrink-0">NT$ {Math.round(pShareB).toLocaleString()}</span>
                </p>
              </div>

              {/* Live matching note */}
              <div className="text-[9px] text-slate-400 font-medium flex gap-1 mt-0.5 leading-normal">
                <HelpCircle className="w-3.5 h-3.5 text-slate-300 shrink-0 mt-0.5" />
                <span>
                  本款由<strong>{payer}</strong>先付 NT$ {numAmount.toLocaleString()}。
                  扣除應分攤份額後，其餘
                  NT$ {Math.round(payer === nameA ? pShareB : pShareA).toLocaleString()} 記為另一方應向其結算歸還之款項！
                </span>
              </div>
            </div>

          </div>

        </div>

        {/* 5. Trigger Buttons */}
        <div className="grid grid-cols-2 gap-3.5 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="w-full bg-slate-100 hover:bg-slate-200/80 text-slate-505 font-semibold py-3.5 px-4 rounded-xl text-xs tracking-wider border border-slate-200/40 transition-all select-none cursor-pointer"
          >
            取消退回
          </button>
          
          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold py-3.5 px-4 rounded-xl text-xs tracking-widest shadow-md shadow-indigo-100 transition-all active:scale-98 select-none flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            記下這款
          </button>
        </div>

      </form>

    </div>
  );
}
