interface Navigator {
  standalone?: boolean;
  userAgentData?: { platform: string };
}
interface Window {
  makepaceDesktop?: {
    platform: string;
    integrations(action: string, service?: string, token?: string): Promise<Record<string, any>>;
    publishing(action: string, data?: Record<string, unknown>): Promise<any>;
    action(action: string, workspaceId?: string): Promise<void>;
    onWindowState(callback: (state: { focused: boolean; maximized: boolean }) => void): () => void;
    openSignIn(url: string): Promise<void>;
  };
  studioRestoreState?: Record<string, any>;
  restoreStudioFrame?: () => void;
  releaseStudioFrame?: () => void;
  captureStudioState?: () => Record<string, unknown>;
}
interface DocumentEventMap {
  'makepace-view': CustomEvent<{ workspace: string; title: string; view: string }>;
  'makepace-model-settings': CustomEvent<{ model: string; serviceTier: string }>;
  'makepace-workspace-created': CustomEvent<import('./state.js').Workspace>;
  'makepace-compose': CustomEvent<string>;
  'makepace-connection': CustomEvent<{ connected: boolean; status: string }>;
  'makepace-conversation-output': CustomEvent<{
    key: string;
    messages: import('./state.js').Message[];
  }>;
  'makepace-open-output': CustomEvent<{ id: string }>;
  'makepace-open-research': CustomEvent<{ finding: Record<string, any> }>;
}
declare namespace NodeJS {
  interface Process {
    parentPort?: {
      on(event: 'message', handler: (event: { data: any }) => void): void;
      postMessage(message: unknown): void;
    };
  }
}
