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
    <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6 pb-24">

      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-xs bg-slate-900 border border-slate-800 text-white rounded-xl shadow-2xl p-3 flex items-center gap-2.5 animate-bounce-short">
          <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs font-semibold leading-relaxed">{toastMessage}</p>
        </div>
      )}

      {/* Hero Welcome Message */}
      <div className="bg-gradient-to-r from-indigo-50 to-indigo-100/50 rounded-2xl p-4 flex items-center justify-between border border-indigo-100">
        <div className="space-y-1 block">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600">
            <Sparkles className="w-3.5 h-3.5" />
            <span>5 月生活手札已開啟</span>
          </div>
          <p className="text-xs text-slate-500 leading-normal">
            本月兩人已共同記帳 <span className="font-bold text-slate-800">{expenses.length}</span> 筆費用，攜手向前！
          </p>
        </div>
        <div className="bg-white p-2 text-indigo-500 rounded-xl shadow-xs shrink-0 flex items-center justify-center">
          <Award className="w-5 h-5" />
        </div>
      </div>

      {/* 1. 本月共同支出總額卡片 */}
      <section className="bg-indigo-600 rounded-3xl p-6 text-white shadow-lg shadow-indigo-100 relative overflow-hidden transition-all hover:scale-[1.01]">
        <div className="absolute -right-6 -bottom-6 opacity-8">
          <Coins className="w-36 h-36 text-indigo-550" />
        </div>
        <span className="text-[10px] font-bold opacity-80 uppercase tracking-widest block mb-1">本月共同支出總額</span>
        <div className="text-3xl font-black mt-1 flex items-baseline gap-1.5 leading-none">
          <span>NT$ {stats.totalExpense.toLocaleString()}</span>
          <span className="text-sm font-normal opacity-70">TWD</span>
        </div>

        <div className="mt-8 space-y-2">
          <div className="flex justify-between text-[10px] font-bold">
            <span className="text-blue-200">{nameA}消費占比 ({pctA.toFixed(0)}%)</span>
            <span className="text-pink-200">{nameB}消費占比 ({pctB.toFixed(0)}%)</span>
          </div>
          <div className="w-full h-2 bg-indigo-800 rounded-full overflow-hidden flex">
            {/* 阿明佔比 */}
            <div
              className="bg-blue-400 h-full transition-all duration-500"
              style={{ width: `${pctA}%` }}
            ></div>
            {/* 小美佔比 */}
            <div
              className="bg-pink-400 h-full transition-all duration-500"
              style={{ width: `${pctB}%` }}
            ></div>
          </div>
        </div>
      </section>

      {/* 2. 兩人已付款統計與分攤狀態 */}
      <section className="grid grid-cols-2 gap-3">
        {/* 阿明卡片 */}
        <div className="border border-slate-100 bg-white p-3.5 rounded-2xl transition-all hover:border-slate-200">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500 shadow-sm"></span>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{nameA}已付</span>
          </div>
          <div className="text-lg font-bold text-slate-800">NT$ {stats.paidA.toLocaleString()}</div>
        </div>

        {/* 小美卡片 */}
        <div className="border border-slate-100 bg-white p-3.5 rounded-2xl transition-all hover:border-slate-200">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-pink-500 shadow-sm"></span>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{nameB}已付</span>
          </div>
          <div className="text-lg font-bold text-slate-800">NT$ {stats.paidB.toLocaleString()}</div>
        </div>

        {/* 結算提示欄 */}
        <div className="col-span-2 bg-slate-900 text-white p-4 rounded-2xl flex flex-col gap-3 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] opacity-70 font-semibold tracking-wide uppercase">結算狀態</span>
            <div className="text-xs font-bold text-indigo-300">
              {stats.debtor === 'none' ? (
                <span>目前雙方無欠款，平帳中 ⚖️</span>
              ) : cloudTransferred <= 0 ? (
                <span>{stats.debtor} 需給 {stats.creditor} NT$ {stats.debtAmount.toLocaleString()}</span>
              ) : cloudTransferred < stats.debtAmount ? (
                <span>{stats.debtor} 需給 {stats.creditor} NT$ {(stats.debtAmount - cloudTransferred).toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">(已轉交 NT$ {cloudTransferred.toLocaleString()})</span></span>
              ) : (
                <span>🎉 {stats.debtor} 已全額付清！ (已轉交 NT$ {cloudTransferred.toLocaleString()})</span>
              )}
            </div>
          </div>

          {stats.debtor !== 'none' && (
            <div className="border-t border-slate-850 pt-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">本次手動轉交</span>
                {cloudTransferred > 0 && (
                  <button
                    onClick={handleClearTransferred}
                    disabled={isSavingTransferred}
                    className="text-[9px] text-rose-400 hover:text-rose-300 font-medium hover:underline cursor-pointer shrink-0"
                    title="清除所有已轉交金額記錄"
                  >
                    (清除記錄)
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 font-bold">NT$</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={localIncrement || ''}
                    onChange={(e) => setLocalIncrement(Number(e.target.value))}
                    className="w-16 bg-transparent text-white text-xs font-extrabold focus:outline-none text-right placeholder:text-slate-700 font-mono"
                  />
                </div>
                {localIncrement > 0 && (
                  <button
                    onClick={handleSaveTransferred}
                    disabled={isSavingTransferred}
                    className="bg-indigo-650 hover:bg-indigo-550 disabled:opacity-50 text-[10px] font-black text-white px-3 py-1 rounded-lg transition-all active:scale-95 cursor-pointer shrink-0"
                  >
                    {isSavingTransferred ? '儲存中...' : '確認'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* COLLAPSIBLE MATHEMATICAL EXPLANATION */}
          <div className="border-t border-slate-800 pt-2 shrink-0">
            <button
              onClick={() => setShowMath(!showMath)}
              className="w-full flex items-center justify-between text-[10px] font-bold text-slate-400 hover:text-white focus:outline-none py-0.5"
            >
              <span>查看結算公式與統計細節</span>
              {showMath ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showMath && (
              <div className="mt-2.5 text-[10px] text-slate-300 bg-slate-950/80 rounded-xl p-3 space-y-2 border border-slate-800/80 animate-fade-in-down leading-relaxed">
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-400">本月兩人共同總消費：</span>
                  <span className="font-bold text-white">NT$ {stats.totalExpense.toLocaleString()}</span>
                </div>
                <div className="h-[1px] bg-slate-800/80 my-1"></div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <p className="font-bold text-blue-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
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
                  <div className="space-y-1 border-l border-slate-800 pl-2">
                    <p className="font-bold text-pink-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-pink-500"></span>
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
                    <div className="h-[1px] bg-slate-800/80 my-1"></div>
                    <div className="space-y-1.5 leading-relaxed">
                      <p className="font-bold text-indigo-300 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-400" />
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

                <div className="h-[1px] bg-slate-800/80 my-1"></div>
                <p className="text-[9px] text-slate-400 italic leading-relaxed">
                  說明：此處系統分析每筆消費的分攤設定，計算每個人『付了多少』與『應該分攤多少』所得出的對沖結果。
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 3. 最近 10 筆紀錄 */}
      <section className="space-y-3 pt-1">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
            <span className="w-4 h-px bg-slate-300"></span>
            最近 10 筆紀錄
          </h3>
          <button
            onClick={() => onNavigateTo('list')}
            className="text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100/60 px-3 py-1 rounded-lg transition-colors cursor-pointer"
          >
            查看全部
          </button>
        </div>

        {/* List of items */}
        <div className="space-y-2 pb-1">
          {expenses.slice(0, 10).map((item) => {
            const config = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG['其他'];
            return (
              <div
                key={item.id}
                onClick={() => onSelectExpense(item)}
                className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100/60 rounded-2xl hover:border-indigo-100/60 hover:bg-slate-100/30 active:scale-99 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  {/* Category icon block (Rounded-xl) */}
                  <div className={`w-9 h-9 ${config.bgColor} ${config.textColor} rounded-xl flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform`}>
                    <CategoryIcon name={config.iconName} className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-800">{item.note || item.category}</p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[9px] text-slate-400 font-medium">{item.date}</span>
                      <span className="text-[9px] text-slate-300">•</span>
                      <span className={`text-[9.5px] font-bold px-2 py-0.2 rounded-full ${item.payer === nameA
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
          })}
        </div>
      </section>

      {/* Decorative Bottom tip */}
      <div className="bg-slate-50 border border-slate-100/60 rounded-2xl p-4 flex items-start gap-3">
        <div className="p-1 text-slate-400 shrink-0">
          <CircleAlert className="w-4 h-4" />
        </div>
        <p className="text-[10px] text-slate-500 leading-normal">
          共同記帳小知識：大筆支出（如：房租、水電費）由一人墊付後，系統可在此對沖計算。週年禮物等由一方全額贈送的禮品更可以用備用分攤獨立計算、不歸入情侶均分負擔哦！
        </p>
      </div>

    </div>
  );
}
