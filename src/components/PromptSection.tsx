"use client";

import React, { useState } from 'react';
import { AppEntry } from '@/types';
import { Copy, Check, Terminal, Code2, Bug, Repeat, Layout, Sparkles } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface PromptSectionProps {
  app: AppEntry;
}

type PromptType = 'continue' | 'feature' | 'bug' | 'refactor' | 'ui';

interface PromptTemplate {
  id: PromptType;
  label: string;
  icon: React.ReactNode;
  template: string;
  description: string;
}

const templates: PromptTemplate[] = [
  {
    id: 'continue',
    label: '이어서 개발',
    icon: <Sparkles size={18} />,
    description: '현재 상태 분석 및 다음 단계 준비',
    template: `당신은 기존 프로젝트를 분석하는 시니어 개발자입니다.
목표: 현재 프로젝트 상태를 정확히 파악하고 다음 개발을 준비하세요.
요구사항:
1. 전체 구조 요약
2. 구현된 기능 정리
3. 미완성/개선 필요 부분 정리
4. 다음 단계에서 할 수 있는 작업 후보 제시
❗ 실제 개발은 하지 말고 분석과 정리만 수행하세요.`
  },
  {
    id: 'feature',
    label: '기능 추가',
    icon: <Code2 size={18} />,
    description: '기존 시스템 확장 및 새 기능 구현',
    template: `당신은 기존 시스템을 유지하면서 기능을 확장하는 시니어 개발자입니다.
목표: 기존 기능을 유지하면서 새로운 기능을 추가하세요.
요구사항:
1. 기존 구조 유지
2. 영향 최소화
3. 확장 방식 구현
❗ 기존 기능 절대 손상 금지`
  },
  {
    id: 'bug',
    label: '버그 수정',
    icon: <Bug size={18} />,
    description: '특정 문제 정확한 수정 및 디버깅',
    template: `당신은 디버깅 전문가입니다.
목표: 특정 문제만 정확하게 수정하세요.
요구사항:
1. 원인 분석
2. 최소 수정
❗ 다른 기능 영향 금지`
  },
  {
    id: 'refactor',
    label: '리팩토링',
    icon: <Repeat size={18} />,
    description: '코드 구조 개선 및 가독성 확보',
    template: `당신은 리팩토링 전문가입니다.
목표: 코드 구조 개선
요구사항:
- 가독성 개선
- 중복 제거
❗ 기능 변경 금지`
  },
  {
    id: 'ui',
    label: 'UI 개선',
    icon: <Layout size={18} />,
    description: '디자인 고도화 및 UX 정제',
    template: `당신은 UI/UX 디자이너입니다.
목표: 디자인 개선
요구사항:
- Tailwind 기반
- 여백 정리
- 카드 UI 개선
❗ 기능 변경 금지`
  }
];

export default function PromptSection({ app }: PromptSectionProps) {
  const [activePrompt, setActivePrompt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generatePrompt = (template: string) => {
    const baseInfo = `[앱 정보]
앱 이름: ${app.name}
현재 상태: ${app.status}
완성도: ${app.progress}%
설명: ${app.description || '없음'}
URL: ${app.url || '없음'}

`;
    setActivePrompt(baseInfo + template);
    setCopied(false);
  };

  const handleCopy = async () => {
    if (!activePrompt) return;
    try {
      await navigator.clipboard.writeText(activePrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <section className="flex flex-col gap-6 mt-10">
      <div className="flex items-center gap-2 text-blue-400">
        <Terminal size={20} />
        <h2 className="text-xl font-bold font-outfit tracking-tight">🚀 개발 실행 가속기</h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {templates.map((t) => (
          <button
            key={t.id}
            onClick={() => generatePrompt(t.template)}
            className="flex flex-col items-center justify-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-blue-600/10 hover:border-blue-500/50 transition-all group"
          >
            <div className="p-3 rounded-xl bg-white/5 group-hover:bg-blue-600/20 text-slate-400 group-hover:text-blue-400 transition-colors">
              {t.icon}
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-sm font-bold text-slate-200 group-hover:text-white">{t.label}</span>
              <span className="text-[10px] text-slate-500 text-center leading-tight group-hover:text-slate-400">
                {t.description.split(' ').join('\n')}
              </span>
            </div>
          </button>
        ))}
      </div>

      {activePrompt && (
        <div className="relative mt-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="absolute right-4 top-4 flex gap-2">
            <button
              onClick={handleCopy}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
                copied 
                  ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/50" 
                  : "bg-white/10 hover:bg-white/20 text-slate-300 border border-white/10"
              )}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? '복사됨!' : '프롬프트 복사'}
            </button>
            <button
              onClick={() => setActivePrompt(null)}
              className="p-2 bg-white/5 hover:bg-white/10 text-slate-500 hover:text-white rounded-xl transition-all"
            >
              <span className="text-lg leading-none">×</span>
            </button>
          </div>
          <div className="p-6 pt-16 bg-black/40 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-md">
            <pre className="text-sm text-slate-300 font-mono whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto custom-scrollbar">
              {activePrompt}
            </pre>
          </div>
        </div>
      )}
    </section>
  );
}
