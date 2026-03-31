"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { SkillEntry, subscribeToSkills, createSkill, updateSkill, deleteSkill, updateSkillOrders } from '@/lib/db/skills';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Save, Trash2, Copy, Zap, Check, Star, ArrowUp, ArrowDown } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function SkillsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [skills, setSkills] = useState<SkillEntry[]>([]);
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  const [editTitle, setEditTitle] = useState('');
  const [editTemplate, setEditTemplate] = useState('');
  
  const [userInput, setUserInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    
    const unsubscribe = subscribeToSkills(user?.uid || null, (data) => {
      setSkills(data);
    });
    return () => unsubscribe();
  }, [user, authLoading]);

  const sortedSkills = useMemo(() => {
    return [...skills].sort((a, b) => {
      // 1. isFavorite (desc)
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;

      // 2. order (asc)
      if (a.order !== undefined && b.order !== undefined) {
        if (a.order !== b.order) return a.order - b.order;
      }
      return a.title.localeCompare(b.title, 'ko-KR', { sensitivity: 'base' });
    });
  }, [skills]);


  const handleCreate = () => {
    if (!user) return;
    setIsCreating(true);
    setSelectedSkillId(null);
    setEditTitle("새 스킬 (프롬프트)");
    setEditTemplate("기본 프롬프트(템플릿) 내용을 작성하세요.");
    setUserInput('');
    setIsConfirmingDelete(false);
  };

  const handleSelect = (skill: SkillEntry) => {
    setIsCreating(false);
    setSelectedSkillId(skill.id);
    setEditTitle(skill.title);
    setEditTemplate(skill.template);
    setUserInput('');
    setCopied(false);
    setIsConfirmingDelete(false);
  };

  const handleSave = async () => {
    if (!user) return;
    try {
      if (isCreating) {
        const newSkill = await createSkill(editTitle, editTemplate, user.uid);
        setSelectedSkillId(newSkill.id);
        setIsCreating(false);
      } else if (selectedSkillId) {
        await updateSkill(selectedSkillId, { title: editTitle, template: editTemplate });
      }
      router.refresh();
      alert("성공적으로 저장되었습니다! ✅");
      // router.push('/'); // Keep on page to see the new skill in list
    } catch (error) {
      console.error("Save failed:", error);
      alert("저장에 실패했습니다. 다시 시도해주세요.");
    }
  };

  const handleDelete = async () => {
    if (!selectedSkillId) return;
    await deleteSkill(selectedSkillId);
    setSelectedSkillId(null);
    setIsConfirmingDelete(false);
  };

  const handleToggleFavorite = async () => {
    if (!selectedSkillId) return;
    const skill = skills.find(s => s.id === selectedSkillId);
    if (!skill) return;
    await updateSkill(selectedSkillId, { isFavorite: !skill.isFavorite });
  };

  const handleCopy = () => {
    const combined = `${editTemplate}\n\n${userInput}`.trim();
    navigator.clipboard.writeText(combined);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMoveSkill = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === sortedSkills.length - 1) return;

    const newSorted = [...sortedSkills];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    // swap
    const temp = newSorted[index];
    newSorted[index] = newSorted[newIndex];
    newSorted[newIndex] = temp;

    const updates = newSorted.map((skill, i) => ({ id: skill.id, order: i }));
    
    setSkills(prev => prev.map(p => {
      const match = updates.find(u => u.id === p.id);
      return match ? { ...p, order: match.order, isFavorite: false } : p;
    }));

    try {
      await updateSkillOrders(updates);
    } catch (e) {
      console.error(e);
    }
  };

  if (authLoading) return (
    <div className="flex items-center justify-center py-40">
      <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin shadow-sm" />
    </div>
  );

  return (
    <div className="min-h-screen p-4 sm:p-8 pt-24 max-w-7xl mx-auto flex flex-col gap-6 sm:gap-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-black font-outfit text-slate-900 flex items-center gap-4 tracking-tight uppercase">
          <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100">
            <Zap className="text-amber-500 fill-amber-500" size={32} />
          </div>
          나만의 스킬 라이브러리
        </h1>
      </div>

      <div className="flex flex-col lg:flex-row flex-1 gap-6 lg:gap-10 min-h-0 relative z-10">
        {/* Sidebar */}
        <div className={cn(
          "w-full lg:w-80 bg-white/90 border border-slate-950/[0.06] ring-1 ring-blue-600/[0.04] rounded-[2.5rem] lg:rounded-[3.5rem] flex-col shrink-0 overflow-hidden shadow-[0_20px_50px_-15px_rgba(0,0,0,0.03)] backdrop-blur-md h-full min-h-[500px] lg:min-h-0",
          (selectedSkillId || isCreating) ? "hidden lg:flex" : "flex"
        )}>
          <div className="p-7 border-b border-slate-950/[0.06] flex justify-between items-center bg-slate-50/50">
            <Link href="/" className="p-3 bg-white hover:bg-slate-50 rounded-2xl border border-slate-950/[0.08] shadow-sm transition-all active:scale-95 group ring-1 ring-slate-950/[0.02]">
              <ArrowLeft size={18} className="text-slate-400 group-hover:text-slate-950" />
            </Link>
            <h2 className="font-extrabold text-slate-950 font-outfit tracking-widest text-lg uppercase">SKILLS LIST</h2>
            <button onClick={handleCreate} className="p-3 bg-slate-950 text-white hover:bg-slate-800 rounded-2xl shadow-xl shadow-slate-200 transition-all active:scale-95 border border-slate-800 ring-1 ring-slate-700">
              <Plus size={18} strokeWidth={3} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
            {skills.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                <Zap size={32} className="mb-2 opacity-20" />
                <p className="text-xs font-bold uppercase tracking-widest text-center">No Skills Found</p>
              </div>
            )}
            <div className="flex flex-col gap-3">
              {sortedSkills.map((skill: SkillEntry, index: number) => (
                <div key={skill.id} className="relative group/skill flex">
                  <button
                  onClick={() => handleSelect(skill)}
                  className={cn(
                    "w-full text-left p-5 rounded-[1.5rem] border transition-all duration-300 group flex items-center justify-between active:scale-95 mb-0.5 relative overflow-hidden",
                    selectedSkillId === skill.id 
                      ? "bg-slate-950 border-slate-950 text-white shadow-2xl shadow-slate-300 ring-4 ring-slate-900/10" 
                      : skill.isFavorite 
                        ? "bg-amber-50/80 border-amber-200 text-amber-900/80 hover:border-amber-300 hover:bg-amber-100/50 ring-1 ring-amber-500/10" 
                        : "bg-white/50 border-slate-950/[0.06] text-slate-400 hover:border-slate-950/[0.15] hover:text-slate-950 hover:bg-white ring-1 ring-slate-950/[0.02]"
                  )}
                >
                  <div className="flex items-center gap-3 overflow-hidden relative z-10">
                    {skill.isFavorite && <Star size={14} className={cn("shrink-0", selectedSkillId === skill.id ? "text-amber-400 fill-amber-400" : "text-amber-500 fill-amber-500")} />}
                    <div className="font-extrabold text-sm truncate uppercase tracking-tight">{skill.title}</div>
                  </div>
                </button>
                {selectedSkillId !== skill.id && !skill.isFavorite && (
                  <div className="absolute right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Zap size={14} className="text-amber-400 fill-amber-400" />
                  </div>
                )}
              </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div id="skill-editor" className={cn(
          "flex-1 bg-white/95 border border-slate-950/[0.06] ring-1 ring-blue-600/[0.08] rounded-[2.5rem] lg:rounded-[4rem] flex-col overflow-hidden shadow-[0_30px_80px_-20px_rgba(0,0,0,0.08)] relative backdrop-blur-md h-[70vh] lg:h-auto min-h-[500px] lg:min-h-0",
          !(selectedSkillId || isCreating) ? "hidden lg:flex" : "flex"
        )}>
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 rounded-full blur-[80px] -mr-40 -mt-40 z-0 pointer-events-none" />
          
          {(!selectedSkillId && !isCreating) ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50/30 relative z-10">
              <div className="w-40 h-40 bg-white rounded-[4rem] border border-slate-950/[0.06] shadow-xl flex items-center justify-center ring-1 ring-blue-600/[0.04] mb-10">
                <Zap size={64} className="text-slate-200" strokeWidth={1} />
              </div>
              <p className="text-2xl font-black text-slate-950 mb-3 font-outfit uppercase tracking-tighter italic">SKILL MANAGEMENT</p>
              <p className="text-sm font-bold text-slate-400 max-w-xs text-center leading-relaxed">
                프롬프트를 선택하거나 새로 만드세요.<br/>업무 효율을 고도로 높일 수 있습니다.
              </p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden relative z-10">
              <div className="p-6 lg:p-10 border-b border-slate-950/[0.06] flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50/20 shrink-0 gap-4 lg:gap-8">
                <div className="flex-1 flex gap-2 lg:gap-4 items-center w-full">
                  <button 
                    onClick={() => { setSelectedSkillId(null); setIsCreating(false); }}
                    className="lg:hidden p-2 -ml-2 rounded-2xl hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-colors shrink-0"
                  >
                    <ArrowLeft size={24} />
                  </button>
                  <div className="flex-1 flex flex-col gap-1.5 w-full">
                    <input 
                      type="text" 
                      value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    onFocus={() => {
                      const normalized = editTitle.replace(/\s/g, '');
                      if (normalized === "새스킬(프롬프트)" || normalized === "새스킬") {
                        setEditTitle("");
                      }
                    }}
                    onBlur={() => {
                      if (editTitle.trim() === "") setEditTitle("새 스킬 (프롬프트)");
                    }}
                      placeholder="스킬명을 입력하세요"
                      className="bg-white border-b-2 border-slate-950/10 text-slate-950 px-2 py-2 font-black w-full min-w-0 focus:outline-none focus:border-blue-600 font-outfit text-2xl lg:text-4xl tracking-tighter transition-all placeholder:text-slate-100 uppercase italic truncate"
                    />
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  {!isCreating && (
                    <button 
                      onClick={handleToggleFavorite}
                      className={cn(
                        "p-4 rounded-[1.25rem] transition-all active:scale-95 border ring-1",
                        skills.find(s => s.id === selectedSkillId)?.isFavorite
                          ? "bg-amber-50 border-amber-200 text-amber-500 shadow-lg shadow-amber-50 ring-amber-500/10"
                          : "bg-white border-slate-100 text-slate-200 hover:text-slate-400 hover:border-slate-200 shadow-sm ring-transparent"
                      )}
                      title="즐겨찾기"
                    >
                      <Star size={24} className={skills.find(s => s.id === selectedSkillId)?.isFavorite ? "fill-amber-500" : ""} />
                    </button>
                  )}

                  <button onClick={handleSave} className="btn-primary flex items-center gap-3 px-10 py-5 text-sm shadow-xl shadow-blue-500/20 active:scale-95 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <Save size={20} className="relative z-10" /> 
                    <span className="relative z-10 font-black">SAVE SKILL</span>
                  </button>

                  {!isCreating && (
                    isConfirmingDelete ? (
                      <div className="flex gap-2 animate-in fade-in zoom-in-95 duration-200">
                        <button 
                          onClick={() => setIsConfirmingDelete(false)}
                          className="px-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-black transition-all"
                        >
                          취소
                        </button>
                        <button 
                          onClick={handleDelete}
                          className="px-6 py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-black shadow-xl shadow-rose-200 transition-all border border-rose-700/50"
                        >
                          삭제 확인
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setIsConfirmingDelete(true)} 
                        title="삭제" 
                        className="p-4 bg-rose-50/50 border border-rose-100 text-rose-400 hover:bg-rose-100 hover:text-rose-600 rounded-2xl transition-all active:scale-95 shadow-sm"
                      >
                        <Trash2 size={24} />
                      </button>
                    )
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 lg:p-12 flex flex-col gap-8 lg:gap-12 custom-scrollbar">
                {/* 2. Base Prompt */}
                <div className="flex-1 flex flex-col gap-4 min-h-[350px]">
                  <label className="text-2xl font-black text-slate-950 flex items-center gap-2 tracking-tight px-2 font-outfit uppercase">
                    <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                    기본prompt
                  </label>
                  <textarea 
                    value={editTemplate}
                    onChange={e => setEditTemplate(e.target.value)}
                    onFocus={() => {
                      const normalized = editTemplate.replace(/\s/g, '');
                      if (normalized.includes("기본프롬프트(템플릿)") || normalized.includes("내용을작성하세요")) {
                        setEditTemplate("");
                      }
                    }}
                    onBlur={() => {
                      if (editTemplate.trim() === "") setEditTemplate("기본 프롬프트(템플릿) 내용을 작성하세요.");
                    }}
                    className="flex-1 bg-white border border-slate-950/[0.06] rounded-[2.5rem] p-12 text-slate-800 font-medium text-lg leading-relaxed resize-none focus:outline-none focus:ring-8 focus:ring-blue-600/[0.03] focus:border-blue-600/20 transition-all placeholder:text-slate-100 shadow-[inset_0_2px_15px_rgba(0,0,0,0.02)] ring-1 ring-slate-950/[0.02]"
                    placeholder="자주 쓰는 프롬프트 템플릿 구조를 자유롭게 작성하세요..."
                  />
                </div>
                
                {/* 3. Additional Context */}
                <div className="shrink-0 flex flex-col gap-4">
                  <label className="text-2xl font-black text-slate-950 flex items-center gap-2 tracking-tight px-2 font-outfit uppercase">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    추가prompt
                  </label>
                  <textarea 
                    value={userInput}
                    onChange={e => setUserInput(e.target.value)}
                    className="h-28 bg-slate-50/80 border border-slate-950/[0.04] rounded-[1.5rem] p-8 text-slate-900 font-bold resize-none focus:outline-none focus:ring-8 focus:ring-emerald-500/[0.05] focus:border-emerald-500/30 placeholder:text-slate-200 shadow-inner ring-1 ring-slate-950/[0.02] backdrop-blur-sm"
                    placeholder="지금 이 순간에만 추가할 상황이나 코드를 입력하세요..."
                  />
                </div>

                <div className="pt-4 shrink-0 pb-6">
                  <button 
                    onClick={handleCopy}
                    className={cn(
                      "w-full py-7 rounded-[2.5rem] text-xl font-black flex items-center justify-center gap-4 transition-all duration-700 shadow-2xl active:scale-95 tracking-tighter uppercase italic",
                      copied 
                        ? "bg-emerald-600 text-white shadow-emerald-500/30 ring-4 ring-emerald-500/20" 
                        : "bg-slate-950 text-white shadow-slate-900/40 hover:bg-slate-900 ring-4 ring-slate-900/10"
                    )}
                  >
                    {copied ? <Check size={32} strokeWidth={3} /> : <Zap size={32} fill="currentColor" />}
                    {copied ? "COPIED TO CLIPBOARD!" : "ONE-CLICK CONSTRUCT & COPY"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
