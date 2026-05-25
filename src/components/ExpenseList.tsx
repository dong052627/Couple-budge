import React, { useState } from 'react';
import {
  Search,
  SlidersHorizontal,
  X,
  Calendar,
  User,
  Tags,
  Filter,
  Check,
  ChevronDown,
  Info
} from 'lucide-react';
import { ExpenseItem, CategoryType, PayerType } from '../types';
import { CATEGORY_CONFIG } from '../data';
import CategoryIcon from './CategoryIcon';

interface ExpenseListProps {
  expenses: ExpenseItem[];
  currentUserProfile: any;
  onSelectExpense: (item: ExpenseItem) => void;
  onClearAllFilters?: () => void;
}

const ALL_CATEGORIES: (CategoryType | '全部')[] = [
  '全部',
  '餐飲',
  '飲料',
  '日用品',
  '交通',
  '房租',
  '水電瓦斯',
  '娛樂',
  '旅遊',
  '禮物',
  '其他'
];

export default function ExpenseList({ expenses, currentUserProfile, onSelectExpense }: ExpenseListProps) {
  const nameA = currentUserProfile?.displayName || '我';
  const nameB = currentUserProfile?.partnerName || '另一半';

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | '全部'>('全部');
  const [selectedPayer, setSelectedPayer] = useState<string | '全部'>('全部');
  const [showFilters, setShowFilters] = useState(false);

  // Clear filters helper
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('全部');
    setSelectedPayer('全部');
  };

  // Filtering Logic
  const filteredExpenses = expenses.filter(item => {
    // Search query matches note or category
    const matchesSearch =
      searchQuery.trim() === '' ||
      (item.note || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.amount.toString().includes(searchQuery);

    // Category match
    const matchesCategory = selectedCategory === '全部' || item.category === selectedCategory;

    // Payer match
    const matchesPayer = selectedPayer === '全部' || item.payer === selectedPayer;

    return matchesSearch && matchesCategory && matchesPayer;
  });

  // Count active filters
  const activeFiltersCount =
    (selectedCategory !== '全部' ? 1 : 0) +
    (selectedPayer !== '全部' ? 1 : 0) +
    (searchQuery.trim() !== '' ? 1 : 0);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5 pb-24">
      
      {/* Page Header Title */}
      <div>
        <h2 className="text-sm font-black tracking-widest text-slate-400 uppercase flex items-center gap-2">
          <span className="w-3 h-px bg-slate-300"></span>
          共同帳目明細流水帳
        </h2>
        <p className="text-xs text-slate-505 mt-0.5">篩選、檢視所有歷來共同消費明細</p>
      </div>

      {/* Search Input Bar & Filter Toggle */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="搜尋備註、分類、金額..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-100/80 rounded-xl text-xs text-slate-700 font-bold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100 placeholder:text-slate-300 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Filters Toggle Button */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-3.5 py-2.5 border rounded-xl flex items-center gap-1.5 text-xs font-bold transition-all relative cursor-pointer ${
            showFilters || activeFiltersCount > 0
              ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
              : 'bg-white border-slate-100 text-slate-600 hover:border-slate-200'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>篩選</span>
          {activeFiltersCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-indigo-600 text-white rounded-full text-[9px] font-black flex items-center justify-center border-2 border-white">
              {activeFiltersCount}
            </span>
          )}
        </button>
      </div>

      {/* Collapsible Filter Panel */}
      {showFilters && (
        <div className="bg-white border border-slate-100 rounded-2xl p-4 space-y-3.5 animate-fade-in-down shadow-2xs">
          
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-indigo-500" />
              帳目進階條件篩選
            </span>
            {activeFiltersCount > 0 && (
              <button
                onClick={handleResetFilters}
                className="text-[10px] text-indigo-600 font-bold hover:underline cursor-pointer"
              >
                清除全部
              </button>
            )}
          </div>

          <div className="space-y-3">
            {/* Payers Filter Segment */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 block">付款人過濾：</span>
              <div className="flex gap-2">
                {['全部', nameA, nameB].map(p => (
                  <button
                    key={p}
                    onClick={() => setSelectedPayer(p)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      selectedPayer === p
                        ? p === nameA
                          ? 'bg-blue-500 text-white'
                          : p === nameB
                            ? 'bg-pink-500 text-white'
                            : 'bg-slate-900 text-white'
                        : 'bg-slate-50 text-slate-505 hover:bg-slate-100'
                    }`}
                  >
                    {p === '全部' ? '全部付款人' : p}
                  </button>
                ))}
              </div>
            </div>

            {/* Category selection */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 block">分類過濾：</span>
              <div className="flex flex-wrap gap-1.5">
                {ALL_CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* Results Sum Stats Label */}
      <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 tracking-wide">
        <span>已篩選出 {filteredExpenses.length} 筆明細</span>
        {activeFiltersCount > 0 && (
          <span className="text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full font-bold animate-pulse">開啟過濾中</span>
        )}
      </div>

      {/* Main Account Ledger List */}
      <div className="space-y-2.5">
        {filteredExpenses.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-3xl p-10 text-center space-y-3 flex flex-col items-center justify-center">
            <div className="w-12 h-12 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center border border-slate-100">
              <X className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-700">找不到相符的記帳紀錄</p>
              <p className="text-[10px] text-slate-400 leading-normal max-w-xs mx-auto">
                可能目前的過濾條件（付款人或種類組合）在帳本中沒有相應的紀錄唷。
              </p>
            </div>
            {activeFiltersCount > 0 && (
              <button
                onClick={handleResetFilters}
                className="bg-indigo-50 text-indigo-600 font-extrabold text-[10px] px-4 py-2 rounded-xl border border-indigo-100/50 hover:bg-indigo-100/60 transition-colors mt-2 cursor-pointer"
              >
                重設所有搜尋與過濾
              </button>
            )}
          </div>
        ) : (
          filteredExpenses.map(item => {
            const config = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG['其他'];
            return (
              <div
                key={item.id}
                onClick={() => onSelectExpense(item)}
                className="flex items-center justify-between p-3.5 bg-white border border-slate-100 rounded-2xl hover:border-indigo-100 hover:bg-slate-50/20 active:scale-99 transition-all cursor-pointer group shadow-2xs animate-fade-in"
              >
                <div className="flex items-center gap-3">
                  {/* Category icon with soft background */}
                  <div className={`w-9 h-9 ${config.bgColor} ${config.textColor} rounded-xl flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform`}>
                    <CategoryIcon name={config.iconName} className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-800">{item.note || item.category}</p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[9px] text-slate-400 font-medium">{item.date}</span>
                      <span className="text-[9px] text-slate-300">•</span>
                      <span className={`text-[9px] font-bold px-2 py-0.2 rounded-full ${
                        item.payer === nameA
                          ? 'bg-blue-100/70 text-blue-700' 
                          : 'bg-pink-100/70 text-pink-700'
                      }`}>
                        {item.payer}付款
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right space-y-0.5">
                  <p className="text-xs font-black text-slate-800">
                    NT$ {item.amount.toLocaleString()}
                  </p>
                  <p className="text-[9px] font-bold tracking-widest uppercase text-slate-400 shrink-0">
                    {item.category}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Symmetrical Footnote info */}
      <div className="bg-slate-50 border border-slate-100/60 rounded-2xl p-4 flex gap-2.5 items-start">
        <Info className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" />
        <p className="text-[9px] text-slate-400 leading-normal">
          提示：點開任何一筆支出卡片即可隨時檢視該筆消費的付款人、拆帳方式、備註說明，並查看各自被系統列計承擔的詳細結果。
        </p>
      </div>

    </div>
  );
}
