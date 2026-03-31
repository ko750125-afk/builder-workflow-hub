import { db } from "../firebase";
import { collection, addDoc, doc, updateDoc, deleteDoc, onSnapshot, query, where, serverTimestamp, writeBatch } from "firebase/firestore";

export interface SkillEntry {
  id: string;
  title: string;
  template: string;
  uid: string | null;
  isFavorite?: boolean;
  order?: number;
  createdAt?: any;
  updatedAt?: any;
}

const SKILLS_COLLECTION = "builder_hub_skills";

export const createSkill = async (title: string, template: string, uid?: string, order?: number) => {
  const newSkill = {
    title,
    template,
    uid: uid || null,
    order: order || 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, SKILLS_COLLECTION), newSkill);
  return { id: docRef.id, ...newSkill };
};

export const updateSkill = async (id: string, data: Partial<SkillEntry>) => {
  const ref = doc(db, SKILLS_COLLECTION, id);
  await updateDoc(ref, {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

export const deleteSkill = async (id: string) => {
  const ref = doc(db, SKILLS_COLLECTION, id);
  await deleteDoc(ref);
};

export const updateSkillOrders = async (updates: { id: string, order: number }[]) => {
  const batch = writeBatch(db);
  updates.forEach(u => {
    const ref = doc(db, SKILLS_COLLECTION, u.id);
    batch.update(ref, { order: u.order });
  });
  await batch.commit();
};

export const subscribeToSkills = (uid: string | null, callback: (skills: SkillEntry[]) => void) => {
  let q = query(collection(db, SKILLS_COLLECTION));
  
  if (uid) {
    q = query(collection(db, SKILLS_COLLECTION), where('uid', '==', uid));
  }

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const skills = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    })) as SkillEntry[];

    skills.sort((a, b) => {
      // 1. isFavorite (desc)
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;

      // 2. order (asc)
      if (a.order !== undefined && b.order !== undefined) {
        if (a.order !== b.order) return a.order - b.order;
      }
      
      // 3. updatedAt (desc)
      const timeA = (a as any).updatedAt?.toDate?.()?.getTime() || 0;
      const timeB = (b as any).updatedAt?.toDate?.()?.getTime() || 0;
      return timeB - timeA;
    });


    callback(skills);
  });

  return unsubscribe;
};
