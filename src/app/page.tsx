"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { AppEntry, AppStatus } from '@/types';
import { subscribeToApps, createApp, updateApp } from '@/lib/db/apps';
import AppCard from '@/components/AppCard';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { Search, Plus, Star, LayoutGrid, ListFilter, TrendingUp, Lock, Rocket, Code2, Zap, Globe, Lightbulb, LogIn } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { 
  fetchAllVercelProjects, 
  findProjectByDomain, 
  fetchVercelProjectDetail, 
  extractGithubMeta,
  detectGithubFromUrl
} from '@/lib/vercel';
import { useRouter } from 'next/navigation';
import { auth, googleProvider } from '@/lib/firebase';
import { signInWithPopup } from 'firebase/auth';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const [apps, setApps] = useState<AppEntry[]>([]);
  const router = useRouter();

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error("Home login failed:", err);
      alert("로그인 중 오류가 발생했습니다: " + err.message);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    
    const unsubscribe = subscribeToApps(user?.uid || null, (data) => {
      setApps(data);
    });
    return () => unsubscribe();
  }, [user, authLoading]);

  const groupedApps = useMemo(() => {
    const groups: Record<AppStatus, AppEntry[]> = {
      deployed: [],
      active: [],
      testing: [],
      idea: [],
      archived: []
    };
    
    apps.forEach(app => {
      const s = app.status || 'idea';
      if (groups[s]) {
        groups[s].push(app);
      } else {
        groups['idea'].push(app);
      }
    });

    (Object.keys(groups) as AppStatus[]).forEach(key => {
      groups[key].sort((a, b) => {
        // 1. Is Pinned
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        
        // 2. Updated At
        const timeA = (a as any).updatedAt?.toDate?.()?.getTime() || 0;
        const timeB = (b as any).updatedAt?.toDate?.()?.getTime() || 0;
        return timeB - timeA;
      });
    });

    return groups;
  }, [apps]);

  const [isSyncing, setIsSyncing] = useState(false);

  const handleBatchSyncVercel = async () => {
    const token = localStorage.getItem('vercel_api_token');
    if (!token) {
      alert("전체 설정(상단 톱니바퀴)에서 Vercel API 토큰을 먼저 등록해주세요.");
      return;
    }

    const appsToSync = apps.filter(app => 
      app.url?.includes('.vercel.app') && !app.githubUrl
    );

    if (appsToSync.length === 0) {
      alert("동기화할 대상(Vercel 앱 중 깃허브 미연동)이 없습니다.");
      return;
    }

    if (!confirm(`${appsToSync.length}개의 앱에 대해 Vercel 정보 동기화를 시작할까요?`)) return;

    setIsSyncing(true);
    let successCount = 0;
    let failCount = 0;
    const results: string[] = [];

    try {
      // 1. Fetch all projects once
      const allVercelProjects = await fetchAllVercelProjects(token);
      
      // 2. Process each app
      for (const app of appsToSync) {
        try {
          // A. Smart Detection First
          const smartResult = detectGithubFromUrl(app.url);
          if (smartResult.githubUrl) {
            await updateApp(app.id, { githubUrl: smartResult.githubUrl, githubStatus: 'connected' });
            successCount++;
            results.push(`✨ ${app.name} -> ${smartResult.githubUrl} (스마트 감지)`);
            continue;
          }

          // B. Vercel API Sync
          let appUrlStr = app.url!;
          if (!appUrlStr.startsWith('http')) appUrlStr = 'https://' + appUrlStr;
          const appHostname = new URL(appUrlStr).hostname.toLowerCase();

          const match = findProjectByDomain(allVercelProjects, appHostname);
          
          if (match) {
            const detail = await fetchVercelProjectDetail(token, match);
            const { githubUrl } = extractGithubMeta(detail);

            if (githubUrl) {
              await updateApp(app.id, { githubUrl, githubStatus: 'connected' });
              successCount++;
              results.push(`✅ ${app.name} -> ${githubUrl}`);
            } else {
              failCount++;
              // Check what went wrong
              if (detail.link || detail.gitSource || detail.repository) {
                results.push(`❌ ${app.name} (Vercel 프로젝트(${detail.name})는 찾았으나 Git 연결 정보 추출 실패)`);
              } else {
                results.push(`❌ ${app.name} (Vercel 프로젝트(${detail.name})는 찾았으나 Git 연결이 안 되어 있음)`);
              }
            }
          } else {
            failCount++;
            results.push(`❓ ${app.name} (Vercel에서 일치하는 도메인을 찾지 못함)`);
          }
        } catch (err) {
          failCount++;
          results.push(`⚠️ ${app.name} (처리 중 오류: ${err instanceof Error ? err.message : "알 수 없음"})`);
        }
      }

      router.refresh();
      const syncSummary = `동기화 처리가 완료되었습니다.\n\n✅ 성공: ${successCount}건\n❌ 실패/미연동: ${failCount}건\n\n상세 내역:\n${results.join('\n')}`;
      alert(syncSummary);
    } catch (error: any) {
      console.error("Batch sync failed:", error);
      alert(`일괄 동기화 중 오류가 발생했습니다: ${error.message || "알 수 없는 오류"}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreateWithStatus = async (status: AppStatus) => {
    if (!user || isSyncing) return;
    
    // Default name based on status
    const defaultName = status === 'idea' ? '새 아이디어' : '새 프로젝트';
    
    try {
      const newApp = await createApp(defaultName, user.uid, status);
      if (newApp && newApp.id) {
        router.push(`/apps/${newApp.id}`);
      }
    } catch (error) {
      console.error("Error creating app:", error);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-40">
        <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin shadow-sm" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center max-w-2xl mx-auto">
        <div className="w-24 h-24 bg-blue-600 text-white flex items-center justify-center rounded-[2.5rem] mb-10 shadow-2xl shadow-blue-200 animate-in zoom-in-50 duration-700">
          <Rocket size={44} />
        </div>
        <h2 className="text-5xl font-extrabold font-outfit mb-6 text-slate-900 tracking-tight">더 나은 개발의 시작</h2>
        <p className="text-slate-600 text-lg mb-12 leading-relaxed max-w-lg mx-auto font-medium">
          아이디어부터 배포까지, 모든 개발 과정을 체계적으로 관리하세요.<br/> 
          지금 로그인하여 나만의 개발 워크플로우 허브를 시작할 수 있습니다.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mb-12">
          <div className="p-8 bg-white border border-slate-100 rounded-[2rem] text-left shadow-sm hover:shadow-md transition-shadow duration-300">
            <h4 className="font-bold text-slate-900 text-lg mb-3 flex items-center gap-2">
              <Star className="text-amber-500 fill-amber-500" size={18} /> 무제한 앱 관리
            </h4>
            <p className="text-sm text-slate-500 leading-relaxed font-medium">진행 중인 모든 프로젝트를 한눈에 파악하고 효율적으로 관리하세요.</p>
          </div>
          <div className="p-8 bg-white border border-slate-100 rounded-[2rem] text-left shadow-sm hover:shadow-md transition-shadow duration-300">
            <h4 className="font-bold text-slate-900 text-lg mb-3 flex items-center gap-2">
              <Code2 className="text-blue-600" size={18} /> 프롬프트 가속기
            </h4>
            <p className="text-sm text-slate-500 leading-relaxed font-medium">클릭 한 번으로 최적의 개발 프롬프트를 생성하여 개발 시간을 단축하세요.</p>
          </div>
        </div>
        <div className="flex flex-col items-center gap-6 w-full mb-12">
          <button 
            onClick={handleLogin}
            className="group relative flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold px-12 py-5 rounded-[2.5rem] transition-all shadow-2xl shadow-blue-500/40 active:scale-95 overflow-hidden w-full max-w-md"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            <LogIn size={24} strokeWidth={2.5} />
            <span>Google로 무료 시작하기</span>
          </button>
          <div className="p-5 bg-blue-50/50 border border-blue-100/50 rounded-2xl flex items-center gap-3 text-sm text-blue-700 font-semibold shadow-sm overflow-hidden backdrop-blur-sm">
            <Lock size={16} />
            <span>안전한 구글 로그인을 통해 사용자님의 데이터를 보호합니다.</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white/80 backdrop-blur-xl p-8 rounded-[3rem] border border-slate-950/[0.06] ring-1 ring-blue-600/[0.08] shadow-[0_20px_50px_-15px_rgba(0,0,0,0.05)] gap-6 mb-4 relative overflow-hidden transition-all duration-500">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-500/5 rounded-full blur-[60px] -ml-24 -mb-24" />
        <div className="flex flex-col md:flex-row items-center gap-1.5 px-2 relative z-10 w-full justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-black font-outfit text-slate-950 tracking-tighter uppercase italic">DASHBOARD</h1>
            <Link 
              href="/tips"
              className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-2xl hover:bg-blue-100 transition-all font-black text-xs border border-blue-100 shadow-sm"
            >
              <Lightbulb size={16} fill="currentColor" />
              <span>개발팁</span>
            </Link>
          </div>
        </div>
        <div className="flex gap-4 flex-wrap md:flex-nowrap relative z-10">
          {/* 동기화 버튼 (Basic/Blue) */}
          <button 
            id="vercel-batch-sync-button"
            onClick={handleBatchSyncVercel}
            disabled={isSyncing}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all font-bold text-sm disabled:opacity-50 shadow-lg shadow-blue-200 active:scale-95"
            title="Vercel API를 통해 모든 앱의 깃허브 저장소를 한 번에 찾아옵니다"
          >
            {isSyncing ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Globe size={20} strokeWidth={2.5} />
            )}
            <span>동기화</span>
          </button>

          {/* 나의 스킬 버튼 (Orange) */}
          <Link 
            href="/skills"
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-4 bg-orange-500 text-white rounded-2xl hover:bg-orange-600 transition-all font-bold text-sm active:scale-95 shadow-lg shadow-orange-200"
          >
            <Zap size={20} fill="currentColor" />
            <span>나의 스킬</span>
          </Link>

          {/* 새 앱 추가 버튼 (Purple) */}
          <button 
            onClick={() => handleCreateWithStatus('active')}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-4 bg-purple-600 text-white rounded-2xl hover:bg-purple-700 transition-all font-bold text-sm active:scale-95 shadow-lg shadow-purple-200"
          >
            <Plus size={22} strokeWidth={3} />
            <span>새 앱 추가</span>
          </button>
        </div>
      </div>



      {/* Main Groups (By Status) */}
      <div className="flex flex-col gap-24">
        {(['deployed', 'testing', 'active', 'idea', 'archived'] as AppStatus[]).map(status => (
          groupedApps[status].length > 0 && (
            <section key={status} className="flex flex-col gap-12">
              <div className="flex items-center justify-between border-b border-slate-950/[0.08] pb-6 px-4 relative">
                <div className={cn(
                  "absolute bottom-0 left-0 w-32 h-[3px] rounded-full",
                  status === 'deployed' ? 'bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.4)]' :
                  status === 'active' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]' :
                  status === 'testing' ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]' :
                  'bg-slate-400'
                )} />
                <div className="flex items-center gap-5">
                  <div className={cn(
                    "w-3 h-3 rounded-full ring-4 ring-offset-4 ring-offset-slate-100",
                    status === 'deployed' ? 'bg-blue-600 ring-blue-600/20' :
                    status === 'active' ? 'bg-emerald-500 ring-emerald-500/20' :
                    status === 'testing' ? 'bg-amber-500 ring-amber-500/20' :
                    status === 'archived' ? 'bg-slate-300 ring-slate-300/20' :
                    'bg-slate-400 ring-slate-400/20'
                  )} />
                  <h2 className="text-xl font-black font-outfit tracking-widest text-slate-950 uppercase italic">
                    {status === 'deployed' ? '배포완료' : status === 'testing' ? '테스트중' : status === 'active' ? '초기개발단계' : status === 'idea' ? '아이디어단계' : '폐기'}
                  </h2>
                  <span className="px-4 py-1.5 bg-white rounded-full text-xs font-black text-slate-950 border border-slate-950/[0.1] shadow-sm ring-1 ring-slate-950/[0.02]">
                    {groupedApps[status].length}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {groupedApps[status].map(app => (
                  <AppCard key={app.id} app={app} />
                ))}
              </div>
            </section>
          )
        ))}
      </div>

      {/* Empty State */}
      {apps.length === 0 && (
        <div className="flex flex-col items-center justify-center py-48 text-slate-400 bg-white/50 backdrop-blur-sm rounded-[4rem] border border-slate-950/[0.08] shadow-sm border-dashed gap-8">
          <div className="w-32 h-32 bg-white rounded-[3rem] border border-slate-950/[0.06] shadow-xl flex items-center justify-center ring-1 ring-slate-950/[0.04]">
            <LayoutGrid size={56} className="text-slate-200" strokeWidth={1.5} />
          </div>
          <div className="text-center">
            <p className="text-2xl font-black text-slate-950 mb-3 font-outfit uppercase tracking-tighter">No Active Projects</p>
            <p className="text-sm font-bold text-slate-400 max-w-xs mx-auto leading-relaxed">
              아이디어를 실행으로 옮겨보세요.<br/>새 프로젝트 버튼을 눌러 시작할 수 있습니다.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
