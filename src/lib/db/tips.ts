import { db } from "../firebase";
import { DevTip, TipCategory } from "@/types";
import { 
  collection, 
  addDoc, 
  doc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  getDocs,
  setDoc,
  writeBatch
} from "firebase/firestore";

const TIPS_COLLECTION = "builder_hub_tips";
const CATEGORIES_COLLECTION = "builder_hub_tip_categories";

// --- Categories ---

/**
 * 초기 카테고리 생성 (사용자 첫 진입 시)
 */
export const initializeDefaultCategories = async (uid: string) => {
  const defaults = ["firebase", "supabase", "replit", "github", "vercel", "login", "pay"];
  const batch = writeBatch(db);
  
  // 이미 존재하는지 확인
  const q = query(collection(db, CATEGORIES_COLLECTION), where("uid", "==", uid));
  const snap = await getDocs(q);
  
  if (snap.empty) {
    defaults.forEach((name, index) => {
      const newRef = doc(collection(db, CATEGORIES_COLLECTION));
      batch.set(newRef, {
        id: newRef.id,
        name,
        order: index,
        uid,
        createdAt: serverTimestamp()
      });
    });
    await batch.commit();
  }
};

export const subscribeToCategories = (uid: string | null, callback: (categories: TipCategory[]) => void) => {
  if (!uid) return () => {};
  const q = query(collection(db, CATEGORIES_COLLECTION), where("uid", "==", uid));
  return onSnapshot(q, (snapshot) => {
    let list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TipCategory));
    list = list.sort((a, b) => (a.order || 0) - (b.order || 0));
    callback(list);
  });
};

export const addCategory = async (name: string, uid: string, order: number) => {
  const ref = await addDoc(collection(db, CATEGORIES_COLLECTION), {
    name,
    uid,
    order,
    createdAt: serverTimestamp()
  });
  return ref.id;
};

export const deleteCategory = async (id: string) => {
  const ref = doc(db, CATEGORIES_COLLECTION, id);
  await deleteDoc(ref);
};

// --- Tips ---

export const addTip = async (categoryId: string, uid: string, title: string = "새로운 팁", content: string = "") => {
  const ref = await addDoc(collection(db, TIPS_COLLECTION), {
    categoryId,
    uid,
    title,
    content,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return ref.id;
};

export const updateTip = async (id: string, data: Partial<DevTip>) => {
  const ref = doc(db, TIPS_COLLECTION, id);
  await updateDoc(ref, {
    ...data,
    updatedAt: serverTimestamp()
  });
};

export const deleteTip = async (id: string) => {
  const ref = doc(db, TIPS_COLLECTION, id);
  await deleteDoc(ref);
};

export const subscribeToTips = (uid: string | null, categoryId: string, callback: (tips: DevTip[]) => void) => {
  if (!uid) return () => {};
  const q = query(
    collection(db, TIPS_COLLECTION), 
    where("uid", "==", uid), 
    where("categoryId", "==", categoryId)
  );
  return onSnapshot(q, (snapshot) => {
    let list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DevTip));
    list = list.sort((a, b) => {
      const timeA = a.createdAt?.toMillis?.() || 0;
      const timeB = b.createdAt?.toMillis?.() || 0;
      return timeB - timeA;
    });
    callback(list);
  });
};
