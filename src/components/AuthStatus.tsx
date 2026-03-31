"use client";

import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { auth, googleProvider } from '@/lib/firebase';
import { signInWithPopup, signOut } from 'firebase/auth';
import { LogIn, LogOut, User as UserIcon } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function AuthStatus() {
  const { user, loading } = useAuth();

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed:", error);
      if ((error as any).code === 'auth/operation-not-allowed') {
        alert("Google 로그인이 파이어베이스에 활성화되어 있지 않습니다! 파이어베이스 콘솔 -> Authentication -> Sign-in method 에서 Google을 활성화 해주세요.");
      } else {
        alert("로그인 실패: " + (error as any).message);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  if (loading) return null;

  return (
    <div className="flex items-center gap-3">
      {user ? (
        <div className="flex items-center gap-2 sm:gap-4 bg-white/5 border border-white/10 p-1.5 pr-2 sm:pr-4 rounded-2xl backdrop-blur-md flex-shrink-0">
          <div className="relative flex-shrink-0">
            {user.photoURL ? (
              <img src={user.photoURL} alt={user.displayName || ""} className="w-8 h-8 rounded-xl object-cover flex-shrink-0" />
            ) : (
              <div className="w-8 h-8 bg-blue-600/20 text-blue-400 flex items-center justify-center rounded-xl flex-shrink-0">
                <UserIcon size={16} />
              </div>
            )}
            <div className="absolute -right-1 -bottom-1 bg-emerald-500 w-3 h-3 rounded-full border-2 border-[#030711] shadow-glow" />
          </div>
          <div className="hidden md:flex flex-col min-w-0">
            <span className="text-xs font-bold text-white leading-none truncate">{user.displayName || "Google 유저"}</span>
            <span className="text-[10px] text-slate-500 font-medium truncate">{user.email}</span>
          </div>
          <button 
            onClick={handleLogout}
            className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-400/10 rounded-xl transition-all ml-1 flex-shrink-0"
            title="로그아웃"
          >
            <LogOut size={16} />
          </button>
        </div>
      ) : (
        <button 
          onClick={handleLogin}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-5 py-2.5 rounded-2xl transition-all shadow-lg shadow-blue-500/20"
        >
          <LogIn size={16} />
          <span>Google 로그인</span>
        </button>
      )}
    </div>
  );
}
