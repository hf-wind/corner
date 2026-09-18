export interface ChangelogItem {
  sha: string;
  text: string;
  original: string;
  author: string;
  url?: string;
}

export interface ChangelogRelease {
  id: string;
  title: string;
  summary: string;
  publishedAt: string;
  source: "git" | "manual";
  sourceLabel: string;
  url?: string;
  items: ChangelogItem[];
  translation: "baidu" | "original" | "rules" | "manual";
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
  translationPending: boolean;
}

/** 时间聚合视图响应（/changelog/timeline） */
export interface ChangelogTimelineResponse {
  enabled: boolean;
  title: string;
  subtitle: string;
  repository: ChangelogResponse["repository"];
  groups: ChangelogRelease[];
  months: string[];
  page: number;
  totalPages: number;
  total: number;
  itemCount: number;
  fetchedAt: string;
  sourceStatus: ChangelogResponse["sourceStatus"];
  sourceLabel: string;
  translationPending: boolean;
}

export interface ChangelogAdminResponse {
  config: ChangelogConfig;
  manualEntries: ChangelogRelease[];
  automaticReleases: ChangelogRelease[];
  fetchedAt: string;
  sourceStatus: ChangelogResponse["sourceStatus"];
  sourceLabel: string;
  tokenConfigured: boolean;
  translationConfigured: boolean;
  translationStats: {
    total: number;
    translated: number;
    original: number;
    pending: number;
    failed: number;
  };
  translations: Array<{
    sha: string;
    original: string;
    translated: string;
    language: "zh" | "en" | "mixed";
    status: "translated" | "original" | "pending" | "failed";
    service: string;
    author: string;
    committedAt: string;
    updatedAt: string;
    error: string;
    url: string;
  }>;
  translationsPage: number;
  translationsTotalPages: number;
  translationsTotal: number;
}
