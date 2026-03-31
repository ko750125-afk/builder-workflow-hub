import { db } from "../firebase";
import { AppEntry, AppStatus } from "@/types";
import { collection, addDoc, doc, updateDoc, deleteDoc, getDoc, onSnapshot, query, where, orderBy, serverTimestamp } from "firebase/firestore";

const APPS_COLLECTION = "builder_hub_apps"; // Keeping this unique just in case!

export const createApp = async (name: string, uid?: string, initialStatus: AppStatus = "idea") => {
  const newApp = {
    name,
    description: "",
    status: initialStatus,
    progress: 0,
    githubStatus: "unknown" as const,
    uid: uid || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, APPS_COLLECTION), newApp);
  return { id: docRef.id, ...newApp };
};

export const updateApp = async (id: string, data: Partial<AppEntry>) => {
  const appRef = doc(db, APPS_COLLECTION, id);
  await updateDoc(appRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

export const deleteApp = async (id: string) => {
  const appRef = doc(db, APPS_COLLECTION, id);
  await deleteDoc(appRef);
};

export const getAppDetail = async (id: string) => {
  const appRef = doc(db, APPS_COLLECTION, id);
  const snap = await getDoc(appRef);
  if (snap.exists()) {
    return { id: snap.id, ...snap.data() } as AppEntry;
  }
  return null;
};

export const subscribeToApps = (uid: string | null, callback: (apps: AppEntry[]) => void) => {
  let q = query(collection(db, APPS_COLLECTION));
  
  if (uid) {
    q = query(collection(db, APPS_COLLECTION), where('uid', '==', uid));
  }

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const apps = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    })) as AppEntry[];

    // 정렬(최근 업데이트순)을 파이어베이스 서버가 아닌 클라이언트(앱 내부)에서 처리
    // 복합 색인(Index) 생성 대기열을 피하기 위한 조치
    // 정렬(고정 여부 우선, 그 다음 최근 업데이트순)
    apps.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      
      const timeA = (a as any).updatedAt?.toDate?.()?.getTime() || 0;
      const timeB = (b as any).updatedAt?.toDate?.()?.getTime() || 0;
      return timeB - timeA;
    });
    
    callback(apps);
  });

  return unsubscribe;
};
