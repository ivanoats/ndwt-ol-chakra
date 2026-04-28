'use client';

import { X } from 'lucide-react';
import { type ReactNode } from 'react';
import { css } from 'styled-system/css';
import type { SystemStyleObject } from 'styled-system/types';

import { Dialog, Portal } from '@ark-ui/react';

const content: SystemStyleObject = {
  position: 'fixed',
  // Slot the drawer below the sticky <Header> rather than under it.
  // The CSS variable is set in app/globals.css and tracks the
  // breakpoint-dependent header height.
  top: 'var(--header-height, 56px)',
  bottom: 0,
  display: 'flex',
  flexDirection: 'column',
  width: { base: '100%', md: 'md' },
  backgroundColor: 'bg.default',
  boxShadow: 'lg',
  zIndex: 'modal',
};

const rightPlacement: SystemStyleObject = { right: 0 };
const leftPlacement: SystemStyleObject = { left: 0 };

interface DrawerProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly children: ReactNode;
  readonly placement?: 'right' | 'left';
}

export function Drawer({
  open,
  onClose,
  children,
  placement = 'right',
}: DrawerProps) {
  return (
    <Dialog.Root
      open={open}
      // Non-modal: no backdrop, no focus trap, no outside-click
      // dismiss. Lets the user keep panning the map and clicking
      // other markers while the info panel is open. ESC and the
      // close button still dismiss it.
      modal={false}
      onOpenChange={(details) => {
        if (!details.open) onClose();
      }}
    >
      <Portal>
        <Dialog.Positioner
          className={css({
            position: 'fixed',
            top: 'var(--header-height, 56px)',
            bottom: 0,
            // The positioner shouldn't cover the map either; it
            // wraps the panel only.
            ...(placement === 'right' ? rightPlacement : leftPlacement),
            pointerEvents: 'none',
          })}
        >
          <Dialog.Content
            data-testid="site-info-panel"
            className={css({
              ...content,
              ...(placement === 'right' ? rightPlacement : leftPlacement),
              pointerEvents: 'auto',
            })}
          >
            {children}
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

interface DrawerHeaderProps {
  readonly children: ReactNode;
}

export function DrawerHeader({ children }: DrawerHeaderProps) {
  return (
    <div
      className={css({
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '4',
        paddingX: '6',
        paddingY: '4',
        borderBottomWidth: '1px',
        borderColor: 'gray.6',
      })}
    >
      <div className={css({ flex: 1 })}>{children}</div>
      <Dialog.CloseTrigger
        aria-label="Close"
        className={css({
          appearance: 'none',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: '1',
          color: 'gray.11',
          borderRadius: 'sm',
          _hover: { backgroundColor: 'gray.4' },
        })}
      >
        <X size={20} />
      </Dialog.CloseTrigger>
    </div>
  );
}

export function DrawerBody({ children }: { readonly children: ReactNode }) {
  return (
    <div
      className={css({
        flex: 1,
        overflowY: 'auto',
        paddingX: '6',
        paddingY: '4',
      })}
    >
      {children}
    </div>
  );
}
