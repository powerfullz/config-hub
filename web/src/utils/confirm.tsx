/**
 * Promise-based confirmation dialog using HeroUI Modal.
 * 
 * Note: useOverlayState is exported from @heroui/react (not a separate package).
 * It manages the open/close state for overlays like Modal, Popover, etc.
 */
import { createRoot } from 'react-dom/client';
import { Modal, Button, useOverlayState } from '@heroui/react';

type ConfirmOptions = {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
};

export function confirm(options: ConfirmOptions): Promise<boolean> {
  return new Promise(resolve => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    const root = createRoot(el);

    const cleanup = (result: boolean) => {
      root.unmount();
      el.remove();
      resolve(result);
    };

    function Dialog() {
      const state = useOverlayState({ defaultOpen: true });
      return (
        <Modal.Root state={state} onOpenChange={open => !open && cleanup(false)}>
          <Modal.Backdrop isDismissable={false} isKeyboardDismissDisabled />
          <Modal.Container size="sm">
            <Modal.Dialog role="alertdialog">
              <Modal.Header>
                <Modal.Heading>{options.title}</Modal.Heading>
              </Modal.Header>
              <Modal.Body>{options.message}</Modal.Body>
              <Modal.Footer>
                <Button variant="ghost" onPress={() => cleanup(false)}>
                  {options.cancelText || 'Cancel'}
                </Button>
                <Button
                  variant={options.danger ? 'danger' : 'primary'}
                  onPress={() => cleanup(true)}
                >
                  {options.confirmText || 'OK'}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Root>
      );
    }

    root.render(<Dialog />);
  });
}
