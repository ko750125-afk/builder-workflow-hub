"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { PayPalButtons } from "@paypal/react-paypal-js";
import { Lock, Crown, CheckCircle2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

interface SubscriptionGateProps {
  children: React.ReactNode;
}

export default function SubscriptionGate({ children }: SubscriptionGateProps) {
  const { user, loading: authLoading } = useAuth();
  const [isPaid, setIsPaid] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setIsPaid(false);
      setLoading(false);
      return;
    }

    const checkSubscription = async () => {
      try {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          setIsPaid(userSnap.data().isPaid || false);
        } else {
          await setDoc(userRef, {
            email: user.email,
            isPaid: false,
            createdAt: new Date()
          });
          setIsPaid(false);
        }
      } catch (error) {
        console.error("Error checking subscription:", error);
      } finally {
        setLoading(false);
      }
    };

    checkSubscription();
  }, [user, authLoading]);

  const handlePaymentSuccess = async (details: any) => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        isPaid: true,
        lastPayment: details,
        updatedAt: new Date()
      });
      setIsPaid(true);
      alert('결제가 완료되었습니다! 프리미엄 기능을 마음껏 이용하세요.');
    } catch (error) {
      console.error("Error updating subscription:", error);
    }
  };

  if (authLoading || loading) {
    return <div className="animate-pulse bg-white/5 h-40 rounded-3xl mb-10" />;
  }

  if (!isPaid) {
    return (
      <div className="relative overflow-hidden group">
        <div className="filter blur-md opacity-40 pointer-events-none select-none">
          {children}
        </div>
        
        <div className="absolute inset-0 z-10 flex items-center justify-center p-6 bg-black/20 backdrop-blur-[2px] rounded-3xl border border-white/10 shadow-2xl">
          <div className="w-full max-w-sm bg-[#0f172a] border border-blue-500/30 rounded-3xl p-8 text-center shadow-[0_0_50px_-12px_rgba(59,130,246,0.5)] animate-in fade-in zoom-in duration-500">
            <div className="w-16 h-16 bg-blue-600/20 text-blue-400 flex items-center justify-center rounded-2xl mx-auto mb-6 shadow-glow">
              <Crown size={32} />
            </div>
            
            <h3 className="text-2xl font-bold font-outfit text-white mb-2">프리미엄 업그레이드</h3>
            <p className="text-slate-400 text-sm mb-8 leading-relaxed">
              '개발 실행 가속기(프롬프트 생성)'와<br/>
              '무제한 프로젝트 관리' 기능을 잠금 해제하세요.
            </p>
            
            <div className="space-y-3 mb-8 text-left">
              {[
                '모든 상황별 프롬프트 즉시 생성',
                '복사 및 히스토리 관리',
                '개인별 프로젝트 클라우드 저장'
              ].map(text => (
                <div key={text} className="flex items-center gap-2 text-xs text-slate-300">
                  <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                  <span>{text}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-4">
              <div className="text-3xl font-black font-outfit text-white">
                $9.99 <span className="text-sm font-normal text-slate-500">/ lifetime</span>
              </div>
              
              <div className="min-h-[150px]">
                <PayPalButtons 
                  style={{ layout: "vertical", shape: "pill", label: "pay" }}
                  createOrder={(data, actions) => {
                    return actions.order.create({
                      intent: "CAPTURE",
                      purchase_units: [{
                        amount: {
                          value: "9.99",
                          currency_code: "USD"
                        },
                        description: "Builder Workflow Hub - Lifetime Access"
                      }]
                    });
                  }}
                  onApprove={(data, actions) => {
                    return actions.order!.capture().then((details) => {
                      handlePaymentSuccess(details);
                    });
                  }}
                />
              </div>
            </div>
            
            <p className="text-[10px] text-slate-600 mt-4">
              한 번 구매로 영구적인 혜택을 누리세요. (Refundable in 7 days)
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
