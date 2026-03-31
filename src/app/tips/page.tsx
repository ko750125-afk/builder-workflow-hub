"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { 
  subscribeToCategories, 
  subscribeToTips, 
  initializeDefaultCategories,
  addCategory,
  addTip,
  updateTip,
  deleteTip
} from '@/lib/db/tips';
import { TipCategory, DevTip } from '@/types';
import { 
  ChevronLeft, 
  Plus, 
  Trash2, 
  Save, 
  Search, 
  MessageSquare, 
  Code2, 
  Terminal, 
  Database,
  Github,
  Globe,
  Settings,
  ChevronRight,
  MoreVertical,
  Edit2,
  Lightbulb
} from 'lucide-react';
import Link from 'next/link';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function TipsPage() {
  const { user, loading: authLoading } = useAuth();
  const [categories, setCategories] = useState<TipCategory[]>([]);
  const [tips, setTips] = useState<DevTip[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedTip, setSelectedTip] = useState<DevTip | null>(null);
  
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Initialize and Fetch Categories
  useEffect(() => {
    if (authLoading || !user) return;

    const init = async () => {
      await initializeDefaultCategories(user.uid);
    };
    init();

    const unsub = subscribeToCategories(user.uid, (data) => {
      setCategories(data);
      if (data.length > 0 && !selectedCategoryId) {
        setSelectedCategoryId(data[0].id);
      }
    });
    return () => unsub();
  }, [user, authLoading]);

  // Fetch Tips for Selected Category
  useEffect(() => {
    if (!user || !selectedCategoryId) return;

    const unsub = subscribeToTips(user.uid, selectedCategoryId, (data) => {
      setTips(data);
      // Keep selected tip updated if it changes
      if (selectedTip) {
        const updated = data.find(t => t.id === selectedTip.id);
        if (updated) setSelectedTip(updated);
      }
    });
    return () => unsub();
  }, [user, selectedCategoryId]);

  const handleAddCategory = async () => {
    if (!newCategoryName.trim() || !user) return;
    try {
      await addCategory(newCategoryName, user.uid, categories.length);
      setNewCategoryName("");
      setIsAddingCategory(false);
    } catch (error) {
      console.error("Failed to add category:", error);
    }
  };

  const handleAddTip = async () => {
    if (!selectedCategoryId || !user) return;
    try {
      const id = await addTip(selectedCategoryId, user.uid);
      // Auto-select the newly created tip
      // The subscription will update tips list and provide the actual object
    } catch (error) {
      console.error("Failed to add tip:", error);
    }
  };

  const handleUpdateTipContent = async (field: keyof DevTip, value: string) => {
    if (!selectedTip) return;
    const updated = { ...selectedTip, [field]: value };
    setSelectedTip(updated);
    
    // Auto-save logic (simple debounce or delay could be added)
    try {
      await updateTip(selectedTip.id, { [field]: value });
    } catch (error) {
      console.error("Failed to update tip:", error);
    }
  };

  const handleDeleteTip = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("이 팁을 정말 삭제하시겠습니까?")) return;
    try {
      await deleteTip(id);
      if (selectedTip?.id === id) setSelectedTip(null);
    } catch (error) {
      console.error("Failed to delete tip:", error);
    }
  };

  if (authLoading) return (
    <div className="flex items-center justify-center py-40">
      <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
    </div>
  );

  if (!user) return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <h2 className="text-2xl font-bold mb-4">로그인이 필요합니다</h2>
      <Link href="/" className="text-blue-600 hover:underline">홈으로 돌아가기</Link>
    </div>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-160px)] gap-6">
      {/* Top Header */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 text-slate-500 hover:text-slate-950 transition-all font-bold group">
            <div className="p-2 bg-white rounded-xl shadow-sm group-hover:shadow-md transition-all border border-slate-100">
              <ChevronLeft size={20} />
            </div>
            <span className="hidden sm:inline">홈으로</span>
          </Link>
          <div className="flex flex-col">
            <h1 className="text-2xl font-black font-outfit text-slate-950 tracking-tighter uppercase italic">DEVELOPMENT TIPS</h1>
            <span className="text-[10px] text-blue-600 font-bold tracking-widest uppercase">Knowledge & Notes Hub</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex gap-6 overflow-hidden">
        
        {/* Left Sidebar: Categories */}
        <div className="w-64 flex flex-col gap-4 flex-shrink-0">
          <div className="bg-white/80 backdrop-blur-md rounded-[2.5rem] border border-slate-950/[0.06] p-6 flex flex-col gap-6 shadow-sm overflow-hidden h-full">
            <div className="flex items-center justify-between px-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Categories</span>
              <button 
                onClick={() => setIsAddingCategory(!isAddingCategory)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-all"
              >
                <Plus size={16} />
              </button>
            </div>

            {isAddingCategory && (
              <div className="flex flex-col gap-2 animate-in slide-in-from-top-2 duration-300">
                <input 
                  type="text" 
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="새 카테고리..."
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                  className="w-full px-4 py-2 text-xs bg-slate-50 border border-slate-100 rounded-xl outline-none focus:border-blue-300 font-bold"
                  autoFocus
                />
              </div>
            )}

            <div className="flex-1 overflow-y-auto flex flex-col gap-1 pr-2 custom-scrollbar">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategoryId(cat.id);
                    setSelectedTip(null);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all font-bold text-sm text-left group",
                    selectedCategoryId === cat.id 
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-100" 
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      selectedCategoryId === cat.id ? "bg-white animate-pulse" : "bg-slate-200"
                    )} />
                    <span className="capitalize">{cat.name}</span>
                  </div>
                  {selectedCategoryId !== cat.id && (
                    <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Middle Sidebar: Tips List */}
        <div className="w-80 flex flex-col gap-4 flex-shrink-0">
          <div className="bg-white/80 backdrop-blur-md rounded-[2.5rem] border border-slate-950/[0.06] p-6 flex flex-col gap-6 shadow-sm overflow-hidden h-full">
            <div className="flex items-center justify-between px-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Stored Tips</span>
              <button 
                onClick={handleAddTip}
                disabled={!selectedCategoryId}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 text-white rounded-xl text-[10px] font-black hover:bg-slate-800 transition-all disabled:opacity-50"
              >
                <Plus size={12} strokeWidth={3} /> ADD NEW
              </button>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-2 custom-scrollbar">
              {tips.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-300 text-center px-4">
                  <MessageSquare size={32} className="mb-3 opacity-20" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">저장된 팁이 없습니다</span>
                </div>
              ) : (
                tips.map((tip) => (
                  <div
                    key={tip.id}
                    onClick={() => setSelectedTip(tip)}
                    className={cn(
                      "p-5 rounded-3xl border transition-all cursor-pointer group relative",
                      selectedTip?.id === tip.id
                        ? "bg-white border-blue-200 shadow-xl shadow-blue-100/50 ring-1 ring-blue-500/10"
                        : "bg-slate-50/50 border-transparent hover:border-slate-200 hover:bg-white"
                    )}
                  >
                    <div className="flex flex-col gap-2">
                      <h4 className={cn(
                        "font-black text-sm font-outfit line-clamp-1 italic uppercase tracking-tight",
                        selectedTip?.id === tip.id ? "text-blue-600" : "text-slate-900"
                      )}>
                        {tip.title || "제목 없음"}
                      </h4>
                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed font-medium">
                        {tip.content || "설명이 아직 없습니다."}
                      </p>
                    </div>
                    <button 
                      onClick={(e) => handleDeleteTip(tip.id, e)}
                      className="absolute top-4 right-4 p-2 bg-rose-50 text-rose-500 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-100"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Area: Editor */}
        <div className="flex-1">
          {selectedTip ? (
            <div className="bg-white/95 rounded-[3.5rem] border border-slate-950/[0.08] shadow-2xl shadow-slate-200/50 p-12 h-full flex flex-col gap-10 animate-in fade-in zoom-in-95 duration-500 overflow-hidden">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] px-2 flex items-center gap-2">
                     <Edit2 size={14} /> Editing Tip
                  </span>
                  <span className="text-[9px] text-slate-300 font-bold uppercase tracking-widest">
                    Last Updated: {selectedTip.updatedAt?.toDate?.()?.toLocaleString() || "Just now"}
                  </span>
                </div>
                <input 
                  type="text" 
                  value={selectedTip.title}
                  onChange={(e) => handleUpdateTipContent('title', e.target.value)}
                  placeholder="제목을 입력하세요..."
                  className="text-4xl font-black font-outfit bg-transparent border-none outline-none focus:ring-0 text-slate-900 placeholder:text-slate-100 tracking-tighter px-0 italic uppercase"
                />
              </div>

              <div className="flex-1 flex flex-col gap-4">
                <div className="flex items-center justify-between px-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Detail Description & Code Snippets</label>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black tracking-widest uppercase">
                      <Save size={10} /> Auto Saving
                    </div>
                  </div>
                </div>
                <textarea 
                  value={selectedTip.content}
                  onChange={(e) => handleUpdateTipContent('content', e.target.value)}
                  placeholder="돌파 과정, 핵심 로직, 주의사항 등을 자유롭게 기록하세요..."
                  className="flex-1 w-full bg-slate-50/50 border border-slate-100 rounded-[2.5rem] p-10 outline-none focus:ring-4 focus:ring-blue-100/30 focus:border-blue-300 text-slate-700 font-medium leading-relaxed shadow-inner placeholder:text-slate-200 resize-none font-sans text-lg"
                />
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center bg-slate-50/50 rounded-[3.5rem] border border-slate-950/[0.04] p-20 text-center gap-10">
              <div className="w-32 h-32 bg-white rounded-[3rem] border border-slate-100 shadow-xl flex items-center justify-center ring-1 ring-blue-500/5 rotate-3">
                <Lightbulb size={56} className="text-slate-200" strokeWidth={1.5} />
              </div>
              <div className="flex flex-col gap-4">
                <h3 className="text-2xl font-black text-slate-950 font-outfit uppercase tracking-tighter">Choose a Tip to View</h3>
                <p className="text-slate-400 font-bold text-sm max-w-xs leading-relaxed">
                  왼쪽 목록에서 기록된 팁을 선택하거나,<br/>새로운 팁을 추가하여 지식을 축적하세요.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
