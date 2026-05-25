import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Calendar, User, DollarSign, FileText, Share2, HelpCircle, Trash2 } from 'lucide-react';
import { ExpenseItem } from '../types';
import { CATEGORY_CONFIG } from '../data';
import CategoryIcon from './CategoryIcon';

interface ExpenseDetailModalProps {
  expense: ExpenseItem | null;
  currentUserProfile: any;
  onClose: () => void;
  onDeleteExpense?: (id: string) => void;
}

export default function ExpenseDetailModal({ expense, currentUserProfile, onClose, onDeleteExpense }: ExpenseDetailModalProps) {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  if (!expense) return null;

  const nameA = currentUserProfile?.displayName || '阿明';
  const nameB = currentUserProfile?.partnerName || '小美';

  const config = CATEGORY_CONFIG[expense.category] || CATEGORY_CONFIG['其他'];

  // Calculate internal share details
  let shareA = 0;
  let shareB = 0;
  let splitLabel = '';

  if (expense.split.type === '50/50') {
    shareA = expense.amount / 2;
    shareB = expense.amount / 2;
    splitLabel = '雙人 50/50 均分';
  } else if (expense.split.type === 'single') {
    const bearer = expense.split.fullBearer || expense.payer;
    if (bearer === nameA) {
      shareA = expense.amount;
      shareB = 0;
    } else {
      shareA = 0;
      shareB = expense.amount;
    }
    splitLabel = `由 ${bearer} 全額負擔`;
  } else if (expense.split.type === 'custom') {
    const shares = expense.split.customShares || {};
    const valA = shares[nameA] !== undefined ? shares[nameA] : 50;
    const valB = shares[nameB] !== undefined ? shares[nameB] : 50;
    const total = valA + valB;
    if (total > 0) {
      shareA = (expense.amount * valA) / total;
      shareB = (expense.amount * valB) / total;
      splitLabel = `自訂比例 (${valA}% : ${valB}%)`;
    } else {
      shareA = expense.amount / 2;
      shareB = expense.amount / 2;
      splitLabel = '均分';
    }
  }

  // Round shares for display
  const rShareA = Math.round(shareA);
  const rShareB = Math.round(shareB);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-xs">
      {/* Background overlay click-off */}
      <div className="absolute inset-0" onClick={onClose}></div>

      {/* Drawer content */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
        className="relative z-10 w-full max-w-md bg-white rounded-t-3xl shadow-2xl overflow-hidden pb-8 flex flex-col max-h-[85vh] border-t border-slate-100 text-slate-800"
      >
        {/* Decorative handle bar */}
        <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mt-3 mb-2"></div>

        {/* Header */}
        <div className="px-6 py-3 flex items-center justify-between border-b border-slate-50">
          <h2 className="text-base font-bold text-slate-900">支出明細內容</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrolling content */}
        <div className="px-6 py-6 space-y-7 overflow-y-auto">
          {/* Main Hero Card */}
          <div className="flex flex-col items-center justify-center text-center space-y-3 pb-2 border-b border-slate-100">
            <div className={`${config.bgColor} p-4 rounded-2xl shadow-xs inline-flex`}>
              <CategoryIcon name={config.iconName} className={`w-8 h-8 ${config.textColor}`} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-0.5 rounded-full inline-block">
                {expense.category}
              </p>
              <h3 className="text-3xl font-bold text-slate-900 mt-2 tracking-tight">
                NT$ {expense.amount.toLocaleString()}
              </h3>
            </div>
          </div>

          {/* Core Fields */}
          <div className="space-y-4">
            {/* Payer */}
            <div className="flex items-start gap-4">
              <div className="bg-slate-50 text-slate-400 p-2 rounded-xl mt-0.5">
                <User className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-slate-400">付款人</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`w-2 h-2 rounded-full ${expense.payer === nameA ? 'bg-blue-500' : 'bg-pink-500'}`}></span>
                  <span className="text-sm font-semibold text-slate-800">
                    {expense.payer}付款
                  </span>
                </div>
              </div>
            </div>

            {/* Date */}
            <div className="flex items-start gap-4">
              <div className="bg-slate-50 text-slate-400 p-2 rounded-xl mt-0.5">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-slate-400">消費日期</p>
                <p className="text-sm font-semibold text-slate-800 mt-0.5">
                  {expense.date}
                </p>
              </div>
            </div>

            {/* Note */}
            <div className="flex items-start gap-4">
              <div className="bg-slate-50 text-slate-400 p-2 rounded-xl mt-0.5">
                <FileText className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-slate-400">消費備註</p>
                <p className="text-sm text-slate-700 font-medium mt-0.5 leading-relaxed bg-slate-50/50 p-2.5 rounded-xl border border-slate-100/60">
                  {expense.note || '無備註資訊'}
                </p>
              </div>
            </div>
          </div>

          {/* Split result card */}
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4.5 space-y-4">
            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-200/50">
              <Share2 className="w-4 h-4 text-brand-500" />
              <span className="text-xs font-bold text-slate-800">分攤分工計算</span>
              <span className="ml-auto text-[10px] font-semibold text-brand-600 bg-brand-50 px-2.5 py-0.5 rounded-full inline-block">
                {splitLabel}
              </span>
            </div>

            {/* Two sides breakdown */}
            <div className="grid grid-cols-2 gap-4">
              {/* Partner A */}
              <div className="bg-white border border-slate-100 rounded-xl p-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                    <span className="text-[10px] font-bold text-slate-500 truncate max-w-[100px]">{nameA} 應負擔</span>
                  </div>
                  <p className="text-base font-bold text-blue-900 mt-2">
                    NT$ {rShareA.toLocaleString()}
                  </p>
                </div>
                {/* Visual note */}
                <span className="text-[9px] text-slate-400 mt-1.5">
                  {expense.payer === nameA ? '溢付抵充' : '記為待付款'}
                </span>
              </div>

              {/* Partner B */}
              <div className="bg-white border border-slate-100 rounded-xl p-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-pink-500"></span>
                    <span className="text-[10px] font-bold text-slate-500 truncate max-w-[100px]">{nameB} 應負擔</span>
                  </div>
                  <p className="text-base font-bold text-pink-900 mt-2">
                    NT$ {rShareB.toLocaleString()}
                  </p>
                </div>
                {/* Visual note */}
                <span className="text-[9px] text-slate-400 mt-1.5">
                  {expense.payer === nameB ? '溢付抵充' : '記為待付款'}
                </span>
              </div>
            </div>

            {/* Explanatory footer */}
            <div className="text-[10px] text-slate-400 leading-normal flex items-start gap-1">
              <HelpCircle className="w-3 h-3 text-slate-300 shrink-0 mt-0.5" />
              <span>
                {expense.payer === nameA
                  ? `本筆由 ${nameA} 全額付清，扣除自己份額後，${nameB} 應分扣 NT$ ${rShareB.toLocaleString()}`
                  : `本筆由 ${nameB} 全額付清，扣除自己份額後，${nameA} 應分扣 NT$ ${rShareA.toLocaleString()}`}
              </span>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-2.5 flex flex-col gap-2 shrink-0 border-t border-slate-50">
          {!showConfirmDelete ? (
            <>
              <button
                onClick={onClose}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 px-4 rounded-xl text-xs tracking-wide shadow-sm hover:shadow-md transition-all active:scale-98 cursor-pointer"
              >
                關閉詳細資料
              </button>
              {onDeleteExpense && (
                <button
                  onClick={() => setShowConfirmDelete(true)}
                  className="w-full bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold py-2 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all active:scale-98 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  刪除這筆支出紀錄
                </button>
              )}
            </>
          ) : (
            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-3 space-y-3 animate-fade-in-down">
              <p className="text-[10px] text-rose-700 font-bold text-center">
                ⚠️ 確定要刪除此筆記錄嗎？這會重新計算兩人分攤總額。
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmDelete(false)}
                  className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-505 font-bold py-2 rounded-xl text-xs text-center transition-all cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteExpense(expense.id);
                  }}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold py-2 rounded-xl text-xs text-center transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  我確認刪除
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
