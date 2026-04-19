import { useState } from 'react';
import { useInstallPrompt } from '../hooks/useInstallPrompt';

export function InstallPrompt() {
  const { canInstall, isIOS, isStandalone, promptInstall } = useInstallPrompt();
  const [showIOSHelp, setShowIOSHelp] = useState(false);

  if (isStandalone) return null;
  if (!canInstall && !isIOS) return null;

  const handleClick = async () => {
    if (isIOS) {
      setShowIOSHelp(true);
      return;
    }
    await promptInstall();
  };

  return (
    <>
      <button
        onClick={handleClick}
        className="mt-3 flex items-center gap-2 rounded-xl border border-blue-200 bg-white/70 px-4 py-2 text-xs font-semibold text-blue-600 shadow-sm transition-colors hover:bg-blue-50"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Installer l&rsquo;app sur mon téléphone
      </button>

      {showIOSHelp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowIOSHelp(false)}
        >
          <div
            className="glass relative max-w-sm rounded-2xl px-6 py-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowIOSHelp(false)}
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
              aria-label="Fermer"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <h3 className="mb-4 text-base font-bold text-gray-800">
              Installer sur votre iPhone
            </h3>
            <ol className="space-y-3 text-sm text-gray-600">
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white">
                  1
                </span>
                <span className="pt-0.5">
                  Touchez l&rsquo;icône{' '}
                  <svg className="inline-block h-4 w-4 align-text-bottom" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                    <polyline points="16 6 12 2 8 6" />
                    <line x1="12" y1="2" x2="12" y2="15" />
                  </svg>{' '}
                  <span className="font-medium">Partager</span> en bas de Safari
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white">
                  2
                </span>
                <span className="pt-0.5">
                  Faites défiler et choisissez{' '}
                  <span className="font-medium">Sur l&rsquo;écran d&rsquo;accueil</span>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white">
                  3
                </span>
                <span className="pt-0.5">
                  Validez avec <span className="font-medium">Ajouter</span>
                </span>
              </li>
            </ol>
          </div>
        </div>
      )}
    </>
  );
}
