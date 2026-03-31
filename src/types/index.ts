export type AppStatus = 'idea' | 'testing' | 'active' | 'deployed' | 'archived';
export type GithubStatus = 'unknown' | 'connected' | 'none';
export type ProgressLevel = 0 | 20 | 50 | 80 | 100;

export interface AppEntry {
  id: string;
  name: string;
  description: string;
  status: AppStatus;
  progress: ProgressLevel;
  url?: string;
  githubUrl?: string;
  githubStatus: GithubStatus;
  prd?: string;
  prompt?: string;
  memo?: string;
  isPinned?: boolean;
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
  uid?: string;
}
