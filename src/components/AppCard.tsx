"use client";

import React, { useState } from 'react';
import { AppEntry, AppStatus } from '@/types';
import { Edit2, ExternalLink, Github, Info, Zap, Globe, Trash2, Rocket, AlertTriangle, X, Check, Pin } from 'lucide-react';
import { deleteApp, updateApp } from '@/lib/db/apps';
import Link from 'next/link';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { useRouter } from 'next/navigation';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface AppCardProps {
  app: AppEntry;
}

const statusConfig: Record<AppStatus, { label: string; color: string; icon: React.ReactNode }> = {
  idea: { label: '아이디어단계', color: 'status-idea', icon: <Info size={12} /> },
  testing: { label: '테스트중', color: 'status-testing', icon: <Zap size={12} /> },
  active: { label: '초기개발단계', color: 'status-active', icon: <Zap size={12} /> },
  deployed: { label: '배포완료', color: 'status-deployed', icon: <Rocket size={12} /> },
  archived: { label: '폐기', color: 'bg-slate-100 text-slate-400', icon: <Trash2 size={12} /> },
};

const githubStatusConfig = {
  unknown: { icon: '?', color: 'text-slate-400' },
  connected: { icon: '✅', color: 'text-blue-600' },
  none: { icon: '❌', color: 'text-rose-500' },
};

const statusThemeConfig: Record<AppStatus, { border: string; ring: string; shadow: string; bg: string; accent: string }> = {
  idea: { 
    border: "border-slate-200/60", 
    ring: "ring-slate-950/5", 
    shadow: "shadow-slate-200/20", 
    bg: "bg-slate-50/40",
    accent: "bg-slate-400"
  },
  testing: { 
    border: "border-amber-200/60", 
    ring: "ring-amber-500/15", 
    shadow: "shadow-amber-500/10", 
    bg: "bg-amber-50/40",
    accent: "bg-amber-500"
  },
  active: { 
    border: "border-emerald-200/60", 
    ring: "ring-emerald-500/15", 
    shadow: "shadow-emerald-500/10", 
    bg: "bg-emerald-50/40",
    accent: "bg-emerald-500"
  },
  deployed: { 
    border: "border-blue-200/60", 
    ring: "ring-blue-500/15", 
    shadow: "shadow-blue-500/10", 
    bg: "bg-blue-50/40",
    accent: "bg-blue-600"
  },
  archived: { 
    border: "border-slate-200/60", 
    ring: "ring-slate-950/5", 
    shadow: "shadow-slate-200/20", 
    bg: "bg-slate-50/30",
    accent: "bg-slate-300"
  },
};

