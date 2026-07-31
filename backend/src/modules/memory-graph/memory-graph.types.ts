export type MemoryNodeInput = {
  id: string;
  type: string;
  sourceId: string;
  title: string;
  slug?: string | null;
  excerpt?: string | null;
  href: string;
  image?: string | null;
  occurredAt?: Date | null;
  placeId?: string | null;
  coordinateSeed: number;
  contentHash: string;
  metadata: Record<string, unknown>;
};

export type MemoryRelationInput = {
  id: string;
  sourceId: string;
  targetId: string;
  type: string;
  origin: 'automatic' | 'manual' | 'ai';
  status: 'active' | 'candidate' | 'rejected';
  evidence: Record<string, unknown>;
  weight: number;
};
