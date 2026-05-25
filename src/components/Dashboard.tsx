import { useState, useEffect } from 'react';
import {
  Heart,
  TrendingUp,
  Coins,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Plus,
  LayoutDashboard,
  ClipboardList,
  Info,
  Sparkles,
  Award,
  CircleAlert
} from 'lucide-react';
import { ExpenseItem } from '../types';
import { CATEGORY_CONFIG, calculateSettlement } from '../data';
import { updateTransferredAmount } from '../firebase';
import CategoryIcon from './CategoryIcon';

interface DashboardProps {
  expenses: ExpenseItem[];
  currentUserProfile: any;
  onSelectExpense: (item: ExpenseItem) => void;
  onNavigateTo: (view: string) => void;
}

export default function Dashboard({ expenses, currentUserProfile, onSelectExpense, onNavigateTo }: DashboardProps) {
  const [showMath, setShowMath] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [localIncrement, setLocalIncrement] = useState(0);
  const [isSavingTransferred, setIsSavingTransferred] = useState(false);

  const cloudTransferred = currentUserProfile?.transferredAmount || 0;

  const handleSaveTransferred = async () => {
    setIsSavingTransferred(true);
    const sanitized = Math.max(0, localIncrement);
    const newTotal = cloudTransferred + sanitized;
    try {
      await updateTransferredAmount(currentUserProfile, newTotal);
      setLocalIncrement(0);
      triggerToast("✅ 已成功增記轉交金額！");
    } catch (err) {
      console.error("Failed to update transferred amount:", err);
      triggerToast(`❌ 儲存失敗：${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSavingTransferred(false);
    }
  };

  const handleClearTransferred = async () => {
    setIsSavingTransferred(true);
    try {
      await updateTransferredAmount(currentUserProfile, 0);
      setLocalIncrement(0);
      triggerToast("🧹 已清除所有轉交金額記錄！");
    } catch (err) {
      console.error("Failed to clear transferred amount:", err);
      triggerToast(`❌ 清除失敗：${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSavingTransferred(false);
    }
  };

  const nameA = currentUserProfile?.displayName || '我';
  const nameB = currentUserProfile?.partnerName || '另一半';

  // Calculate stats based on current expense array
  const stats = calculateSettlement(expenses, nameA, nameB);

  // Group stats for the progress bar based on shared burden (shares) instead of payments
  const totalExpense = stats.totalExpense;
  const pctA = totalExpense > 0 ? (stats.shareA / totalExpense) * 100 : 50;
  const pctB = totalExpense > 0 ? (stats.shareB / totalExpense) * 100 : 50;

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5 pb-24 select-none">

      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-xs bg-slate-900 border border-slate-800 text-white rounded-xl shadow-2xl p-3 flex items-center gap-2.5 animate-bounce-short">
          <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs font-semibold leading-relaxed">{toastMessage}</p>
        </div>
      )}

      {/* 頂部精緻小提示 */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-450 uppercase tracking-widest">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>5月生活手札 • 共同記帳 {expenses.length} 筆</span>
        </div>
      </div>

      {/* 1. 共同財務概覽黃金大卡片 */}
      <section className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 rounded-3xl p-6 text-white shadow-xl shadow-indigo-950/20 relative overflow-hidden transition-all hover:scale-[1.002]">
        {/* Background Decorative Coins */}
        <div className="absolute -right-8 -bottom-8 opacity-5 select-none pointer-events-none">
          <Coins className="w-40 h-40 text-white" />
        </div>

        {/* Card Header: Total Expenditure */}
        <div className="space-y-1">
          <span className="text-[10px] font-bold opacity-60 uppercase tracking-widest block">本月共同支出總額</span>
          <div className="text-3xl font-black flex items-baseline gap-1.5 leading-none">
            <span>NT$ {stats.totalExpense.toLocaleString()}</span>
            <span className="text-xs font-normal opacity-50">TWD</span>
          </div>
        </div>

        {/* Splitting Ratio Progress Bar */}
        <div className="mt-5 space-y-1.5">
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden flex">
            <div className="bg-blue-400 h-full transition-all duration-500" style={{ width: `${pctA}%` }}></div>
            <div className="bg-pink-400 h-full transition-all duration-500" style={{ width: `${pctB}%` }}></div>
          </div>
          <div className="flex justify-between text-[9px] font-bold text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
              {nameA}負擔占比 ({pctA.toFixed(0)}%)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-pink-400"></span>
              {nameB}負擔占比 ({pctB.toFixed(0)}%)
            </span>
          </div>
        </div>

        <div className="h-[1px] bg-slate-800/60 my-4"></div>

        {/* Grid: Individual Paid Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-0.5">
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">{nameA}已付</span>
            <div className="text-base font-bold text-slate-100">NT$ {stats.paidA.toLocaleString()}</div>
          </div>
          <div className="space-y-0.5 border-l border-slate-800/60 pl-4">
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">{nameB}已付</span>
            <div className="text-base font-bold text-slate-100">NT$ {stats.paidB.toLocaleString()}</div>
          </div>
        </div>

        <div className="h-[1px] bg-slate-800/60 my-4"></div>

        {/* Settlement Status & Action Area */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">結算狀態</span>
            <div className="text-xs font-bold text-indigo-300">
              {stats.debtor === 'none' ? (
                <span className="text-emerald-400">目前雙方無欠款，平帳中 ⚖️</span>
              ) : cloudTransferred <= 0 ? (
                <span>{stats.debtor} 需給 {stats.creditor} NT$ {stats.debtAmount.toLocaleString()}</span>
              ) : cloudTransferred < stats.debtAmount ? (
                <span>{stats.debtor} 需給 {stats.creditor} NT$ {(stats.debtAmount - cloudTransferred).toLocaleString()} <span className="text-[9px] text-slate-400 font-normal">(已轉交 NT$ {cloudTransferred.toLocaleString()})</span></span>
              ) : (
                <span className="text-emerald-400">🎉 {stats.debtor} 已全額付清！ (已轉交 NT$ {cloudTransferred.toLocaleString()})</span>
              )}
            </div>
          </div>

          {/* Increment Input (Amount transferred this time) */}
          {stats.debtor !== 'none' && (
            <div className="bg-slate-950/40 rounded-xl p-2.5 border border-slate-800/60 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">本次手動轉交</span>
                {cloudTransferred > 0 && (
                  <button
                    onClick={handleClearTransferred}
                    disabled={isSavingTransferred}
                    className="text-[9px] text-rose-400 hover:text-rose-350 font-medium hover:underline cursor-pointer shrink-0 ml-1"
                    title="清除所有已轉交金額記錄"
                  >
                    (清除)
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-0.5 rounded-lg border border-slate-800">
                  <span className="text-[9px] text-slate-500 font-bold">NT$</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={localIncrement || ''}
                    onChange={(e) => setLocalIncrement(Number(e.target.value))}
                    className="w-14 bg-transparent text-white text-xs font-extrabold focus:outline-none text-right placeholder:text-slate-700 font-mono"
                  />
                </div>
                {localIncrement > 0 && (
                  <button
                    onClick={handleSaveTransferred}
                    disabled={isSavingTransferred}
                    className="bg-indigo-650 hover:bg-indigo-550 disabled:opacity-50 text-[9px] font-black text-white px-2 py-1 rounded-lg transition-all active:scale-95 cursor-pointer shrink-0"
                  >
                    {isSavingTransferred ? '儲存中...' : '確認'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Collapsible Math details inside the card */}
          <div className="pt-1">
            <button
              onClick={() => setShowMath(!showMath)}
              className="w-full flex items-center justify-between text-[9px] font-bold text-slate-400 hover:text-white focus:outline-none py-0.5"
            >
              <span>查看結算公式與統計細節</span>
              {showMath ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showMath && (
              <div className="mt-2 text-[9px] text-slate-300 bg-slate-950/60 rounded-xl p-3 space-y-2 border border-slate-800/40 animate-fade-in-down leading-relaxed">
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-400">本月兩人共同總消費：</span>
                  <span className="font-bold text-white">NT$ {stats.totalExpense.toLocaleString()}</span>
                </div>
                <div className="h-[1px] bg-slate-800/40 my-1"></div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-0.5">
                    <p className="font-bold text-blue-400 flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-blue-500"></span>
                      {nameA}細目：
                    </p>
                    <p className="text-slate-400">已付付款：NT$ {stats.paidA.toLocaleString()}</p>
                    <p className="text-slate-400">應付份額：NT$ {stats.shareA.toLocaleString()}</p>
                    <p className="font-bold text-white">與份額差：{stats.paidA - stats.shareA >= 0 ? '+' : ''}{(stats.paidA - stats.shareA).toLocaleString()}</p>
                    {stats.debtor === nameA && cloudTransferred > 0 && (
                      <p className="text-emerald-400 font-bold">已轉交：+NT$ {cloudTransferred.toLocaleString()}</p>
                    )}
                    {stats.creditor === nameA && cloudTransferred > 0 && (
                      <p className="text-rose-400 font-bold">已收轉交：-NT$ {cloudTransferred.toLocaleString()}</p>
                    )}
                  </div>
                  <div className="space-y-0.5 border-l border-slate-800 pl-2">
                    <p className="font-bold text-pink-400 flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-pink-500"></span>
                      {nameB}細目：
                    </p>
                    <p className="text-slate-400">已付付款：NT$ {stats.paidB.toLocaleString()}</p>
                    <p className="text-slate-400">應付份額：NT$ {stats.shareB.toLocaleString()}</p>
                    <p className="font-bold text-white">與份額差：{stats.paidB - stats.shareB >= 0 ? '+' : ''}{(stats.paidB - stats.shareB).toLocaleString()}</p>
                    {stats.debtor === nameB && cloudTransferred > 0 && (
                      <p className="text-emerald-400 font-bold">已轉交：+NT$ {cloudTransferred.toLocaleString()}</p>
                    )}
                    {stats.creditor === nameB && cloudTransferred > 0 && (
                      <p className="text-rose-400 font-bold">已收轉交：-NT$ {cloudTransferred.toLocaleString()}</p>
                    )}
                  </div>
                </div>

                {/* 抵銷情況說明 */}
                {stats.debtor !== 'none' && (
                  <>
                    <div className="h-[1px] bg-slate-800/40 my-1"></div>
                    <div className="space-y-1 leading-relaxed">
                      <p className="font-bold text-indigo-300 flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                        <span>抵銷情況說明：</span>
                      </p>
                      <p className="text-slate-300 font-medium text-left">
                        {cloudTransferred <= 0 ? (
                          `目前尚未記錄任何已轉交金額。${stats.debtor} 還需給 ${stats.creditor} 原始欠款 NT$ ${stats.debtAmount.toLocaleString()} 元。`
                        ) : cloudTransferred < stats.debtAmount ? (
                          `${stats.debtor} 已轉交 NT$ ${cloudTransferred.toLocaleString()} 元進行部分抵銷。抵銷後，${stats.debtor} 還需給 ${stats.creditor} 餘額 NT$ ${(stats.debtAmount - cloudTransferred).toLocaleString()} 元。`
                        ) : (
                          `🎉 ${stats.debtor} 已轉交 NT$ ${cloudTransferred.toLocaleString()} 元，已全額抵銷完畢！${cloudTransferred > stats.debtAmount ? `溢付 NT$ ${(cloudTransferred - stats.debtAmount).toLocaleString()} 元。` : ''}`
                        )}
                      </p>
                    </div>
                  </>
                )}

                <div className="h-[1px] bg-slate-800/40 my-1"></div>
                <p className="text-[8px] text-slate-400 italic leading-relaxed">
                  說明：此處系統分析每筆消費的分攤設定，計算每個人『付了多少』與『應該分攤多少』所得出的對沖結果。
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 2. 最近 10 筆紀錄 */}
      <section className="space-y-2.5 pt-1.5">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
            <span className="w-3.5 h-px bg-slate-350"></span>
            最近 10 筆紀錄
          </h3>
          <button
            onClick={() => onNavigateTo('list')}
            className="text-[9px] font-black text-indigo-650 bg-indigo-50/70 hover:bg-indigo-100/60 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
          >
            查看全部
          </button>
        </div>

        {/* List of items inside a premium borderless unified card */}
        <div className="bg-white rounded-3xl border border-slate-100/80 shadow-xs divide-y divide-slate-50 px-2 py-1">
          {expenses.slice(0, 10).map((item) => {
            const config = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG['其他'];
            return (
              <div
                key={item.id}
                onClick={() => onSelectExpense(item)}
                className="flex items-center justify-between py-3.5 px-3 hover:bg-slate-50/50 active:scale-[0.995] transition-all cursor-pointer group rounded-2xl"
              >
                <div className="flex items-center gap-3">
                  {/* Category icon block (Rounded-xl) */}
                  <div className={`w-9 h-9 ${config.bgColor} ${config.textColor} rounded-xl flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform`}>
                    <CategoryIcon name={config.iconName} className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-800">{item.note || item.category}</p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[9px] text-slate-400 font-medium font-mono">{item.date}</span>
                      <span className="text-[9px] text-slate-350 font-medium">•</span>
                      <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-md ${item.payer === nameA
                          ? 'bg-blue-50 text-blue-650'
                          : 'bg-pink-50 text-pink-650'
                        }`}>
                        {item.payer}付款
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right space-y-0.5">
                  <p className="text-xs font-black text-slate-800 font-mono">
                    NT$ {item.amount.toLocaleString()}
                  </p>
                  <p className="text-[9px] font-bold tracking-widest uppercase text-slate-400 shrink-0">
                    {item.category}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Decorative Bottom tip */}
      <div className="bg-slate-50/60 border border-slate-100/40 rounded-2xl p-4 flex items-start gap-3">
        <div className="p-1 text-slate-400 shrink-0">
          <CircleAlert className="w-4 h-4 text-slate-450" />
        </div>
        <p className="text-[9px] text-slate-400 leading-normal font-medium">
          共同記帳小知識：大筆支出（如：房租、水電費）由一人墊付後，系統可在此對沖計算。週年禮物等由一方全額贈送的禮品更可以用備用分攤獨立計算、不歸入情侶均分負擔哦！
        </p>
      </div>

    </div>
  );
}
