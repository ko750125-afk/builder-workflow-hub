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
  MessageSquare, 
  Lightbulb
} from 'lucide-react';
import Link from 'next/link';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const TipCard = ({ tip, onDelete, onSave }: { tip: DevTip, onDelete: (id: string, e: React.MouseEvent) => void, onSave: (id: string, updates: Partial<DevTip>) => Promise<void> }) => {
  const [title, setTitle] = useState(tip.title);
  const [content, setContent] = useState(tip.content);
  const [isSaving, setIsSaving] = useState(false);

  // Sync state if tip changes externally
  useEffect(() => {
    setTitle(tip.title);
    setContent(tip.content);
  }, [tip.title, tip.content]);

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(tip.id, { title, content });
    setIsSaving(false);
  };

  return (
    <div className="group p-8 rounded-[2.5rem] border bg-white transition-all relative overflow-hidden border-slate-100 hover:border-blue-200 hover:shadow-2xl hover:shadow-blue-500/5 flex flex-col h-full">
      <div className="flex flex-col gap-5 flex-1">
        <div className="flex items-start justify-between">
          <input 
            type="text" 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onFocus={(e) => { if (e.target.value === '새로운 팁') setTitle(''); }}
            onBlur={(e) => { if (e.target.value === '') setTitle('새로운 팁'); }}
            placeholder="제목 없음"
            className="w-full text-lg font-black font-outfit bg-transparent border-none outline-none focus:ring-0 text-slate-900 placeholder:text-slate-200 uppercase italic tracking-tight"
          />
          <button 
            onClick={(e) => onDelete(tip.id, e)}
            className="p-2.5 bg-rose-50 text-rose-500 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-100 shadow-sm flex-shrink-0 ml-2"
          >
            <Trash2 size={14} />
          </button>
        </div>
        
        <textarea 
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="여기에 상세 내용을 입력하세요..."
          className="w-full flex-1 bg-slate-50/50 hover:bg-slate-50/80 rounded-2xl p-6 text-sm text-slate-700 font-medium leading-relaxed outline-none border border-transparent focus:border-blue-100 focus:bg-white transition-all resize-none min-h-[150px] custom-scrollbar"
        />
        
        <div className="flex items-center justify-between px-2 pt-2 mt-auto">
           <button
             onClick={handleSave}
             disabled={isSaving || (title === tip.title && content === tip.content)}
             className={cn(
               "flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black tracking-widest uppercase transition-all shadow-sm",
               isSaving ? "bg-slate-100 text-slate-400" : 
               (title !== tip.title || content !== tip.content) ? "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200 shadow-md" : 
               "bg-slate-100 text-slate-400 border border-slate-200/60"
             )}
           >
             {isSaving ? <div className="w-3 h-3 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin" /> : <Save size={12} />}
             {isSaving ? "저장 중..." : "저장"}
           </button>
           <span className="text-[9px] text-slate-300 font-bold uppercase tracking-widest">
             {tip.updatedAt?.toDate?.()?.toLocaleDateString() || "Recently Edited"}
           </span>
        </div>
      </div>
    </div>
  );
};

export default function TipsPage() {
  const { user, loading: authLoading } = useAuth();
  const [categories, setCategories] = useState<TipCategory[]>([]);
  const [tips, setTips] = useState<DevTip[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedTip, setSelectedTip] = useState<DevTip | null>(null);
  
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isAddingTip, setIsAddingTip] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

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

    // Immediately clear tips to prevent lingering data from the previous category
    setTips([]);

    const unsub = subscribeToTips(user.uid, selectedCategoryId, (data) => {
      setTips(data);
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
    setIsAddingTip(true);
    try {
      await addTip(selectedCategoryId, user.uid);
    } catch (error) {
      console.error("Failed to add tip:", error);
    } finally {
      setIsAddingTip(false);
    }
  };

  const handleUpdateTipContent = async (id: string, updates: Partial<DevTip>) => {
    try {
      await updateTip(id, updates);
    } catch (error) {
      console.error("Failed to update tip:", error);
    }
  };

  const handleDeleteTip = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("이 팁을 정말 삭제하시겠습니까?")) return;
    try {
      await deleteTip(id);
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
            <span className="text-[10px] text-blue-600 font-bold tracking-widest uppercase">Knowledge & Library</span>
          </div>
        </div>
      </div>

      {/* Main Content Area: 2 Columns Layout */}
      <div className="flex-1 flex gap-6 overflow-hidden">
        
        {/* Left Sidebar: Categories (Box 1) */}
        <div className="w-56 flex flex-col gap-4 flex-shrink-0">
          <div className="bg-white/90 backdrop-blur-md rounded-[2.5rem] border border-slate-950/[0.06] p-6 flex flex-col gap-6 shadow-sm overflow-hidden h-full">
            <div className="flex items-center justify-between px-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Categories</span>
              <button 
                onClick={() => setIsAddingCategory(!isAddingCategory)}
                className="p-1.5 hover:bg-white rounded-lg text-slate-400 hover:text-blue-600 transition-all hover:shadow-sm"
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
                  className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-100 rounded-xl outline-none focus:border-blue-300 font-bold"
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
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all font-black text-sm text-left group",
                    selectedCategoryId === cat.id 
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-100 scale-[1.02]" 
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent hover:border-slate-100"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      selectedCategoryId === cat.id ? "bg-white animate-pulse" : "bg-slate-300 group-hover:bg-slate-400"
                    )} />
                    <span className="capitalize">{cat.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Content Area: Tips List with Content (Box 2) */}
        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          <div className="bg-white/95 backdrop-blur-md rounded-[3rem] border border-slate-950/[0.06] p-10 flex flex-col gap-8 shadow-sm overflow-hidden h-full">
            <div className="flex items-center justify-between px-4 pb-2 border-b border-slate-50">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Developer Knowledge Base</span>
                <h2 className="text-xl font-black font-outfit uppercase tracking-tighter italic text-slate-950">
                  {categories.find(c => c.id === selectedCategoryId)?.name || "정보를 선택하세요"}
                </h2>
              </div>
              <button 
                onClick={handleAddTip}
                disabled={!selectedCategoryId || isAddingTip}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl text-xs font-black hover:bg-blue-700 transition-all disabled:opacity-50 shadow-lg shadow-blue-200 active:scale-95"
              >
                {isAddingTip ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Plus size={16} strokeWidth={3} /> 
                )}
                새로운 팁 추가
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
                {tips.length === 0 ? (
                  <div className="col-span-full flex flex-col items-center justify-center py-40 text-slate-300 text-center">
                    <MessageSquare size={48} className="mb-4 opacity-10" />
                    <span className="text-sm font-bold uppercase tracking-widest text-slate-400">저장된 지식이 없습니다. 새로 추가해보세요!</span>
                  </div>
                ) : (
                  tips.map((tip) => (
                    <TipCard 
                      key={tip.id} 
                      tip={tip} 
                      onDelete={handleDeleteTip} 
                      onSave={handleUpdateTipContent} 
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
