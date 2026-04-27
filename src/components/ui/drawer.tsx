'use client';

import { X } from 'lucide-react';
import { type ReactNode } from 'react';
import { css } from 'styled-system/css';
import type { SystemStyleObject } from 'styled-system/types';

import { Dialog, Portal } from '@ark-ui/react';

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
      onOpenChange={(details) => {
        if (!details.open) onClose();
      }}
    >
      <Portal>
        <Dialog.Backdrop className={css(backdrop)} />
        <Dialog.Positioner className={css({ position: 'fixed', inset: 0 })}>
          <Dialog.Content
            data-testid="site-info-panel"
            className={css({
              ...content,
              ...(placement === 'right' ? rightPlacement : leftPlacement),
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
  readonly onClose: () => void;
}

export function DrawerHeader({ children, onClose }: DrawerHeaderProps) {
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
        onClick={onClose}
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

const backdrop: SystemStyleObject = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'black',
  opacity: 0.4,
  zIndex: 'overlay',
};

const content: SystemStyleObject = {
  position: 'fixed',
  top: 0,
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
