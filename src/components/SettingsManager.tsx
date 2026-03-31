"use client";

import React, { useState, useEffect } from 'react';
import { Settings, X, Check, ExternalLink } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function SettingsManager() {
  const [isOpen, setIsOpen] = useState(false);
  const [token, setToken] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const savedToken = localStorage.getItem('vercel_api_token') || '';
    setToken(savedToken);
  }, []);

  const handleSave = () => {
    localStorage.setItem('vercel_api_token', token);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      setIsOpen(false);
    }, 1500);
  };

  return (
    <div className="relative">
      <button 
        id="global-settings-button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "p-2 rounded-xl transition-all border outline-none",
          isOpen ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20" : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 hover:bg-slate-800"
        )}
        title="전체 설정"
      >
        <Settings size={20} className={isOpen ? "animate-spin" : ""} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop to close when clicking outside */}
          <div 
            className="fixed inset-0 z-[90] bg-black/20 backdrop-blur-[2px]" 
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed top-16 right-4 w-80 bg-slate-900 border border-slate-700 p-5 rounded-3xl z-[100] shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Settings size={16} /> Global Settings
              </h3>
              <button 
                onClick={() => setIsOpen(false)} 
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center justify-between">
                Vercel API Token
                <a 
                  href="https://vercel.com/account/tokens" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[10px] text-blue-400 hover:underline flex items-center gap-1"
                >
                  <ExternalLink size={10} /> 생성하기
                </a>
              </label>
              <input 
                type="password" 
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Bearer ..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-300 focus:ring-1 focus:ring-blue-500/50"
              />
              <p className="text-[10px] text-slate-600 leading-relaxed">
                토큰을 한 번만 등록하면 모든 앱에서 깃허브 저장소를 자동으로 찾을 수 있습니다.
              </p>
            </div>

            <button 
              onClick={handleSave}
              className={cn(
                "w-full py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2",
                saved ? "bg-emerald-600 text-white" : "bg-blue-600 hover:bg-blue-500 text-white"
              )}
            >
              {saved ? (
                <>
                  <Check size={16} /> 토큰 저장 완료
                </>
              ) : (
                "설정 저장"
              )}
            </button>
          </div>
        </div>
        </>
      )}
    </div>
  );
}
