"use client";

import { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User, setPersistence, browserLocalPersistence } from 'firebase/auth';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe = () => {};
    
    // 핵심 조치: Next.js 서버 옵션을 탈피하고 브라우저 로컬 저장소에 세션을 영구 박제
    setPersistence(auth, browserLocalPersistence)
      .then(() => {
        unsubscribe = onAuthStateChanged(auth, (user) => {
          setUser(user);
          setLoading(false);
        });
      })
      .catch(console.error);

    return () => unsubscribe();
  }, []);

  return { user, loading };
}
