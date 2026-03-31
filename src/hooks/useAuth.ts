"use client";

import { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User, setPersistence, browserLocalPersistence } from 'firebase/auth';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. 세션 유지 설정 (비동기로 실행하되 로딩 상태를 막지 않음)
    setPersistence(auth, browserLocalPersistence).catch((err) => {
      console.error("Auth persistence error:", err);
    });

    // 2. 인증 상태 감시 (즉시 시작)
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    }, (error) => {
      console.error("onAuthStateChanged error:", error);
      setLoading(false); // 에러 발생 시에도 로딩은 해제해야 함
    });

    return () => unsubscribe();
  }, []);

  return { user, loading };
}
