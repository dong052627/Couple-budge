import React, { useState } from 'react';
import {
  Heart,
  Copy,
  Check,
  ArrowRight,
  LogOut,
  AlertCircle
} from 'lucide-react';
import { UserProfile, submitPartnerInviteCode, unbindPartner, setupMockPartner } from '../firebase';

interface BindingViewProps {
  currentUserProfile: UserProfile;
  onLogout: () => void;
  onSuccessBind: () => void;
  triggerToast: (msg: string) => void;
}

export default function BindingView({
  currentUserProfile,
  onLogout,
  onSuccessBind,
  triggerToast,
}: BindingViewProps) {
  const [partnerInput, setPartnerInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [isBinding, setIsBinding] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showUnbindConfirm, setShowUnbindConfirm] = useState(false);
  const [isUnbinding, setIsUnbinding] = useState(false);
  const [isMocking, setIsMocking] = useState(false);

  const myCode = currentUserProfile.myCode;
  const currentStatusName = currentUserProfile.status;

  let badgeColor = 'bg-slate-100 text-slate-500 border-slate-200';
  let badgeLabel = '未綁定';

  if (currentStatusName === 'bound') {
    badgeLabel = '已綁定成功';
    badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  } else if (currentStatusName === 'binding') {
    badgeLabel = '核對中';
    badgeColor = 'bg-amber-50 text-amber-600 border-amber-200 animate-pulse';
  }

  // Handle manual copy
  const handleCopyCode = () => {
    navigator.clipboard.writeText(myCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // One-click Setup Mock partner for sandbox testing bypass
  const handleMockBind = async () => {
    setIsMocking(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const result = await setupMockPartner(currentUserProfile);
      if (result.success) {
        setSuccessMsg(result.message);
        triggerToast(result.message);
        setTimeout(() => {
          onSuccessBind();
        }, 1200);
      } else {
        setErrorMsg(result.message);
      }
    } catch (err: any) {
      setErrorMsg('建立模擬伴侶時發生非預期錯誤：' + err.message);
    } finally {
      setIsMocking(false);
    }
  };

  // Handle submission to pair with another real user code in Firestore
  const handleSubmitBinding = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanInput = partnerInput.trim().toUpperCase();

    if (!cleanInput) {
      setErrorMsg('請輸入邀請碼喔！');
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);
    setIsBinding(true);

    try {
      const result = await submitPartnerInviteCode(currentUserProfile, cleanInput);
      if (result.success) {
        setSuccessMsg(result.message);
        triggerToast(result.message);
        if (result.message.includes('配對成功')) {
          setTimeout(() => {
            onSuccessBind();
          }, 1500);
        }
      } else {
        setErrorMsg(result.message);
      }
    } catch (err: any) {
      setErrorMsg('綁定發生未知錯誤：' + err.message);
    } finally {
      setIsBinding(false);
    }
  };

  // Handle disconnection of any partner pairing symmetrically 
  const handleUnbind = async () => {
    setIsUnbinding(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const result = await unbindPartner(currentUserProfile);
      if (result.success) {
        setSuccessMsg(result.message);
        triggerToast(result.message);
        setShowUnbindConfirm(false);
      } else {
        setErrorMsg(result.message);
      }
    } catch (err: any) {
      setErrorMsg('解除綁定發生意外錯誤：' + err.message);
    } finally {
      setIsUnbinding(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 pb-24 text-slate-800">
      
      {/* Top Header details containing logout action */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2.5">
          <img
            src={currentUserProfile.photoURL}
            alt="User avatar"
            referrerPolicy="no-referrer"
            className="w-9 h-9 rounded-full border border-slate-200 shadow-sm"
          />
          <div>
            <h4 className="text-xs font-black text-slate-800">{currentUserProfile.displayName}</h4>
            <p className="text-[9px] text-slate-400 font-bold tracking-wide">Google 帳戶已驗證</p>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-rose-600 rounded-xl transition-all border border-slate-100 cursor-pointer"
          title="登出帳號"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Title */}
      <div>
        <h2 className="text-sm font-black tracking-widest text-indigo-505 uppercase flex items-center gap-2 mb-1">
          <span className="w-3 h-px bg-indigo-500"></span>
          雙人生活共同空間綁定
        </h2>
        <p className="text-[11px] text-slate-505 leading-normal">
          歡迎使用真實雲端版！請透過<strong>邀請金鑰</strong>與另一半進行雙向配對連結。當雙方互相貼上代碼後即可開通共同 Ledger。
        </p>
      </div>

      {/* Current Binding Status Card */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center justify-between shadow-xs">
        <div className="space-y-0.5">
          <span className="text-[9px] font-bold text-slate-400 block tracking-wider uppercase">當前金鑰對齊狀態</span>
          <div className="text-sm font-black text-slate-800">
            {currentStatusName === 'bound' && '🎉 雙方已成功綁定！'}
            {currentStatusName === 'binding' && '⏳ 等待對方輸入核對中...'}
            {currentStatusName === 'unbound' && '⚠️ 目前尚未綁定伴侶'}
          </div>
        </div>
        <div className={`px-3 py-1 text-[10px] font-black tracking-widest uppercase border rounded-full ${badgeColor}`}>
          {badgeLabel}
        </div>
      </div>

      {/* ⚠️ 開發測試專用快捷通道 Sandbox Quick-Test Shortcut */}
      {currentStatusName === 'unbound' && (
        <div className="bg-amber-50/50 border border-amber-200/60 rounded-2xl p-4.5 space-y-3 animate-fade-in-up">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black text-amber-705 uppercase tracking-widest flex items-center gap-1.5">
              <span className="w-2 h-2 bg-amber-500 rounded-full animate-ping"></span>
              🎛️ 快速開發測試通道 (無需分身)
            </span>
            <span className="text-[8px] text-amber-600 font-extrabold bg-amber-100/80 px-2 py-0.5 rounded animate-pulse">
              SANDBOX TEST
            </span>
          </div>
          <p className="text-[10px] text-amber-700 leading-normal mb-1">
            由於已按照您的要求<strong>「退回並移除了單人記帳功能」</strong>，系統現在強制要求伴侶綁定。為了方便您在此測試，您可以點擊下方按鈕，系統將自動為您在 Cloud 建立虛擬角色並一鍵完成對齊配對，直接進入主程式檢視與操作！
          </p>
          <button
            type="button"
            onClick={handleMockBind}
            disabled={isMocking}
            className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-extrabold py-3 rounded-xl text-[10px] tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-98"
          >
            {isMocking ? (
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              '✨ 建立「模擬伴侶」並一鍵自動對齊綁定 ➔'
            )}
          </button>
        </div>
      )}

      {/* Partner Connection Details and Unbind Option */}
      {currentStatusName !== 'unbound' && (
        <div className="bg-rose-50/40 border border-rose-100/70 rounded-2xl p-4.5 space-y-4 animate-fade-in-up animate-duration-300">
          <div className="flex items-start gap-3">
            <Heart className="w-5 h-5 text-rose-500 fill-rose-50 shrink-0 mt-0.5" />
            <div className="text-left space-y-1">
              <h3 className="text-xs font-black text-slate-800">
                {currentStatusName === 'bound' ? '已配對伴侶資訊' : '核對中的伴侶資訊'}
              </h3>
              <p className="text-[11px] text-slate-600 leading-normal">
                {currentStatusName === 'bound' 
                  ? `您已與「${currentUserProfile.partnerName || '另一半'}」建立雙向雲端記帳連結。` 
                  : `已發送綁定申請給「${currentUserProfile.partnerName || '另一半'}」，正待對方貼上您的金鑰。`}
              </p>
            </div>
          </div>

          <div className="border-t border-rose-100/60 pt-3">
            {!showUnbindConfirm ? (
              <button
                type="button"
                onClick={() => setShowUnbindConfirm(true)}
                className="w-full py-2.5 bg-white hover:bg-rose-50 text-rose-600 hover:text-rose-700 font-extrabold border border-rose-200 rounded-xl text-[10px] tracking-wider uppercase transition-all flex items-center justify-center gap-1 cursor-pointer shadow-2xs active:scale-98"
              >
                <span>{currentStatusName === 'bound' ? '💔 解除伴侶配對' : '🚫 取消綁定申請'}</span>
              </button>
            ) : (
              <div className="bg-white border border-rose-200 rounded-xl p-3 space-y-2.5 animate-fade-in text-center">
                <p className="text-[10px] text-rose-700 font-bold leading-normal">
                  ⚠️ 您確定要解除配對嗎？
                  <br />
                  解綁後您將回到單人模式，且無法繼續共享該伴侶的共同帳本。
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowUnbindConfirm(false)}
                    className="flex-1 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-500 font-bold rounded-lg text-[10px] border border-slate-200 transition-all cursor-pointer"
                  >
                    保留配對
                  </button>
                  <button
                    type="button"
                    onClick={handleUnbind}
                    disabled={isUnbinding}
                    className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-[10px] transition-all flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
                  >
                    {isUnbinding ? (
                      <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      '確認解除'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Section 1: My Invitation Code */}
      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4.5 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            我的專屬邀請代碼
          </span>
          <span className="text-[9px] text-indigo-500 font-bold bg-indigo-50 px-2 py-0.5 rounded-md">
            雲端金鑰
          </span>
        </div>

        <div className="flex gap-2">
          <div className="flex-1 bg-white border border-slate-100 rounded-xl px-4 py-3 font-mono font-black text-slate-800 text-center text-sm tracking-wider shadow-inner select-all">
            {myCode}
          </div>
          <button
            onClick={handleCopyCode}
            className={`px-3 bg-white hover:bg-slate-100 text-slate-600 border border-slate-100 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
              copied ? 'text-indigo-600 border-indigo-200 bg-indigo-50/50' : ''
            }`}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
        
        <p className="text-[10px] text-slate-400 leading-normal">
          請複製上方的金鑰代碼，並將其傳送給您的另一半，讓他在對方的綁定畫面貼上即可。
        </p>
      </div>

      {/* Section 2: Input Partner's invitation code */}
      <form onSubmit={handleSubmitBinding} className="space-y-4">
        
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
            貼上「另一半的邀請代碼」
          </label>
          <input
            type="text"
            placeholder="請輸入對方 LOVE-XXXX 格式的金鑰"
            value={partnerInput}
            onChange={(e) => setPartnerInput(e.target.value)}
            disabled={isBinding}
            className="w-full bg-white border border-slate-100/80 rounded-2xl px-4 py-3.5 text-slate-800 font-extrabold text-xs text-center focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100 placeholder:text-slate-300 select-all"
          />
        </div>

        {/* Display feedback status alerts */}
        {errorMsg && (
          <div className="bg-rose-50 border border-rose-100 text-rose-700 p-3 rounded-xl flex items-start gap-2 text-[10px] font-bold">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 p-3 rounded-xl flex items-start gap-2 text-[10px] font-bold">
            <Check className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Main Action Submit Button */}
        <button
          type="submit"
          disabled={isBinding}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-300 text-white font-extrabold py-3.5 rounded-2xl text-xs tracking-widest shadow-md transition-all active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer"
        >
          {isBinding ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
            <>
              <span>送出綁定申請</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

      </form>

    </div>
  );
}
