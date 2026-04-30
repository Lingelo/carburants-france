import type { InstallContext } from '../types';

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia?.('(display-mode: standalone)').matches) return true;
  return (navigator as unknown as { standalone?: boolean }).standalone === true;
}

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod/.test(navigator.userAgent);
}

export function isInAppWebView(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /(FBAN|FBAV|Instagram|LinkedInApp|Line|FB_IAB|GmailMobile)/i.test(
    navigator.userAgent,
  );
}

export function detectInstallContext(hasCapturedPrompt: boolean): InstallContext {
  if (hasCapturedPrompt) return 'native-prompt';
  if (isInAppWebView()) return 'in-app-webview';
  if (isIOS()) return 'ios-safari';
  return 'generic';
}
