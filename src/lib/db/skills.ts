import { db } from "../firebase";
import { collection, addDoc, doc, updateDoc, deleteDoc, onSnapshot, query, where, serverTimestamp } from "firebase/firestore";

export interface SkillEntry {
  id: string;
  title: string;
  template: string;
  uid: string | null;
  isFavorite?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

const SKILLS_COLLECTION = "builder_hub_skills";

export const createSkill = async (title: string, template: string, uid?: string) => {
  const newSkill = {
    title,
    template,
    uid: uid || null,
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
      const timeA = (a as any).updatedAt?.toDate?.()?.getTime() || 0;
      const timeB = (b as any).updatedAt?.toDate?.()?.getTime() || 0;
      return timeB - timeA;
    });

    callback(skills);
  });

  return unsubscribe;
};
