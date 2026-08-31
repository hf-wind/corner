export interface ChangelogItem {
  sha: string;
  text: string;
  original: string;
  author: string;
  url: string;
}

export interface ChangelogRelease {
  id: string;
  title: string;
  summary: string;
  publishedAt: string;
  source: "git" | "manual";
  sourceLabel: string;
  url: string;
  items: ChangelogItem[];
  translation: "ai" | "rules" | "manual";
  published?: boolean;
}

export interface ChangelogConfig {
  enabled: boolean;
  title: string;
  subtitle: string;
  repositoryOwner: string;
  repositoryName: string;
  branch: string;
  cacheTtl: number;
  maxGroups: number;
}

export interface ChangelogResponse {
  enabled: boolean;
  title: string;
  subtitle: string;
  repository: {
    owner: string;
    name: string;
    branch: string;
    url: string;
  };
  releases: ChangelogRelease[];
  page: number;
  totalPages: number;
  total: number;
  itemCount: number;
  fetchedAt: string;
  sourceStatus: "connected" | "fallback" | "stale" | "unavailable";
  sourceLabel: string;
}

export interface ChangelogAdminResponse {
  config: ChangelogConfig;
  manualEntries: ChangelogRelease[];
  automaticReleases: ChangelogRelease[];
  fetchedAt: string;
  sourceStatus: ChangelogResponse["sourceStatus"];
  sourceLabel: string;
  tokenConfigured: boolean;
}
