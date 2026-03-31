/**
 * Vercel API Utility
 * Centralized logic for project discovery and metadata harvesting.
 */

export interface VercelProject {
  id: string;
  name: string;
  accountId: string;
  targets?: {
    production?: {
      alias?: string[];
    };
  };
  latestDeployments?: Array<{
    url?: string;
    meta?: Record<string, string>;
  }>;
  link?: any;
  gitSource?: any;
  repository?: any;
}

/**
 * Fetches all projects from personal and all associated teams.
 */
export async function fetchAllVercelProjects(token: string): Promise<VercelProject[]> {
  const allProjects: VercelProject[] = [];

  // 1. Personal Projects
  const personalRes = await fetch('https://api.vercel.com/v9/projects', {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (personalRes.ok) {
    const data = await personalRes.json();
    allProjects.push(...(data.projects || []));
  }

  // 2. Team Projects
  const teamsRes = await fetch('https://api.vercel.com/v2/teams', {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (teamsRes.ok) {
    const teamsData = await teamsRes.json();
    const teams = teamsData.teams || [];
    for (const team of teams) {
      const teamProjRes = await fetch(`https://api.vercel.com/v9/projects?teamId=${team.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (teamProjRes.ok) {
        const teamProjData = await teamProjRes.json();
        const teamProjects = (teamProjData.projects || []).map((p: any) => ({
          ...p,
          teamId: team.id // 중요: 팀 ID를 개별 프로젝트 객체에 보관하여 나중에 상세 조회 시 사용
        }));
        allProjects.push(...teamProjects);
      }
    }
  }

  return allProjects;
}

/**
 * Finds a matching project by domain (fuzzy matching).
 */
export function findProjectByDomain(projects: VercelProject[], appHostname: string): VercelProject | undefined {
  const lowHostname = appHostname.toLowerCase();
  
  return projects.find((p) => {
    const pName = p.name.toLowerCase();
    const subdomain = lowHostname.split('.')[0];
    
    // 1) Direct name match or subdomain match
    if (pName === subdomain || pName === lowHostname) return true;
    
    // 2) Check targets/production alias
    const inTargets = p.targets?.production?.alias?.some((a: string) => {
       const lowA = a.toLowerCase();
       return lowA === lowHostname || lowHostname.includes(lowA) || lowA.includes(lowHostname);
    });
    if (inTargets) return true;
    
    // 3) Check latest deployments
    const inDeployments = p.latestDeployments?.some((d: any) => {
       const dUrl = d.url?.toLowerCase();
       return dUrl === lowHostname || (dUrl && (lowHostname.includes(dUrl) || dUrl.includes(lowHostname)));
    });
    if (inDeployments) return true;

    // 4) Fuzzy name match as fallback
    if (pName.includes(subdomain) || subdomain.includes(pName)) return true;
    
    return false;
  });
}

/**
 * Fetches full project detail (including team awareness).
 */
export async function fetchVercelProjectDetail(token: string, project: VercelProject): Promise<VercelProject> {
  // Use project.link for team tracking if available
  // Use project.accountId or teamId from any source
  const teamId = project.accountId?.startsWith('team_') ? project.accountId : (project as any).teamId;
  // Request latest deployments to get meta info if the main link is missing
  const detailUrl = teamId
    ? `https://api.vercel.com/v9/projects/${project.id}?teamId=${teamId}&latestDeployments=1`
    : `https://api.vercel.com/v9/projects/${project.id}?latestDeployments=1`;
    
  const detailRes = await fetch(detailUrl, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (detailRes.ok) {
    const data = await detailRes.json();
    return data.project || data; // Always return the unwrapped project object
  }
  return project;
}

/**
 * Extracts GitHub metadata from a project object.
 */
export function extractGithubMeta(project: any): { githubUrl: string | null } {
  if (!project) return { githubUrl: null };

  // 1. 데이터 래핑 대응
  const data = project.project || project;
  
  // 2. 재귀적 깃허브 URL 검색 (가장 강력한 수단)
  const searchGithubUrlRecursively = (obj: any, depth = 0): string | null => {
    if (!obj || depth > 5) return null;
    
    if (typeof obj === 'string') {
      if (obj.includes('github.com')) {
        const match = obj.match(/github\.com\/([^\/]+)\/([^\/\.#\?]+)/);
        if (match) return `https://github.com/${match[1]}/${match[2].replace(/\.git$/, '')}`;
      }
      // Check for user/repo pattern in metadata keys like githubCommitRepo
      if (obj.includes('/') && obj.split('/').length === 2 && !obj.includes(' ')) {
        const [u, r] = obj.split('/');
        if (u.length > 0 && r.length > 0 && /^[a-zA-Z0-9-]+$/.test(u)) {
          // This is a guess, but if we are inside a meta object it might be a repo
          return `https://github.com/${u}/${r.replace(/\.git$/, '')}`;
        }
      }
      return null;
    }
    
    if (typeof obj !== 'object') return null;

    // 특정 필드 우선 체크
    const priorityKeys = ['githubUrl', 'url', 'gitUrl', 'repoUrl', 'link', 'gitSource', 'repository'];
    for (const key of priorityKeys) {
      if (obj[key]) {
        const found = searchGithubUrlRecursively(obj[key], depth + 1);
        if (found) return found;
      }
    }

    // 전체 필드 스캔 (배열 포함)
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        if (priorityKeys.includes(key)) continue; // 이미 위에서 체크함
        const found = searchGithubUrlRecursively(obj[key], depth + 1);
        if (found) return found;
      }
    }

    // 3. 필드 조합 시도 (repo + org/owner)
    if (obj.repo && (obj.org || obj.owner)) {
      return `https://github.com/${obj.org || obj.owner}/${obj.repo}`;
    }
    
    return null;
  };

  const foundUrl = searchGithubUrlRecursively(data);
  if (foundUrl) return { githubUrl: foundUrl };

  // 3. 기존 로직 (명시적 필드 추출) - 위 재귀 검색이 실패할 경우의 대비책
  let repoInfo = data.link || data.gitSource || data.repository;
  const latestMeta = data.latestDeployments?.[0]?.meta || {};
  
  let org = repoInfo?.org || repoInfo?.owner || repoInfo?.namespace || repoInfo?.user || 
            latestMeta.githubCommitOrg || latestMeta.githubCommitRepoOrg || 
            latestMeta.org || latestMeta.owner || latestMeta.githubOrg;
            
  let repo = repoInfo?.repo || repoInfo?.name || repoInfo?.slug || repoInfo?.repositoryName || 
             latestMeta.githubCommitRepo || latestMeta.githubCommitRepoName || 
             latestMeta.repo || latestMeta.name || latestMeta.githubRepo;

  if (org && repo) {
    return { githubUrl: `https://github.com/${String(org).trim()}/${String(repo).trim().replace(/\.git$/, '')}` };
  }
  
  // 4. 정말 최후의 수단: 문자열 전체에서 user/repo 패턴 찾기 (정규식)
  const str = JSON.stringify(data);
  const repoMatch = str.match(/"repository":\s*"([^"]+)"/i) || str.match(/"repo":\s*"([^"]+)"/i);
  if (repoMatch && repoMatch[1].includes('/')) {
    return { githubUrl: `https://github.com/${repoMatch[1]}` };
  }
  
  return { githubUrl: null };
}

/**
 * Smart detection from URL string (supports GitHub Pages).
 */
export function detectGithubFromUrl(url: string | null | undefined): { githubUrl: string | null } {
  if (!url) return { githubUrl: null };
  try {
    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith('http')) cleanUrl = 'https://' + cleanUrl;
    const urlObj = new URL(cleanUrl);
    const hostname = urlObj.hostname.toLowerCase();
    const pathname = urlObj.pathname;

    // 1. GitHub Pages: {user}.github.io/{repo}/
    if (hostname.endsWith('.github.io')) {
      const user = hostname.split('.')[0];
      // Path usually starts with /repo-name/
      const parts = pathname.split('/').filter(Boolean);
      const repo = parts[0];
      
      if (user && repo) {
        return { githubUrl: `https://github.com/${user}/${repo}` };
      }
      // If no path, it might be the user's root site repo: user.github.io
      if (user && !repo) {
        return { githubUrl: `https://github.com/${user}/${user}.github.io` };
      }
    }

    // 2. Direct GitHub URL?
    if (hostname === 'github.com') {
      const parts = pathname.split('/').filter(Boolean);
      if (parts.length >= 2) {
        return { githubUrl: `https://github.com/${parts[0]}/${parts[1]}` };
      }
    }
  } catch (e) {
    return { githubUrl: null };
  }
  return { githubUrl: null };
}
