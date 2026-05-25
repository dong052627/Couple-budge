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
  LogOut
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
  mergeUnboundExpenses
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

  // 2. Real-time synchronizations of space expenses and auto merging
  useEffect(() => {
    if (!currentUserProfile) return;

    setAuthLoading(false);
    const isBound = currentUserProfile.status === 'bound';
    
    // If not bound, do not attempt to subscribe to expenses or merge
    if (!isBound) {
      setExpenses([]);
      return;
    }

    const querySpaceId = currentUserProfile.spaceId;
    if (!querySpaceId) return;

    // A. Trigger one-time safe merge if newly bound
    if (currentUserProfile.partnerUid) {
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
        setExpenses(items);
      },
      (error) => {
        console.error("Expenses subscription failure:", error);
      }
    );

    return () => unsubscribeLiveExpenses();
  }, [currentUserProfile?.status, currentUserProfile?.spaceId, currentUserProfile?.uid, currentUserProfile?.partnerUid]);

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

  const handleNavigate = (view: 'dashboard' | 'add' | 'list' | 'binding') => {
    setCurrentView(view);
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      triggerToast('🚪 帳號已安全儲存登出。');
    } catch (error) {
      console.error(error);
    }
  };

  // Check if fully paired in real-time
  const isBound = currentUserProfile?.status === 'bound';

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-0 md:p-6 transition-colors duration-300">
      
      {/* Phone Mockup Frame */}
      <div className="w-full max-w-md h-screen md:h-[860px] bg-white md:rounded-[44px] md:border-[10px] md:border-slate-900 flex flex-col relative md:shadow-2xl overflow-hidden transition-all duration-300">
        
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
            {/* Header bar - only show if bound success */}
            {currentUserProfile && isBound && (
              <header className="bg-white sticky top-0 z-20 px-6 py-5 flex justify-between items-center shrink-0 border-b border-slate-50 select-none">
                <div>
                  <h1 className="text-xl font-black tracking-tight text-slate-800 underline decoration-indigo-505 decoration-4 underline-offset-4">
                    我們記帳吧！
                  </h1>
                  <p className="text-[10px] text-slate-400 mt-2 uppercase tracking-widest font-bold">
                    Together Ledger • Joint Active
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100 shrink-0">
                    <Heart className="w-4 h-4 text-rose-500 fill-current" />
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-full transition-colors cursor-pointer"
                    title="登出帳號"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </header>
            )}

            {/* Main view router switcher */}
            <main className="flex-1 overflow-y-auto flex flex-col bg-[#f8fafc] relative">
              {!firebaseUser ? (
                <LoginView
                  onLoginSuccess={(user) => {
                    triggerToast(`🔓 登入成功！歡迎。`);
                  }}
                />
              ) : !isBound ? (
                <HoldingBindingView
                  currentUserProfile={currentUserProfile}
                  onLogout={handleLogout}
                  onSuccessBind={() => {
                    triggerToast('❤️ 恭喜！雙方成功互相綁定金鑰，快來記錄第一筆支出吧！');
                  }}
                  triggerToast={triggerToast}
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
                    />
                  )}
                  {currentView === 'dashboard' && (
                    <Dashboard
                      expenses={expenses}
                      currentUserProfile={currentUserProfile}
                      onSelectExpense={(item) => setSelectedExpense(item)}
                      onNavigateTo={(view) => handleNavigate(view as any)}
                    />
                  )}
                  {currentView === 'add' && (
                    <AddExpenseForm
                      currentUserProfile={currentUserProfile}
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
            {currentUserProfile && isBound && (
              <nav className="h-20 bg-white border-t border-slate-100/60 sticky bottom-0 z-30 flex justify-around items-center px-10 shrink-0 pb-4 select-none animate-fade-in-up">
                
                {/* 首頁 */}
                <button
                  onClick={() => handleNavigate('dashboard')}
                  className={`flex flex-col items-center gap-1.5 transition-all outline-none cursor-pointer ${
                    currentView === 'dashboard' ? 'text-indigo-600 scale-102' : 'text-slate-400 hover:text-slate-500'
                  }`}
                >
                  <div className={`p-1 rounded-lg ${currentView === 'dashboard' ? 'bg-indigo-50' : ''}`}>
                    <LayoutDashboard className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-black tracking-wide uppercase">首頁</span>
                </button>
                
                {/* 新增支出 Centered Plus */}
                <button
                  onClick={() => handleNavigate('add')}
                  className="flex items-center justify-center w-14 h-14 bg-indigo-600 hover:bg-indigo-505 text-white rounded-full shadow-lg hover:shadow-xl transition-all active:scale-95 focus:outline-none -translate-y-4 border-4 border-white cursor-pointer"
                  aria-label="新增支出"
                >
                  <Plus className="w-6 h-6 stroke-[3]" />
                </button>

                {/* 伴侶設定 (移到新增消費按鈕右邊) */}
                <button
                  onClick={() => handleNavigate('binding')}
                  className={`flex flex-col items-center gap-1.5 transition-all outline-none cursor-pointer ${
                    currentView === 'binding' ? 'text-indigo-600 scale-102' : 'text-slate-400 hover:text-slate-500'
                  }`}
                >
                  <div className={`p-1 rounded-lg ${currentView === 'binding' ? 'bg-indigo-50' : ''}`}>
                    <Heart className={`w-5 h-5 transition-colors ${currentView === 'binding' ? 'text-rose-500 fill-rose-200' : 'text-slate-400 hover:text-slate-500'}`} />
                  </div>
                  <span className={`text-[10px] font-black tracking-wide uppercase transition-colors ${
                    currentView === 'binding' ? 'text-indigo-600' : 'text-slate-400'
                  }`}>
                    伴侶設定
                  </span>
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
            onDeleteExpense={async (id) => {
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
