"use client";

import React, { useState, useEffect } from 'react';
import { 
  fetchAllVercelProjects, 
  findProjectByDomain, 
  fetchVercelProjectDetail, 
  extractGithubMeta,
  detectGithubFromUrl
} from '@/lib/vercel';
import { useParams, useRouter } from 'next/navigation';
import { AppEntry, AppStatus, GithubStatus, ProgressLevel } from '@/types';
import { getAppDetail, updateApp, deleteApp } from '@/lib/db/apps';
import { 
  ArrowLeft, 
  ChevronLeft,
  ExternalLink, 
  Save, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Github, 
  ChevronDown, 
  ChevronUp, 
  StickyNote, 
  FileText,
  Code2,
  Layers, 
  Terminal, 
  Settings,
  Globe 
} from 'lucide-react';
import PromptSection from '@/components/PromptSection';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import SubscriptionGate from '@/components/SubscriptionGate';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const progressOptions: ProgressLevel[] = [0, 20, 50, 80, 100];
const statusOptions: { value: AppStatus; label: string; color: string }[] = [
  { value: 'deployed', label: '배포완료', color: 'bg-blue-600' },
  { value: 'testing', label: '테스트중', color: 'bg-amber-500' },
  { value: 'active', label: '초기개발단계', color: 'bg-emerald-600' },
  { value: 'idea', label: '아이디어단계', color: 'bg-slate-900' },
  { value: 'archived', label: '폐기', color: 'bg-slate-400' },
];

const githubOptions: { value: GithubStatus; label: string }[] = [
  { value: 'unknown', label: '미확인' },
  { value: 'connected', label: '연결됨' },
  { value: 'none', label: '없음' },
];

