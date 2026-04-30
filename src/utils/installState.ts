import type { BeforeInstallPromptEvent } from '../types';

const STORAGE_KEY_INSTALLED = 'pwa_installed';
const STORAGE_KEY_LINK_CLICKS = 'pwa_install_link_clicks';
const STORAGE_KEY_ACCEPTED = 'pwa_install_accepted';

function safeReadInstalled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY_INSTALLED) === '1';
  } catch {
    return false;
  }
}

function safeWriteInstalled(): void {
  try {
    localStorage.setItem(STORAGE_KEY_INSTALLED, '1');
  } catch {
    // Safari private mode or storage disabled — degrade gracefully.
  }
}

function safeIncrement(key: string): void {
  try {
    const current = Number(localStorage.getItem(key)) || 0;
    localStorage.setItem(key, String(current + 1));
  } catch {
    // ignore
  }
}

export interface InstallStateSnapshot {
  capturedPrompt: BeforeInstallPromptEvent | null;
  installed: boolean;
}

// Snapshot is rebuilt only inside notify() so getSnapshot() returns a stable
// reference between mutations. useSyncExternalStore requires this to avoid
// infinite re-renders in concurrent React 19.
let snapshot: InstallStateSnapshot = {
  capturedPrompt: null,
  installed: safeReadInstalled(),
};

const listeners = new Set<() => void>();

function notify(next: InstallStateSnapshot): void {
  snapshot = next;
  listeners.forEach((cb) => cb());
}

export function getInstallState(): InstallStateSnapshot {
  return snapshot;
}

export function subscribeInstallState(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function capturePrompt(e: BeforeInstallPromptEvent): void {
  if (snapshot.capturedPrompt === e) return;
  notify({ ...snapshot, capturedPrompt: e });
}

export function consumePrompt(): void {
  if (snapshot.capturedPrompt === null) return;
  notify({ ...snapshot, capturedPrompt: null });
}

export function markInstalled(): void {
  safeWriteInstalled();
  if (snapshot.installed && snapshot.capturedPrompt === null) return;
  notify({ capturedPrompt: null, installed: true });
}

export function syncFromStorage(): void {
  const installed = safeReadInstalled();
  if (snapshot.installed === installed) return;
  notify({ ...snapshot, installed });
}

export function recordLinkClick(): void {
  safeIncrement(STORAGE_KEY_LINK_CLICKS);
}

export function recordAccepted(): void {
  safeIncrement(STORAGE_KEY_ACCEPTED);
}