export default function AppCard({ app }: AppCardProps) {
  const status = statusConfig[app.status];
  const theme = statusThemeConfig[app.status];
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const router = useRouter();

  const handleTogglePin = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await updateApp(app.id, { isPinned: !app.isPinned });
    } catch (err) {
      console.error("Pin toggle failed:", err);
    }
  };
  
  const hasSpecialNotes = !!app.prd || !!app.memo;
  
  return (
    <div 
      onClick={() => router.push(`/apps/${app.id}`)}
      className={cn(
        "premium-card group p-5 flex flex-col gap-4 cursor-pointer relative",
        theme.border,
        theme.ring,
        hasSpecialNotes && "neon-border",
        "hover:shadow-2xl transition-all duration-300",
        app.status === 'active' ? "hover:shadow-emerald-500/10" : 
        app.status === 'testing' ? "hover:shadow-amber-500/10" : 
        app.status === 'deployed' ? "hover:shadow-blue-500/10" :
        "hover:shadow-slate-500/10"
      )}
    >
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold font-outfit text-slate-900 group-hover:text-blue-600 transition-colors tracking-tight line-clamp-1">
              {app.name}
            </h3>
            <span className={cn(
              "status-badge shadow-sm border-slate-950/[0.04] text-[10px] py-1 px-2.5",
              status.color
            )}>
              {status.icon}
              {status.label}
            </span>
          </div>
          <p className="text-[13px] text-slate-500 line-clamp-2 leading-relaxed h-9">
            {app.description || "등록된 앱 설명이 없습니다."}
          </p>
        </div>

        <button
          onClick={handleTogglePin}
          className={cn(
            "p-2 rounded-xl transition-all duration-300",
            app.isPinned 
              ? "bg-blue-600 text-white shadow-lg shadow-blue-200 scale-110" 
              : "bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
          )}
          title={app.isPinned ? "고정 해제" : "상단 고정"}
        >
          <Pin size={16} fill={app.isPinned ? "currentColor" : "none"} className={cn(app.isPinned ? "" : "rotate-45")} />
        </button>
      </div>

      <div className={cn(
        "grid grid-cols-2 gap-4 my-1 p-4 rounded-[1.5rem] border transition-all duration-500",
        theme.bg,
        theme.border,
        "ring-1 ring-slate-950/[0.02]"
      )}>
        <div className="flex flex-col gap-3">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">완성도</span>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-3 bg-white/50 rounded-full overflow-hidden border-2 border-slate-950 backdrop-blur-sm relative">
              <div 
                className={cn(
                  "h-full rounded-full transition-all duration-1000 ease-out shadow-sm",
                  theme.accent
                )}
                style={{ width: `${app.progress}%` }}
              />
            </div>
            <span className="text-xs font-black text-slate-600 font-outfit">{app.progress}%</span>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">GitHub</span>
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            {(app.githubUrl || app.githubStatus === 'connected') ? (
              <a 
                href={app.githubUrl || '#'} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center gap-1.5 text-white bg-sky-500 hover:bg-sky-600 transition-all px-3 py-1.5 rounded-xl border border-sky-400 shadow-lg shadow-sky-200 animate-pulse-vibrant text-[10px]"
                onClick={(e) => e.stopPropagation()}
              >
                <Github size={10} strokeWidth={3} /> 연결됨
              </a>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/40 rounded-xl border border-slate-200/50 ring-1 ring-slate-950/[0.02] backdrop-blur-sm">
                <Github size={10} className="text-slate-400" />
                <span className={cn("text-[9px]", githubStatusConfig[app.githubStatus || 'unknown']?.color || 'text-slate-400')}>
                   {(app.githubStatus === 'none' || !app.githubStatus) ? '연결없음' : '미확인'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 pt-3 mt-auto border-t border-slate-950/[0.06]">
        <div className="flex items-center justify-between text-[9px] text-slate-400 font-bold px-1">
          <span className="flex items-center gap-1.5 uppercase tracking-wider">
            <div className={cn("w-1 h-1 rounded-full animate-pulse", theme.accent)} />
            {app.url?.replace('https://', '')?.split('/')[0] || 'LOCAL_ENV'}
          </span>
          <span className="opacity-60 font-medium">
            {app.updatedAt?.toDate?.()?.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) || "READY"}
          </span>
        </div>
        
        {isConfirmingDelete ? (
          <div 
            onClick={(e) => e.stopPropagation()}
            className="flex flex-col gap-3 w-full p-4 bg-rose-50/50 border border-rose-200/60 rounded-2xl animate-in fade-in zoom-in duration-300 ring-1 ring-rose-500/10 backdrop-blur-sm"
          >
            <span className="text-rose-700 font-bold text-xs flex items-center justify-center gap-2">
              <AlertTriangle size={14} /> 정말 삭제하시겠습니까?
            </span>
            <div className="flex gap-2">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsConfirmingDelete(false);
                }}
                className="flex-1 py-2.5 bg-white border border-slate-200/60 text-slate-600 rounded-xl text-[10px] font-bold hover:bg-slate-50 transition-all shadow-sm ring-1 ring-slate-950/5"
              >
                취소
              </button>
              <button 
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    await deleteApp(app.id);
                  } catch (err) {
                    console.error("Delete failed:", err);
                  }
                }}
                className="flex-1 py-2.5 bg-rose-600 text-white rounded-xl text-[10px] font-bold shadow-lg shadow-rose-200 hover:bg-rose-700 transition-all border border-rose-700/30"
              >
                삭제 진행
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 w-full">
            <div 
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-white border border-slate-950/[0.08] ring-1 ring-slate-950/[0.04] text-slate-700 rounded-xl transition-all font-bold text-xs hover:bg-slate-50 shadow-sm"
            >
              <Edit2 size={14} strokeWidth={2.5} /> 편집하기
            </div>

            {app.url && (
              <a 
                href={app.url.startsWith('http') ? app.url : `https://${app.url}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center active:scale-95 border border-blue-700/50"
                title="페이지 이동"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink size={18} />
              </a>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsConfirmingDelete(true);
              }}
              className="p-3 bg-rose-50/80 hover:bg-rose-100 text-rose-500 rounded-xl transition-all active:scale-95 border border-rose-200/50"
              title="앱 삭제"
            >
              <Trash2 size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
