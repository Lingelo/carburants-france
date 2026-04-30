import { useCallback, useState, useSyncExternalStore } from 'react';
import {
  consumePrompt,
  getInstallState,
  markInstalled,
  recordAccepted,
  recordLinkClick,
  subscribeInstallState,
} from '../utils/installState';
import { detectInstallContext, isStandalone } from '../utils/installContext';

export function useInstallPrompt() {
  const state = useSyncExternalStore(subscribeInstallState, getInstallState);
  const [modalOpen, setModalOpen] = useState(false);

  const modalContext = detectInstallContext(!!state.capturedPrompt);
  const shouldShow = !isStandalone() && !state.installed && !modalOpen;

  const closeModal = useCallback(() => setModalOpen(false), []);

  const handleInviteClick = useCallback((): void => {
    recordLinkClick();
    const prompt = state.capturedPrompt;
    if (prompt) {
      // Calling prompt() consumes the event; the saved reference cannot be reused.
      prompt
        .prompt()
        .then(() => prompt.userChoice)
        .then(({ outcome }) => {
          if (outcome === 'accepted') {
            recordAccepted();
            markInstalled();
          } else {
            consumePrompt();
            setModalOpen(true);
          }
        })
        .catch(() => {
          consumePrompt();
          setModalOpen(true);
        });
      return;
    }
    setModalOpen(true);
  }, [state.capturedPrompt]);

  return {
    shouldShow,
    modalOpen,
    modalContext,
    handleInviteClick,
    closeModal,
  };
}
