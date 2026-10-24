/** Persisted records are additive: old workspace files remain readable after upgrades. */
export interface Message {
  role: string;
  id?: string;
  text?: string;
  output?: Record<string, any>;
  [key: string]: any;
}
export interface Conversation {
  messages: Message[];
  threadId?: string | null;
  title?: string;
  previousThreadIds?: string[];
  researchToolsVersion?: number;
  [key: string]: any;
}
export interface Workspace {
  id: string;
  name: string;
  website?: string;
  favicon?: string;
  createdAt?: string;
  researchId?: string;
  product?: string;
  audience?: string;
  [key: string]: any;
}
export interface StudioState {
  conversations: Record<string, Conversation>;
  reviews: Record<string, { status: string; note?: string; updatedAt?: string }>;
  workspaces?: Record<string, Workspace>;
  fastMode?: boolean;
  model?: string;
  autoReconnect?: boolean;
  connected?: boolean;
  connectionStatus?: string;
  accountType?: string;
  active?: Record<string, any> | null;
  [key: string]: any;
}
