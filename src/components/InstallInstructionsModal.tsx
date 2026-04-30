import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { InstallContext } from '../types';

interface Props {
  open: boolean;
  onClose: () => void;
  context: InstallContext;
}

function ShareIcon() {
  // iOS-style share glyph (rectangle with up arrow). Inline SVG so it ages
  // better than a screenshot of the iOS share sheet.
  return (
    <svg
      className="inline h-4 w-4 align-text-bottom"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3v12" />
      <path d="M8 7l4-4 4 4" />
      <path d="M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
    </svg>
  );
}

function ModalBody({ context }: { context: InstallContext }) {
  switch (context) {
    case 'ios-safari':
      return (
        <p>
          Appuyez sur le bouton <strong>Partager</strong> <ShareIcon /> dans la
          barre Safari, puis choisissez <strong>« Sur l'écran d'accueil »</strong>.
        </p>
      );
    case 'in-app-webview':
      return (
        <p>
          Cette page est ouverte dans une application. Pour l'installer, ouvrez-la
          d'abord dans <strong>Safari</strong> (iOS) ou <strong>Chrome</strong>{' '}
          (Android).
        </p>
      );
    case 'generic':
    case 'native-prompt':
    default:
      // 'native-prompt' is structurally unreachable here: handleInviteClick calls
      // prompt() instead of opening the modal when a prompt is captured. We list
      // it for exhaustiveness so a future enum addition fails type-checking
      // rather than silently falling through.
      return (
        <p>
          Utilisez le menu de votre navigateur (icône d'installation dans la
          barre d'adresse, ou menu ⋮ → <strong>Installer</strong>) pour ajouter
          cette application à votre appareil. Sur les navigateurs sans support
          direct, vous pouvez aussi l'ajouter à vos favoris pour un accès rapide.
        </p>
      );
  }
}

export function InstallInstructionsModal({ open, onClose, context }: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-sm" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Installer l'application</DialogTitle>
        </DialogHeader>

        <div className="text-sm leading-relaxed text-gray-600">
          <ModalBody context={context} />
        </div>

        <div className="mt-2 flex justify-end">
          <DialogClose className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100">
            Fermer
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
