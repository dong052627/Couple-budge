import React, { useState } from 'react';
import { Heart, Sparkles, LogIn } from 'lucide-react';
import { signInWithGoogle } from '../firebase';

interface LoginViewProps {
  onLoginSuccess: (user: any) => void;
}

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const user = await signInWithGoogle();
      onLoginSuccess(user);
    } catch (error: any) {
      console.error('Google Sign In Error:', error);
      const errCode = error?.code || 'unknown';
      const errMsg = error?.message || '未知錯誤';
      
      if (errCode === 'auth/popup-closed-by-user') {
        setErrorMessage('登入視窗已被關閉，請再試一次。');
      } else if (errCode === 'auth/operation-not-allowed') {
        setErrorMessage(`登入失敗：請前往 Firebase Console 的 Authentication -> Sign-in method 啟用 Google 登入方式。 (${errCode})`);
      } else {
        setErrorMessage(`登入失敗：${errMsg} (${errCode})。請確認網路連線，或檢查 Firebase 控制台設定。`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between px-6 py-10 bg-[#f8fafc] text-slate-800">
      
      {/* Visual Header Branding */}
      <div className="flex-1 flex flex-col items-center justify-center space-y-8 animate-fade-in-down">
        
        {/* Soft floating dynamic icon block */}
        <div className="relative">
          <div className="w-20 h-20 bg-indigo-600 rounded-[28px] shadow-xl shadow-indigo-100 flex items-center justify-center transition-all hover:scale-105 duration-300">
            <Heart className="w-10 h-10 text-white fill-current animate-pulse-short" />
          </div>
          <div className="absolute -top-1 -right-1 bg-amber-400 text-slate-900 p-1.5 rounded-2xl shadow-md border-2 border-white">
            <Sparkles className="w-4 h-4 fill-current" />
          </div>
        </div>

        {/* Text presentation */}
        <div className="text-center space-y-2.5 max-w-xs">
          <h2 className="text-2xl font-black tracking-tight text-slate-800">
            我們記帳吧！
          </h2>
          <p className="text-xs text-slate-400 font-medium uppercase tracking-widest leading-relaxed">
            Together Ledger • 雲端對接版
          </p>
          <p className="text-xs text-slate-500 leading-relaxed pt-2">
            專為情侶、夫妻設計的共同記帳本。支援<strong> Firebase 雲端即時同步</strong>，免除繁瑣計算，用精準分攤見證生活點滴。
          </p>
        </div>

        {/* Error message if login fails */}
        {errorMessage && (
          <div className="w-full max-w-xs bg-rose-50 border border-rose-100 text-rose-700 py-2.5 px-3.5 rounded-2xl text-[10px] font-bold text-center">
            ⚠️ {errorMessage}
          </div>
        )}

      </div>

      {/* Primary Action Button Footer */}
      <div className="space-y-4 shrink-0 w-full max-w-xs mx-auto">
        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-700 text-white font-extrabold py-3.5 rounded-2xl text-xs tracking-widest transition-all active:scale-98 shadow-md flex items-center justify-center gap-2 cursor-pointer"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
            <LogIn className="w-4 h-4" />
          )}
          <span>使用 Google 帳號登入</span>
        </button>
        
        <p className="text-[9px] text-slate-400 text-center leading-relaxed">
          點擊上方將開啟安全 Google 彈出登入對話框。<br />
          系統使用 Firebase 安全儲存，您的密碼由 Google 保護而不經由我們處理。
        </p>
      </div>

    </div>
  );
}

