import { useState, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import {
  Heart,
  Signal,
  Wifi,
  Battery,
  Plus,
  LayoutDashboard,
  ClipboardList,
  Sparkles,
  LogOut,
  Menu,
  X,
  Settings,
  User,
  Save,
  Check,
  ChevronDown,
  ChevronUp,
  Calendar
} from 'lucide-react';
import { ExpenseItem, PayerType } from './types';
import Dashboard from './components/Dashboard';
import ExpenseDetailModal from './components/ExpenseDetailModal';
import AddExpenseForm from './components/AddExpenseForm';
import ExpenseList from './components/ExpenseList';
import LoginView from './components/LoginView';
import BindingView from './components/BindingView';

// Firebase core integration module
import {
  auth,
  db,
  ensureUserProfileExists,
  UserProfile,
  logoutUser,
  listenToExpenses,
  createFirestoreExpense,
  deleteFirestoreExpense,
  mergeUnboundExpenses,
  updateUserInfo,
  enterIndividualMode
} from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';

export default function App() {
  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseItem | null>(null);
  const [currentView, setCurrentView] = useState<'dashboard' | 'add' | 'list' | 'binding'>('dashboard');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState('16:02');
  const [authLoading, setAuthLoading] = useState(true);

  // Drawer and profile edit states
  const [showDrawer, setShowDrawer] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhotoURL, setEditPhotoURL] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Archive space switcher
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);

  // Calendar states (lifted from Dashboard)
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    if (currentUserProfile) {
      setEditName(currentUserProfile.displayName || '');
      setEditPhotoURL(currentUserProfile.photoURL || '');
    }
  }, [currentUserProfile]);

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      triggerToast("❌ 姓名不能為空喔！");
      return;
    }
    setIsSavingProfile(true);
    try {
      await updateUserInfo(currentUserProfile!, editName.trim(), editPhotoURL);
      triggerToast("✅ 個人設定已儲存更新！");
      setShowDrawer(false);
    } catch (err) {
      console.error("Failed to update user profile info:", err);
      triggerToast("❌ 儲存失敗，請重試");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // 1. Listen to real Firebase Auth states
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (!user) {
        setCurrentUserProfile(null);
        setExpenses([]);
        setAuthLoading(false);
      } else {
        try {
          // Fetch or initialize user profile state
          const profile = await ensureUserProfileExists(user);
          setCurrentUserProfile(profile);

          // Listen in real-time to profile changes (symmetrical pairing events!)
          const unsubscribeProfile = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
            if (docSnap.exists()) {
              setCurrentUserProfile(docSnap.data() as UserProfile);
            }
          });

          // cleanup inner listener on overall auth change
          return () => {
            unsubscribeProfile();
          };
        } catch (error) {
          console.error("Profile synchronization failure:", error);
          setAuthLoading(false);
        }
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Reset selected space when user re-binds (spaceId changes)
  useEffect(() => {
    setSelectedSpaceId(null);
  }, [currentUserProfile?.spaceId]);

  // 2. Real-time synchronizations of space expenses and auto merging
  useEffect(() => {
    if (!currentUserProfile) return;

    setAuthLoading(false);
    const isBound = currentUserProfile.status === 'bound';
    const isIndividual = currentUserProfile.status === 'individual';
    const activeSpaceId = currentUserProfile.spaceId || '';
    const viewingArchive = selectedSpaceId && selectedSpaceId !== activeSpaceId;

    // Determine which spaceId to subscribe to
    let querySpaceId = '';
    if (viewingArchive) {
      querySpaceId = selectedSpaceId!;
    } else if ((isBound || isIndividual) && activeSpaceId) {
      querySpaceId = activeSpaceId;
    } else {
      setExpenses([]);
      return;
    }

    // A. Trigger one-time safe merge only for active (non-archive) bound space
    if (!viewingArchive && isBound && currentUserProfile.partnerUid) {
      const handleMerge = async () => {
        try {
          const mergedCount = await mergeUnboundExpenses(
            currentUserProfile.uid,
            querySpaceId,
            currentUserProfile.partnerUid
          );
          if (mergedCount > 0) {
            triggerToast(`✨ 已成功將您個人先前記帳的 ${mergedCount} 筆消費，安全合併至共同空間！`);
          }
        } catch (error) {
          console.error("Merge error details: ", error);
        }
      };
      handleMerge();
    }

    // B. Maintain live real-time observer
    const unsubscribeLiveExpenses = listenToExpenses(
      querySpaceId,
      (items) => {
        const nameSelf = currentUserProfile.displayName || '我';
        const namePartner = currentUserProfile.partnerName || '另一半';
        const uidSelf = currentUserProfile.uid;
        const uidPartner = currentUserProfile.partnerUid;

        const resolveUser = (payerId: string | undefined, payerName: string) => {
          if (payerId === uidSelf) return nameSelf;
          if (payerId === uidPartner) return namePartner;

          const cleanName = (payerName || '').trim();
          if (cleanName === nameSelf) return nameSelf;
          if (cleanName === namePartner) return namePartner;

          if (cleanName === '阿明' || cleanName === '我') {
            if (nameSelf === '小美' || nameSelf.includes('小美')) {
              return namePartner;
            }
            if (namePartner === '小美' || namePartner.includes('小美')) {
              return nameSelf;
            }
            if (nameSelf.includes('阿明')) return nameSelf;
            if (namePartner.includes('阿明')) return namePartner;
            return nameSelf;
          }

          if (cleanName === '小美' || cleanName === '另一半') {
            if (nameSelf === '阿明' || nameSelf.includes('阿明')) {
              return namePartner;
            }
            if (namePartner === '阿明' || namePartner.includes('阿明')) {
              return nameSelf;
            }
            if (nameSelf.includes('小美')) return nameSelf;
            if (namePartner.includes('小美')) return namePartner;
            return namePartner;
          }

          return cleanName || payerName;
        };

        const mapped = items.map(item => {
          const mappedPayer = resolveUser(item.payerId, item.payer);
          
          let mappedFullBearer = item.split.fullBearer;
          if (item.split.type === 'single') {
            mappedFullBearer = resolveUser(item.split.fullBearerId, item.split.fullBearer || '');
          }

          let mappedCustomShares = item.split.customShares;
          if (item.split.type === 'custom' && item.split.customShares) {
            mappedCustomShares = {};
            Object.entries(item.split.customShares).forEach(([k, v]) => {
              const resolvedKey = resolveUser(undefined, k);
              mappedCustomShares![resolvedKey] = v;
            });
          }

          return {
            ...item,
            payer: mappedPayer,
            split: {
              ...item.split,
              fullBearer: mappedFullBearer,
              customShares: mappedCustomShares
            }
          };
        });

        setExpenses(mapped);
      },
      (error) => {
        console.error("Expenses subscription failure:", error);
      }
    );

    return () => unsubscribeLiveExpenses();
  }, [currentUserProfile?.status, currentUserProfile?.spaceId, currentUserProfile?.uid, currentUserProfile?.partnerUid, selectedSpaceId]);

  // Phone Mock Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours();
      let minutes = now.getMinutes();
      const strHours = hours < 10 ? `0${hours}` : `${hours}`;
      const strMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
      setCurrentTime(`${strHours}:${strMinutes}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleExportCSV = () => {
    if (expenses.length === 0) {
      triggerToast("⚠️ 目前沒有任何帳務紀錄可以匯出喔！");
      return;
    }

    const nameA = currentUserProfile?.displayName || '我';
    const nameB = currentUserProfile?.partnerName || '另一半';

    // CSV Headers
    const headers = ['日期', '分類', '金額', '代墊人', '分攤方式', '詳細分攤', `${nameA}應付份額`, `${nameB}應付份額`, '備註'];

    // Map rows
    const rows = expenses.map(item => {
      let splitTypeLabel = '';
      let splitDetailLabel = '';
      let shareAmountA = 0;
      let shareAmountB = 0;

      const amt = item.amount;

      if (item.split.type === '50/50') {
        splitTypeLabel = '50/50 均分';
        splitDetailLabel = `雙方均分 50%`;
        shareAmountA = amt / 2;
        shareAmountB = amt / 2;
      } else if (item.split.type === 'single') {
        splitTypeLabel = '單人全額';
        const bearer = item.split.fullBearer || item.payer;
        splitDetailLabel = `由 ${bearer} 負擔全部`;
        if (bearer === nameA) {
          shareAmountA = amt;
          shareAmountB = 0;
        } else {
          shareAmountA = 0;
          shareAmountB = amt;
        }
      } else if (item.split.type === 'custom') {
        splitTypeLabel = '自訂比例';
        const shares = item.split.customShares || {};
        const percentA = shares[nameA] !== undefined ? shares[nameA] : 50;
        const percentB = shares[nameB] !== undefined ? shares[nameB] : 50;
        splitDetailLabel = `${nameA}: ${percentA}%, ${nameB}: ${percentB}%`;
        shareAmountA = (amt * percentA) / 100;
        shareAmountB = (amt * percentB) / 100;
      }

      // Escape quotes and wrap notes in quotes
      const cleanNote = (item.note || '').replace(/"/g, '""');

      return [
        item.date,
        item.category,
        amt,
        item.payer,
        splitTypeLabel,
        splitDetailLabel,
        Math.round(shareAmountA),
        Math.round(shareAmountB),
        `"${cleanNote}"`
      ];
    });

    // Create CSV content with UTF-8 BOM to prevent Chinese character corruption in Excel
    const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    // Trigger file download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Together_Ledger_帳務報表_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    triggerToast("📥 帳務報表 CSV 檔案已成功匯出並下載！");
  };

  const handleNavigate = (view: 'dashboard' | 'add' | 'list' | 'binding') => {
    setCurrentView(view);
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      triggerToast('🚶 帳號已安全儲存登出。');
    } catch (error) {
      console.error(error);
    }
  };

  const handleEnterIndividual = async () => {
    if (!currentUserProfile) return;
    try {
      await enterIndividualMode(currentUserProfile.uid);
      triggerToast('📔 已進入個人記帳模式！');
    } catch (err) {
      console.error(err);
      triggerToast('無法切換至個人模式，請重試。');
    }
  };

  // Check if fully paired in real-time
  const isBound = currentUserProfile?.status === 'bound';
  const isIndividual = currentUserProfile?.status === 'individual';
  const showMainApp = isBound || isIndividual;

  // Archived space switcher helpers
  const archivedSpaces = currentUserProfile?.archivedSpaces || [];
  const activeSpaceId = currentUserProfile?.spaceId || '';
  const isReadOnlySpace = !!(selectedSpaceId && selectedSpaceId !== activeSpaceId);
  const currentArchiveLabel = isReadOnlySpace
    ? archivedSpaces.find(s => s.spaceId === selectedSpaceId)?.partnerName || '封存帳本'
    : null;

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-0 md:p-6 transition-colors duration-300">
      
      {/* Phone Mockup Frame */}
      <div className="w-full max-w-md h-screen md:h-[860px] bg-white md:rounded-[44px] md:border-[10px] md:border-slate-900 flex flex-col relative md:shadow-2xl overflow-hidden transition-all duration-300">
        
        {/* Sidebar Settings Drawer Overlay */}
        {currentUserProfile && showMainApp && (
          <div
            className={`absolute inset-0 z-50 pointer-events-none transition-all duration-300 ${
              showDrawer ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {/* Backdrop overlay */}
            <div
              onClick={() => setShowDrawer(false)}
              className={`absolute inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity duration-300 ${
                showDrawer ? 'opacity-100 pointer-events-auto' : 'opacity-0'
              }`}
            />

            {/* Sidebar drawer container */}
            <div
              className={`absolute top-0 left-0 h-full w-[80%] max-w-[320px] bg-white flex flex-col shadow-2xl pointer-events-auto transition-transform duration-300 ease-out transform ${
                showDrawer ? 'translate-x-0' : '-translate-x-full'
              }`}
            >
              {/* Drawer Header */}
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                <span className="text-xs font-black uppercase tracking-widest text-slate-400">詳細設定</span>
                <button
                  onClick={() => setShowDrawer(false)}
                  className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6">
                
                {/* 1. Profile Editing Card */}
                <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4">
                  <button
                    onClick={() => setShowProfileSettings(!showProfileSettings)}
                    className="w-full flex items-center justify-between text-left focus:outline-none cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-indigo-500" />
                      <span className="text-xs font-black text-slate-700">個人資訊設定</span>
                    </div>
                    {showProfileSettings ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </button>

                  {/* Collapsible Content Drawer */}
                  {showProfileSettings && (
                    <div className="mt-4 space-y-4 animate-fade-in-down">
                      {/* Avatar Preview & Presets */}
                      <div className="space-y-3">
                        <label className="text-[10px] font-bold text-slate-400 block uppercase">個人頭像選擇</label>
                        <div className="flex items-center gap-4">
                          {/* Avatar preview */}
                          <div className="relative w-12 h-12 rounded-full overflow-hidden border border-slate-200 shrink-0">
                            <img
                              src={editPhotoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop'}
                              alt="頭像預覽"
                              className="w-full h-full object-cover"
                            />
                          </div>

                          {/* Presets Row */}
                          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                            {[
                              'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=100&h=100&fit=crop', // Dog
                              'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=100&h=100&fit=crop', // Cat
                              'https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=100&h=100&fit=crop', // Fox
                              'https://images.unsplash.com/photo-1589656966895-2f33e7653819?w=100&h=100&fit=crop', // Bear
                              'https://images.unsplash.com/photo-1598153346810-860daa814c4b?w=100&h=100&fit=crop'  // Chick
                            ].map((url, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => setEditPhotoURL(url)}
                                className={`w-7 h-7 rounded-full overflow-hidden border transition-all cursor-pointer relative shrink-0 ${
                                  editPhotoURL === url ? 'ring-2 ring-indigo-500 border-transparent' : 'border-slate-200 hover:scale-105'
                                }`}
                              >
                                <img src={url} alt="preset" className="w-full h-full object-cover" />
                                {editPhotoURL === url && (
                                  <div className="absolute inset-0 bg-indigo-600/30 flex items-center justify-center">
                                    <Check className="w-3 h-3 text-white stroke-[3]" />
                                  </div>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Custom Image URL input */}
                        <div className="space-y-1">
                          <span className="text-[9px] text-slate-400 block">或貼上自訂頭像網址 (URL)：</span>
                          <input
                            type="text"
                            value={editPhotoURL}
                            onChange={(e) => setEditPhotoURL(e.target.value)}
                            placeholder="請輸入頭像圖片網址"
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] focus:outline-none focus:border-indigo-400"
                          />
                        </div>
                      </div>

                      {/* Name Input */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 block uppercase">個人姓名 / 暱稱</label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="請輸入您的姓名"
                          maxLength={12}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 font-bold focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <button
                        onClick={handleSaveProfile}
                        disabled={isSavingProfile}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold py-2 px-3 rounded-xl text-xs transition-all active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-indigo-100"
                      >
                        <Save className="w-3.5 h-3.5" />
                        {isSavingProfile ? '儲存中...' : '儲存設定'}
                      </button>
                    </div>
                  )}
                </div>

                {/* 2. Menu Placeholders */}
                <div className="space-y-2 pt-2">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider pl-1">其他設定項目</span>
                  
                  <button
                    onClick={() => {
                      setCurrentView('binding');
                      setShowDrawer(false);
                    }}
                    className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100/70 border border-slate-100 rounded-xl transition-all text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-2 text-slate-705">
                      <Heart className="w-4 h-4 text-rose-500 fill-rose-100" />
                      <span className="text-xs font-bold">伴侶與帳本連結</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 group-hover:translate-x-0.5 transition-transform">→</span>
                  </button>

                  <div className="w-full flex items-center justify-between p-3 bg-slate-50/50 border border-slate-100 opacity-60 rounded-xl text-left cursor-not-allowed">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Settings className="w-4 h-4 text-slate-400" />
                      <span className="text-xs font-medium">消費分類設定 (開發中)</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      handleExportCSV();
                      setShowDrawer(false);
                    }}
                    className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100/70 border border-slate-100 rounded-xl transition-all text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-2 text-slate-705">
                      <ClipboardList className="w-4 h-4 text-indigo-500" />
                      <span className="text-xs font-bold">帳務報表匯出 (CSV)</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 group-hover:translate-x-0.5 transition-transform">→</span>
                  </button>

                  {/* 登出帳號按鈕 */}
                  <div className="pt-4 border-t border-slate-100/80">
                    <button
                      onClick={() => {
                        handleLogout();
                        setShowDrawer(false);
                      }}
                      className="w-full flex items-center justify-center gap-2 p-2.5 bg-rose-50 hover:bg-rose-100/85 border border-rose-100/40 text-rose-600 rounded-xl transition-all font-extrabold text-xs cursor-pointer active:scale-98"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>登出帳號</span>
                    </button>
                  </div>
                </div>

              </div>

              {/* Drawer Footer */}
              <div className="p-5 border-t border-slate-100 bg-slate-50/40 text-center shrink-0">
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Together Ledger v1.0</p>
              </div>
            </div>
          </div>
        )}

        {/* Notch */}
        <div className="hidden md:block absolute top-0 left-1/2 -translate-x-1/2 w-40 h-6 bg-slate-900 rounded-b-2xl z-40"></div>

        {/* Status Bar */}
        <div className="h-10 bg-white/95 sticky top-0 z-30 flex items-center justify-between px-6 pt-2 shrink-0 border-b border-slate-50 select-none animate-fade-in">
          <span className="text-xs font-bold font-mono tracking-tight text-slate-705">
            {currentTime}
          </span>
          <div className="flex items-center gap-1.5 text-slate-700">
            <Signal className="w-3.5 h-3.5 fill-current" />
            <Wifi className="w-3.5 h-3.5" />
            <Battery className="w-4 h-4 fill-current rotate-0" />
          </div>
        </div>

        {/* Global Toast inside frame */}
        <AnimatePresence>
          {toastMessage && (
            <div className="absolute top-14 left-4 right-4 z-50 bg-slate-950 border border-slate-800 text-white p-3.5 rounded-2xl shadow-xl flex items-start gap-2.5 outline-none animate-bounce-short">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-200 font-semibold leading-normal flex-1">
                {toastMessage}
              </p>
            </div>
          )}
        </AnimatePresence>

        {/* Loading cover */}
        {authLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-3 bg-slate-50">
            <div className="w-8 h-8 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin"></div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">載入即時雲端記帳本...</p>
          </div>
        ) : (
          <>
            {/* Header bar - only show when in main app */}
            {currentUserProfile && showMainApp && (
              <header className="bg-white sticky top-0 z-20 px-6 py-1 flex justify-between items-center shrink-0 border-b border-slate-50 select-none">
                <button
                  onClick={() => setShowDrawer(true)}
                  className="p-2 hover:bg-slate-100 active:scale-95 text-slate-500 hover:text-slate-800 rounded-xl transition-all cursor-pointer focus:outline-none"
                  aria-label="選單"
                >
                  <Menu className="w-5 h-5" />
                </button>

                {/* Space Switcher - shows if archived spaces exist */}
                {archivedSpaces.length > 0 && (
                  <div className="flex-1 mx-3 relative">
                    <select
                      value={selectedSpaceId || activeSpaceId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedSpaceId(val === activeSpaceId ? null : val);
                        setSelectedDate(null);
                      }}
                      className="w-full text-[10px] font-black text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 appearance-none focus:outline-none focus:border-indigo-400 cursor-pointer pr-6 truncate"
                    >
                      <option value={activeSpaceId}>📌 目前帳本</option>
                      {archivedSpaces.map((s) => (
                        <option key={s.spaceId} value={s.spaceId}>
                          📁 與 {s.partnerName} 的存檔 (唯讀)
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                )}

                <button
                  onClick={() => setShowCalendar(!showCalendar)}
                  className={`p-2 hover:bg-slate-100 active:scale-95 rounded-xl transition-all cursor-pointer focus:outline-none ${
                    showCalendar ? 'text-indigo-650 bg-indigo-50' : 'text-slate-500 hover:text-slate-800'
                  }`}
                  aria-label="日曆"
                  title={showCalendar ? '隱藏日曆' : '查看日曆'}
                >
                  <Calendar className="w-5 h-5" />
                </button>
              </header>
            )}

            {/* Read-only archive banner */}
            {isReadOnlySpace && (
              <div className="bg-amber-50 border-b border-amber-200/70 px-4 py-2 flex items-center gap-2 shrink-0">
                <span className="text-[10px] font-black text-amber-700 tracking-wide">
                  📁 唯讀封存帳本：與「{currentArchiveLabel}」的歷史紀錄
                </span>
                <button
                  onClick={() => setSelectedSpaceId(null)}
                  className="ml-auto text-[9px] font-extrabold text-amber-600 hover:text-amber-800 bg-amber-100 hover:bg-amber-200 px-2 py-0.5 rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  返回目前帳本
                </button>
              </div>
            )}



            {/* Main view router switcher */}
            <main className="flex-1 overflow-y-auto flex flex-col bg-[#f8fafc] relative">
              {!firebaseUser ? (
                <LoginView
                  onLoginSuccess={(user) => {
                    triggerToast(`🔓 登入成功！歡迎。`);
                  }}
                />
              ) : !showMainApp ? (
                <HoldingBindingView
                  currentUserProfile={currentUserProfile}
                  onLogout={handleLogout}
                  onSuccessBind={() => {
                    triggerToast('❤️ 恭喜！雙方成功互相綁定金鑰，快來記錄第一筆支出吧！');
                  }}
                  triggerToast={triggerToast}
                  onExportCSV={handleExportCSV}
                  onEnterIndividual={handleEnterIndividual}
                />
              ) : (
                <>
                  {currentView === 'binding' && (
                    <HoldingBindingView
                      currentUserProfile={currentUserProfile}
                      onLogout={handleLogout}
                      onSuccessBind={() => {
                        triggerToast('❤️ 恭喜！雙方成功互相綁定金鑰，快來記錄第一筆支出吧！');
                        setCurrentView('dashboard');
                      }}
                      triggerToast={triggerToast}
                      onExportCSV={handleExportCSV}
                    />
                  )}
                  {currentView === 'dashboard' && (
                    <Dashboard
                      expenses={expenses}
                      currentUserProfile={currentUserProfile}
                      onSelectExpense={(item) => setSelectedExpense(item)}
                      onNavigateTo={(view) => handleNavigate(view as any)}
                      showCalendar={showCalendar}
                      setShowCalendar={setShowCalendar}
                      selectedDate={selectedDate}
                      setSelectedDate={setSelectedDate}
                      isReadOnly={isReadOnlySpace}
                      isIndividual={isIndividual}
                    />
                  )}

                  {currentView === 'add' && !isReadOnlySpace && (
                    <AddExpenseForm
                      currentUserProfile={currentUserProfile}
                      isIndividual={isIndividual}
                      onAddExpense={async (newExpense) => {
                        try {
                          await createFirestoreExpense(
                            currentUserProfile.spaceId || '',
                            currentUserProfile.partnerUid || '',
                            newExpense
                          );
                          setCurrentView('dashboard');
                          triggerToast('🎉 成功記入雲端帳本，即時分攤完畢！');
                        } catch (err) {
                          console.error(err);
                          triggerToast('記帳失敗，請確認資料格式。');
                        }
                      }}
                      onCancel={() => setCurrentView('dashboard')}
                    />
                  )}
                  {currentView === 'list' && (
                    <ExpenseList
                      expenses={expenses}
                      currentUserProfile={currentUserProfile}
                      onSelectExpense={(item) => setSelectedExpense(item)}
                    />
                  )}
                </>
              )}
            </main>

            {/* Navigation buttons */}
            {currentUserProfile && showMainApp && !isReadOnlySpace && (
              <nav className="h-20 bg-white border-t border-slate-100/60 sticky bottom-0 z-30 flex justify-center items-center px-10 shrink-0 pb-4 select-none animate-fade-in-up">
                {/* 新增支出 Centered Plus */}
                <button
                  onClick={() => handleNavigate('add')}
                  className="flex items-center justify-center w-14 h-14 bg-indigo-600 hover:bg-indigo-505 text-white rounded-full shadow-lg hover:shadow-xl transition-all active:scale-95 focus:outline-none -translate-y-4 border-4 border-white cursor-pointer"
                  aria-label="新增支出"
                >
                  <Plus className="w-6 h-6 stroke-[3]" />
                </button>
              </nav>
            )}


            {/* Bottom Home Indicator */}
            <div className="hidden md:block absolute bottom-1.5 left-1/2 -translate-x-1/2 w-32 h-1 bg-slate-405/50 rounded-full z-40"></div>
          </>
        )}
      </div>

      {/* Expense Detail slides */}
      <AnimatePresence>
        {selectedExpense && (
          <ExpenseDetailModal
            expense={selectedExpense}
            currentUserProfile={currentUserProfile}
            onClose={() => setSelectedExpense(null)}
            onDeleteExpense={isReadOnlySpace ? undefined : async (id) => {
              try {
                await deleteFirestoreExpense(id);
                setSelectedExpense(null);
                triggerToast('🗑️ 已成功自雲端移除本筆支出。');
              } catch (error) {
                console.error(error);
                triggerToast('刪除錯誤。');
              }
            }}
          />
        )}
      </AnimatePresence>

    </div>
  );
}

// Wrapper component to guard null state profiles elegantly
function HoldingBindingView({ currentUserProfile, ...otherProps }: any) {
  if (!currentUserProfile) return null;
  return <BindingView currentUserProfile={currentUserProfile} {...otherProps} />;
}