export default function AppDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [app, setApp] = useState<AppEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Sections toggle
  const [openSections, setOpenSections] = useState({
    prd: false,
    prompt: false,
    memo: false,
    settings: false
  });
  
  const [vercelToken, setVercelToken] = useState('');

  useEffect(() => {
    const savedToken = localStorage.getItem('vercel_api_token') || '';
    setVercelToken(savedToken);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/');
      return;
    }

    const fetchApp = async () => {
      if (typeof id !== 'string') return;
      try {
        const data = await getAppDetail(id);
        if (data) {
          // SaaS security: 본인 데이터인지 확인
          if (data.uid && data.uid !== user.uid) {
            alert(`접근 권한이 없습니다. (본인의 앱이 아닙니다: ${data.uid} !== ${user.uid})`);
            router.push('/');
            return;
          }
          setApp(data);
        } else {
          alert(`앱 데이터를 찾을 수 없습니다! 파이어베이스에 ID가 존재하지 않습니다: ${id}`);
          router.push('/');
        }
      } catch (error) {
        console.error("Error fetching app details:", error);
        alert(`파이어베이스 불러오기 실패: ${(error as any).message}`);
        router.push('/');
      } finally {
        setLoading(false);
      }
    };
    fetchApp();
  }, [id, router, user, authLoading]);

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleUpdate = (field: keyof AppEntry, value: any) => {
    setApp(prev => {
      if (!prev) return prev;
      return { ...prev, [field]: value };
    });
  };

  const handleAutoLinkVercel = async () => {
    if (!app?.url) {
      alert("배포 URL이 먼저 입력되어야 합니다.");
      return;
    }
    
    // Check global token first
    const token = localStorage.getItem('vercel_api_token') || vercelToken;
    
    if (!token) {
      alert("상단 헤더의 ⚙️ 설정 아이콘을 눌러 Vercel API 토큰을 먼저 등록해주세요.");
      return;
    }

    setIsSaving(true);
    try {
      // 1. Smart Detection (GitHub Pages, etc.)
      const smartResult = detectGithubFromUrl(app.url);
      if (smartResult.githubUrl) {
        handleUpdate('githubUrl', smartResult.githubUrl);
        handleUpdate('githubStatus', 'connected');
        alert(`✅ 스마트 감지 성공!\n\nGitHub 저장소: ${smartResult.githubUrl}\n(배포 URL 분석을 통해 자동으로 연결되었습니다)`);
        setIsSaving(false);
        return;
      }

      // 2. Vercel API Sync
      // Normalize app URL for matching
      let appUrlStr = app.url;
      if (!appUrlStr.startsWith('http')) appUrlStr = 'https://' + appUrlStr;
      const appHostname = new URL(appUrlStr).hostname.toLowerCase();

      // 1. Fetch all projects once
      const allVercelProjects = await fetchAllVercelProjects(token);
      
      // 2. Find matching project
      const match = findProjectByDomain(allVercelProjects, appHostname);

      if (match) {
        // 3. Deep Fetch detail
        const matchingProject = await fetchVercelProjectDetail(token, match);
        const { githubUrl } = extractGithubMeta(matchingProject);

        if (githubUrl) {
          handleUpdate('githubUrl', githubUrl);
          handleUpdate('githubStatus', 'connected');
          alert(`✅ 연결 성공!\n\nVercel 프로젝트: ${matchingProject.name}\nGitHub 저장소: ${githubUrl}`);
        } else {
          // 상세 정보에서도 Git 정보를 못 찾은 경우
          const hasAnyGitField = !!(matchingProject.link || matchingProject.gitSource || (matchingProject as any).repository);
          const reason = hasAnyGitField
            ? "Vercel 프로젝트는 찾았으나 Git 연결 정보(URL)를 추출하는 데 실패했습니다."
            : "Vercel 프로젝트는 찾았으나 실제로 Git(Github)이 연결되어 있지 않은 것 같습니다.";
          
          // Debugging info for the user to report
          const keys = Object.keys(matchingProject).join(', ');
          const rawDump = JSON.stringify(matchingProject).substring(0, 800);
          
          alert(`ℹ️ ${reason}\n\n[데이터 요약]\n${rawDump}...\n\n[필드목록]\n${keys}\n\n(Vercel 대시보드 > Settings > Git 메뉴에서 저장소가 정상적으로 연결되어 있는지 확인해주세요)`);
        }
      } else {
        alert(`❌ 이 도메인(${appHostname})과 일치하는 Vercel 프로젝트를 찾지 못했습니다.\n\n조회된 전체 항목: ${allVercelProjects.length}개\n\n대시보드 또는 Vercel 설정에서 도메인이 정확히 등록되어 있는지 확인해주세요.`);
      }
    } catch (error: any) {
      console.error("Vercel 연결 실패:", error);
      alert(`⚠️ 오류 발생: ${error.message || "알 수 없는 오류"}\n토큰이 유효한지, 네트워크 상태가 좋은지 확인해주세요.`);
    } finally {
      setIsSaving(false);
    }
  };

  const saveChanges = async () => {
    if (!app || !id) return;
    setIsSaving(true);
    try {
      // Save token to localStorage
      localStorage.setItem('vercel_api_token', vercelToken);
      
      const { id: _, createdAt: __, updatedAt: ___, ...updateData } = app;
      await updateApp(id as string, updateData);
      router.refresh();
      router.push('/');
    } catch (error) {
      console.error("Error updating app:", error);
    } finally {
      setIsSaving(false);
    }
  };



  if (loading) return (
    <div className="flex items-center justify-center py-40">
      <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin shadow-sm" />
    </div>
  );

  if (!app) return null;

  return (
    <div className="flex flex-col gap-10 pb-20">
      {/* Navigation Header */}
      <div className="flex items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-all font-bold group">
          <div className="p-2 bg-white rounded-xl shadow-sm group-hover:shadow-md transition-all">
            <ChevronLeft size={20} />
          </div>
          <span>목록으로 돌아가기</span>
        </Link>
        <div className="flex items-center gap-3">
          <button 
            onClick={saveChanges}
            disabled={isSaving}
            className="btn-primary flex items-center gap-3 px-8 shadow-xl shadow-blue-200"
          >
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save size={20} />
            )}
            <span className="text-sm">저장하기</span>
          </button>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-white/95 border border-slate-950/[0.06] ring-1 ring-blue-600/[0.06] rounded-[3.5rem] p-8 md:p-14 flex flex-col gap-14 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.08)] backdrop-blur-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-[100px] -mr-48 -mt-48" />
        
        {/* Basic Info */}
        <section className="flex flex-col gap-12 relative z-10">
          <div className="flex flex-col gap-5 border-b border-slate-950/[0.06] pb-12">
            <input 
              type="text" 
              value={app.name}
              onChange={(e) => handleUpdate('name', e.target.value)}
              onFocus={(e) => {
                if (e.target.value === '새 프로젝트' || e.target.value === '새 아이디어') {
                  handleUpdate('name', '');
                }
              }}
              className="text-4xl md:text-6xl font-black font-outfit bg-transparent border-none outline-none focus:ring-0 text-slate-900 placeholder:text-slate-200 tracking-tighter italic uppercase"
              placeholder="앱 이름 입력"
            />
            <input 
              type="text" 
              value={app.description}
              onChange={(e) => handleUpdate('description', e.target.value)}
              className="text-xl text-slate-500 font-medium bg-transparent border-none outline-none focus:ring-0 placeholder:text-slate-200 leading-relaxed"
              placeholder="프로젝트의 핵심 목표나 간단한 설명을 입력하세요"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
            <div className="flex flex-col gap-10">
              <div className="flex flex-col gap-4">
                <label className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] px-1">PROJECT STATUS</label>
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    {statusOptions.slice(0, 2).map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => handleUpdate('status', opt.value)}
                        className={cn(
                          "px-6 py-4 rounded-2xl border text-sm font-bold transition-all text-center active:scale-95 ring-1",
                          app.status === opt.value 
                            ? cn(opt.color, "border-slate-950/20 text-white shadow-xl ring-slate-950/10")
                            : "bg-slate-50/50 border-slate-100 text-slate-400 hover:border-slate-300 hover:text-slate-600 ring-transparent"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {statusOptions.slice(2, 4).map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => handleUpdate('status', opt.value)}
                        className={cn(
                          "px-6 py-4 rounded-2xl border text-sm font-bold transition-all text-center active:scale-95 ring-1",
                          app.status === opt.value 
                            ? cn(opt.color, "border-slate-950/20 text-white shadow-xl ring-slate-950/10")
                            : "bg-slate-50/50 border-slate-100 text-slate-400 hover:border-slate-300 hover:text-slate-600 ring-transparent"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-1">
                    {statusOptions.slice(4).map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => handleUpdate('status', opt.value)}
                        className={cn(
                          "px-6 py-4 rounded-2xl border text-sm font-bold transition-all text-center active:scale-95 ring-1",
                          app.status === opt.value 
                            ? cn(opt.color, "border-slate-950/20 text-white shadow-xl ring-slate-950/10")
                            : "bg-slate-50/50 border-slate-100 text-slate-400 hover:border-slate-300 hover:text-slate-600 ring-transparent"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <label className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] px-1">COMPLETION RATE (%)</label>
                <div className="flex items-center gap-3">
                  {progressOptions.map((prog) => (
                    <button
                      key={prog}
                      onClick={() => handleUpdate('progress', prog)}
                      className={cn(
                        "flex-1 py-4 px-2 rounded-2xl border text-xs font-black transition-all active:scale-95 ring-1",
                        app.progress === prog
                          ? "bg-blue-600 border-blue-700 text-white shadow-xl shadow-blue-200 ring-blue-500/20"
                          : "bg-slate-50/50 border-slate-100 text-slate-400 hover:border-slate-300 hover:text-slate-600 ring-transparent"
                      )}
                    >
                      {prog}%
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-10">
              <div className="flex flex-col gap-4">
                <label className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] px-1 flex items-center gap-2">
                  <Globe size={14} strokeWidth={3} /> DEPLOYMENT URL
                </label>
                <input 
                  type="url" 
                  value={app.url || ''}
                  onChange={(e) => handleUpdate('url', e.target.value)}
                  placeholder="https://your-app.vercel.app"
                  className="w-full px-6 py-4 bg-slate-50/80 border border-slate-100 rounded-2xl text-slate-900 font-bold focus:ring-4 focus:ring-blue-100/50 focus:border-blue-300 transition-all placeholder:text-slate-300 shadow-inner ring-1 ring-slate-950/[0.02] backdrop-blur-sm"
                />
              </div>

              <div className="flex flex-col gap-4">
                <label className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] px-1 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Github size={14} strokeWidth={3} /> GITHUB REPOSITORY
                  </div>
                  {app.githubUrl && (
                    <span className="text-[10px] bg-sky-400 text-white px-3 py-1.5 rounded-full font-black uppercase tracking-widest shadow-xl shadow-sky-200 animate-pulse-vibrant border border-sky-300">Linked</span>
                  )}
                </label>
                <div className="flex gap-4">
                  <input 
                    type="url" 
                    value={app.githubUrl || ''}
                    onChange={(e) => handleUpdate('githubUrl', e.target.value)}
                    placeholder="https://github.com/user/repo"
                    className="flex-1 px-6 py-4 bg-slate-50/80 border border-slate-100 rounded-2xl text-slate-900 font-bold focus:ring-4 focus:ring-blue-100/50 focus:border-blue-300 transition-all placeholder:text-slate-300 text-sm shadow-inner ring-1 ring-slate-950/[0.02] backdrop-blur-sm"
                  />
                  <button 
                    onClick={handleAutoLinkVercel}
                    className="px-8 bg-slate-950 text-white rounded-2xl border border-slate-950 transition-all font-black text-xs hover:bg-slate-800 active:scale-95 shadow-xl shadow-slate-200 ring-1 ring-slate-900/50"
                    title="Vercel API를 통해 깃허브 저장소를 자동으로 찾습니다"
                  >
                    자동 감지
                  </button>
                </div>
                {!localStorage.getItem('vercel_api_token') && (
                  <button 
                    onClick={() => {
                      const settingsBtn = document.getElementById('global-settings-button');
                      if (settingsBtn) {
                        settingsBtn.click();
                        settingsBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }
                    }}
                    className="text-[10px] text-blue-600 hover:underline flex items-center gap-1.5 mt-1 font-bold pl-1"
                  >
                    <Settings size={12} /> Vercel API 토큰 먼저 등록하기
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Folding Sections */}
        <section className="flex flex-col gap-8 relative z-10">
          {/* PRD Section */}
          <div className="border border-slate-950/[0.06] rounded-[2.5rem] overflow-hidden bg-slate-50/50 shadow-sm ring-1 ring-blue-600/[0.02] backdrop-blur-sm">
            <button 
              onClick={() => toggleSection('prd')}
              className="w-full px-10 py-8 flex items-center justify-between hover:bg-white/50 transition-all"
            >
              <div className="flex items-center gap-6">
                <div className={cn(
                  "p-4 rounded-[1.5rem] transition-all",
                  app.prd?.trim() 
                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-200" 
                    : "bg-slate-50 text-slate-300 border border-slate-100"
                )}>
                  {app.prd?.trim() ? <CheckCircle2 size={28} /> : <FileText size={28} />}
                </div>
                <div className="text-left flex items-center gap-3">
                  <div>
                    <span className="block font-black text-slate-950 text-xl font-outfit uppercase italic tracking-tight">기획서 (PRD)</span>
                    <span className="text-[10px] text-blue-600 font-black uppercase tracking-[0.2em]">Project Requirements Document</span>
                  </div>
                  {app.prd?.trim() && (
                    <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter">작성됨</span>
                  )}
                </div>
              </div>
              {openSections.prd ? <ChevronUp size={28} className="text-slate-400" /> : <ChevronDown size={28} className="text-slate-400" />}
            </button>
            {openSections.prd && (
              <div className="px-10 pb-10 animate-in slide-in-from-top-4 duration-500">
                <textarea 
                  value={app.prd || ''}
                  onChange={(e) => handleUpdate('prd', e.target.value)}
                  placeholder="아이디어의 핵심 기능과 상세 기획을 기록하세요..."
                  className="w-full h-96 bg-white border border-slate-950/[0.06] rounded-3xl p-10 outline-none focus:ring-4 focus:ring-blue-100/30 focus:border-blue-300 text-slate-700 font-medium leading-relaxed shadow-inner placeholder:text-slate-200 ring-1 ring-slate-950/[0.02]"
                />
              </div>
            )}
          </div>

          {/* Memo Section */}
          <div className="border border-slate-950/[0.06] rounded-[2.5rem] overflow-hidden bg-slate-50/50 shadow-sm ring-1 ring-amber-500/[0.02] backdrop-blur-sm">
            <button 
              onClick={() => toggleSection('memo')}
              className="w-full px-10 py-8 flex items-center justify-between hover:bg-white/50 transition-all"
            >
              <div className="flex items-center gap-6">
                <div className={cn(
                  "p-4 rounded-[1.5rem] transition-all",
                  app.memo?.trim() 
                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-200" 
                    : "bg-slate-50 text-slate-300 border border-slate-100"
                )}>
                  {app.memo?.trim() ? <CheckCircle2 size={28} /> : <StickyNote size={28} />}
                </div>
                <div className="text-left flex items-center gap-3">
                  <div>
                    <span className="block font-black text-slate-950 text-xl font-outfit uppercase italic tracking-tight">특이사항 및 메모</span>
                    <span className="text-[10px] text-amber-600 font-black uppercase tracking-[0.2em]">Dev Notes & Issues</span>
                  </div>
                  {app.memo?.trim() && (
                    <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter">내용있음</span>
                  )}
                </div>
              </div>
              {openSections.memo ? <ChevronUp size={28} className="text-slate-400" /> : <ChevronDown size={28} className="text-slate-400" />}
            </button>
            {openSections.memo && (
              <div className="px-10 pb-10 animate-in slide-in-from-top-4 duration-500">
                <textarea 
                  value={app.memo || ''}
                  onChange={(e) => handleUpdate('memo', e.target.value)}
                  placeholder="개발 로그, 해결된 버그, 향후 추가 계획 등을 자유롭게 기록하세요..."
                  className="w-full h-96 bg-white border border-slate-950/[0.06] rounded-3xl p-10 outline-none focus:ring-4 focus:ring-amber-100/30 focus:border-amber-300 text-slate-700 font-medium leading-relaxed shadow-inner placeholder:text-slate-200 ring-1 ring-slate-950/[0.02]"
                />
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="flex items-center justify-center gap-4 text-slate-300 text-[10px] font-black uppercase tracking-[0.4em] py-8 border-t border-slate-100 mx-10">
        <Clock size={12} /> Last synchronized: {app.updatedAt?.toDate?.()?.toLocaleString('ko-KR') || "방금 전"}
      </div>
    </div>
  );
}
