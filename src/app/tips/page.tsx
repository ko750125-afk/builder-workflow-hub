"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { 
  ChevronLeft, 
  Plus, 
  Trash2, 
  Save, 
  MessageSquare, 
  Lightbulb,
  Star,
  Bold,
  Type,
  Palette,
  Underline
} from 'lucide-react';
import { 
  subscribeToCategories, 
  subscribeToTips, 
  initializeDefaultCategories,
  addCategory,
  addTip,
  updateTip,
  deleteTip,
  deleteCategory,
  updateCategoryOrders,
  toggleCategoryPin
} from '@/lib/db/tips';
import { TipCategory, DevTip } from '@/types';

import Link from 'next/link';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const TipEditor = ({ categoryId, tip, uid, onAddTip, onUpdateTip }: { categoryId: string, tip: DevTip | null, uid: string, onAddTip: (catId: string, uid: string, title: string, content: string) => Promise<string>, onUpdateTip: (id: string, updates: Partial<DevTip>) => Promise<void> }) => {
  const [content, setContent] = useState(tip?.content || "");
  const [isSaving, setIsSaving] = useState(false);
  const editorRef = React.useRef<HTMLDivElement>(null);

  // 초기 로드 시 및 팁 변경 시 에디터 내용 동기화
  useEffect(() => {
    if (editorRef.current && tip?.content !== undefined && editorRef.current.innerHTML !== tip.content) {
      editorRef.current.innerHTML = tip.content || "";
    }
    setContent(tip?.content || "");
  }, [tip?.id, tip?.content]);

  const execCommand = (command: string, value: string = "") => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      setContent(editorRef.current.innerHTML);
    }
  };

  const handleInput = () => {
    if (editorRef.current) {
      setContent(editorRef.current.innerHTML);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (tip) {
        await onUpdateTip(tip.id, { content });
      } else {
        await onAddTip(categoryId, uid, "", content);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white/60 backdrop-blur-md rounded-[2.5rem] border border-slate-100 shadow-inner flex-1 overflow-hidden">
      {/* Rich Editor Toolbar */}
      <div className="flex items-center justify-between p-3 px-6 border-b border-slate-100 bg-white/40 sticky top-0 z-10 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1">
          <button 
            onClick={() => execCommand('bold')}
            className="p-2 hover:bg-white rounded-xl text-slate-500 hover:text-blue-600 transition-all hover:shadow-sm"
            title="굵게"
          >
            <Bold size={18} />
          </button>
          
          <div className="w-[1px] h-6 bg-slate-100 mx-1" />

          {/* Text Color Picker */}
          <div className="flex items-center group relative">
            <button className="p-2 hover:bg-white rounded-xl text-slate-500 hover:text-blue-600 transition-all hover:shadow-sm flex items-center gap-1">
              <Palette size={18} />
              <div className="w-2 h-2 rounded-full bg-slate-900 border border-white/50" />
            </button>
            <div className="absolute top-full left-0 mt-1 p-2 bg-white rounded-2xl shadow-xl border border-slate-100 hidden group-hover:flex gap-1 z-20 animate-in fade-in zoom-in duration-200">
              {['#000000', '#2563eb', '#dc2626', '#16a34a', '#d97706', '#7c3aed'].map(color => (
                <button
                  key={color}
                  onClick={() => execCommand('foreColor', color)}
                  className="w-6 h-6 rounded-lg pointer cursor-pointer hover:scale-110 transition-transform shadow-sm"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Highlight Color Picker */}
          <div className="flex items-center group relative">
            <button className="p-2 hover:bg-white rounded-xl text-slate-500 hover:text-amber-600 transition-all hover:shadow-sm flex items-center gap-1">
              <Type size={18} />
              <div className="w-2 h-2 rounded-full bg-yellow-200 border border-white/50" />
            </button>
            <div className="absolute top-full left-0 mt-1 p-2 bg-white rounded-2xl shadow-xl border border-slate-100 hidden group-hover:flex gap-1 z-20 animate-in fade-in zoom-in duration-200">
              {['transparent', '#fef9c3', '#dcfce7', '#dbeafe', '#f3e8ff', '#fee2e2'].map(color => (
                <button
                  key={color}
                  onClick={() => execCommand('backColor', color)}
                  className="w-6 h-6 rounded-lg pointer cursor-pointer border border-slate-100 hover:scale-110 transition-transform shadow-sm flex items-center justify-center"
                  style={{ backgroundColor: color }}
                >
                  {color === 'transparent' && <span className="text-[8px] text-slate-400">X</span>}
                </button>
              ))}
            </div>
          </div>

          <button 
            onClick={() => execCommand('underline')}
            className="p-2 hover:bg-white rounded-xl text-slate-500 hover:text-slate-900 transition-all hover:shadow-sm"
            title="밑줄"
          >
            <Underline size={18} />
          </button>

          <div className="w-[1px] h-6 bg-slate-100 mx-1" />
          
          <button 
            onClick={() => execCommand('insertUnorderedList')}
            className="p-2 hover:bg-white rounded-xl text-slate-500 hover:text-slate-900 transition-all hover:shadow-sm text-sm font-black"
          >
            •
          </button>
        </div>

        {/* Primary Save Button in Toolbar */}
        <button
          onClick={handleSave}
          disabled={isSaving || content === (tip?.content || "")}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-xl text-[11px] font-black tracking-widest uppercase transition-all shadow-sm active:scale-95",
            isSaving ? "bg-slate-100 text-slate-400" : 
            content !== (tip?.content || "") 
              ? "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200 shadow-lg animate-pulse ring-4 ring-blue-600/10" 
              : "bg-slate-100 text-slate-400 border border-slate-200/50 opacity-50"
          )}
        >
          {isSaving ? <div className="w-3.5 h-3.5 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin" /> : <Save size={14} />}
          {isSaving ? "저장 중" : (content !== (tip?.content || "") ? "지금 저장" : "저장됨")}
        </button>
      </div>

      <div 
        ref={editorRef}
        contentEditable
        spellCheck="false"
        onInput={handleInput}
        className="w-full flex-1 bg-transparent p-8 text-base text-slate-950 font-medium leading-[2.2] outline-none overflow-y-auto custom-scrollbar min-h-[300px]"
        style={{ caretColor: '#1d4ed8' }} // Blue 700 caret for visibility
      />
      
      <div className="flex items-center justify-between p-4 px-8 border-t border-slate-100/80 bg-white/20">
         <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">
           {tip?.updatedAt && typeof (tip.updatedAt as any).toDate === 'function' 
             ? `Last synced: ${(tip.updatedAt as any).toDate().toLocaleString()}` 
             : "Drafting mode"}
         </span>
         {content !== (tip?.content || "") && (
           <span className="text-[10px] text-blue-500 font-black animate-pulse flex items-center gap-1 uppercase tracking-tighter">
             <div className="w-1 h-1 bg-blue-500 rounded-full" />
             Unsaved changes detected
           </span>
         )}
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
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  const [isAddingCategory, setIsAddingCategory] = useState(false);
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

  const handleDeleteCategory = async (id: string) => {
    try {
      await deleteCategory(id);
      if (selectedCategoryId === id) {
        setSelectedCategoryId(null);
        setTips([]);
      }
      setDeleteConfirmId(null);
    } catch (error) {
      console.error("Failed to delete category:", error);
    }
  };

  const handleUpdateTipContent = async (id: string, updates: Partial<DevTip>) => {
    try {
      await updateTip(id, updates);
    } catch (error) {
      console.error("Failed to update tip:", error);
    }
  };

  const handleMoveCategory = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === categories.length - 1) return;

    const newCategories = [...categories];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    // swap
    const temp = newCategories[index];
    newCategories[index] = newCategories[newIndex];
    newCategories[newIndex] = temp;

    // Optimistically update local state by assigning new order
    newCategories.forEach((cat, i) => {
      cat.order = i;
    });
    setCategories(newCategories);

    try {
      await updateCategoryOrders(newCategories.map((c, i) => ({ id: c.id, order: i })));
    } catch (error) {
      console.error("Failed to move category:", error);
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
      <div className="flex-1 flex flex-col md:flex-row gap-6 overflow-hidden">
        
        {/* Left Sidebar: Categories (Box 1) */}
        <div className={cn(
          "w-full md:w-56 flex-col gap-4 flex-shrink-0 h-full",
          selectedCategoryId ? "hidden md:flex" : "flex"
        )}>
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
              <div className="flex relative animate-in slide-in-from-top-2 duration-300">
                <input 
                  type="text" 
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="새 카테고리..."
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                  className="w-full px-4 py-2.5 pr-10 text-xs bg-slate-50 border border-slate-100 rounded-xl outline-none focus:border-blue-300 font-bold"
                  autoFocus
                />
                <button 
                  onClick={handleAddCategory}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-blue-600 transition-colors"
                >
                  <Save size={14} />
                </button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto flex flex-col gap-1 pr-2 custom-scrollbar">
              {categories.map((cat, index) => (
                <div key={cat.id} className="relative group/cat flex items-center gap-1">
                  <button
                    onClick={() => {
                      setSelectedCategoryId(cat.id);
                      setDeleteConfirmId(null);
                    }}
                    className={cn(
                      "flex-1 flex items-center justify-between pl-4 pr-12 py-4 rounded-2xl transition-all font-black text-sm text-left group gap-2 min-w-0 relative",
                      selectedCategoryId === cat.id 
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-100 scale-[1.02] z-10" 
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent hover:border-slate-100"
                    )}
                  >
                    <div className="flex items-center gap-3 overflow-hidden min-w-0">
                      <div className={cn(
                        "w-2 h-2 flex-shrink-0 rounded-full",
                        selectedCategoryId === cat.id ? "bg-white animate-pulse" : "bg-slate-300 group-hover:bg-slate-400"
                      )} />
                      <span className="capitalize truncate block w-full">{cat.name}</span>
                    </div>
                    {cat.isPinned && (
                      <Star size={12} className={cn("absolute right-4 top-1/2 -translate-y-1/2", selectedCategoryId === cat.id ? "text-white fill-white" : "text-amber-500 fill-amber-500")} />
                    )}
                  </button>
                  
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col justify-center items-center w-8 z-20">
                    {deleteConfirmId === cat.id ? (
                      <div className="flex flex-col items-center gap-1 z-20 bg-white p-1 rounded-lg">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.id); }} 
                          className="p-1 px-[0.3rem] text-[10px] whitespace-nowrap font-bold text-white bg-red-500 rounded hover:bg-red-600 transition-colors border border-transparent"
                        >
                          삭제
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(null); }} 
                          className="p-1 px-[0.3rem] text-[10px] whitespace-nowrap font-bold text-slate-500 bg-slate-100 rounded hover:bg-slate-200 transition-colors border border-slate-200"
                        >
                          취소
                        </button>
                      </div>
                    ) : (
                      <div className={cn(
                        "flex flex-col items-center gap-1 transition-all w-full",
                        selectedCategoryId === cat.id 
                          ? "opacity-100" 
                          : "opacity-0 group-hover/cat:opacity-100"
                      )}>
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            toggleCategoryPin(cat.id, !cat.isPinned); 
                          }}
                          className={cn(
                            "p-1.5 rounded-lg transition-all active:scale-90",
                            cat.isPinned ? "text-amber-500" : "text-slate-200 hover:text-slate-400"
                          )}
                          title={cat.isPinned ? "핀 해제" : "핀 고정"}
                        >
                          <Star size={16} fill={cat.isPinned ? "currentColor" : "none"} />
                        </button>
                        
                        <button 
                          onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(cat.id); }}
                          className="p-1.5 rounded-lg text-slate-200 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="카테고리 삭제"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>

        {/* Right Content Area: Tips List with Content (Box 2) */}
        <div className={cn(
          "flex-1 flex-col gap-4 overflow-hidden h-full",
          !selectedCategoryId ? "hidden md:flex" : "flex"
        )}>
          <div className="bg-white/95 backdrop-blur-md rounded-[3rem] border border-slate-950/[0.06] p-6 md:p-10 flex flex-col gap-8 shadow-sm overflow-hidden h-full">
            <div className="flex items-center justify-between px-2 md:px-4 pb-2 border-b border-slate-50">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setSelectedCategoryId(null)}
                  className="md:hidden p-2 -ml-2 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-colors"
                >
                  <ChevronLeft size={24} />
                </button>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest hidden md:block">Developer Knowledge Base</span>
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest md:hidden">Knowledge Base</span>
                  <h2 className="text-xl font-black font-outfit uppercase tracking-tighter italic text-slate-950 truncate max-w-[200px] md:max-w-none">
                    {categories.find(c => c.id === selectedCategoryId)?.name || "정보를 선택하세요"}
                  </h2>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-hidden flex pl-1">
              {selectedCategoryId ? (
                <TipEditor 
                  categoryId={selectedCategoryId} 
                  tip={tips[0] || null} 
                  uid={user.uid} 
                  onAddTip={addTip} 
                  onUpdateTip={handleUpdateTipContent} 
                />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-300 text-center bg-slate-50/50 rounded-[2.5rem] border border-slate-100 border-dashed">
                  <Lightbulb size={48} className="mb-4 opacity-10" />
                  <span className="text-sm font-bold uppercase tracking-widest text-slate-400">카테고리를 선택하여 기록을 시작하세요</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
