import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { act, render, screen } from '@testing-library/react';

import OfflineIndicator from '../OfflineIndicator';

// Save the original navigator.onLine descriptor so each test starts
// from a known "online" baseline regardless of the host machine's
// real connectivity.
const originalOnLineDescriptor = Object.getOwnPropertyDescriptor(
  Object.getPrototypeOf(navigator),
  'onLine'
);

function setOnLine(value: boolean): void {
  Object.defineProperty(navigator, 'onLine', {
    value,
    configurable: true,
    writable: true,
  });
}

function fireConnectivityEvent(name: 'online' | 'offline'): void {
  act(() => {
    globalThis.dispatchEvent(new Event(name));
  });
}

beforeEach(() => {
  setOnLine(true);
});

afterEach(() => {
  // Restore the prototype descriptor so we don't leak the per-test
  // mock into other suites that read navigator.onLine.
  if (originalOnLineDescriptor !== undefined) {
    Object.defineProperty(
      Object.getPrototypeOf(navigator),
      'onLine',
      originalOnLineDescriptor
    );
  }
  // Also strip any own-property override we set.
  delete (navigator as { onLine?: boolean }).onLine;
});

describe('<OfflineIndicator />', () => {
  it('renders nothing while the browser is online', () => {
    setOnLine(true);
    render(<OfflineIndicator />);
    expect(screen.queryByTestId('offline-indicator')).not.toBeInTheDocument();
  });

  it('renders the offline pill when the browser starts offline', () => {
    setOnLine(false);
    render(<OfflineIndicator />);
    const pill = screen.getByTestId('offline-indicator');
    expect(pill).toBeInTheDocument();
    expect(pill).toHaveTextContent(/Offline/);
    expect(pill).toHaveTextContent(/cached tiles/);
  });

  it('appears when the browser fires the offline event after mount', () => {
    setOnLine(true);
    render(<OfflineIndicator />);
    expect(screen.queryByTestId('offline-indicator')).not.toBeInTheDocument();

    setOnLine(false);
    fireConnectivityEvent('offline');
    expect(screen.getByTestId('offline-indicator')).toBeInTheDocument();
  });

  it('disappears when the browser fires the online event after going back online', () => {
    setOnLine(false);
    render(<OfflineIndicator />);
    expect(screen.getByTestId('offline-indicator')).toBeInTheDocument();

    setOnLine(true);
    fireConnectivityEvent('online');
    expect(screen.queryByTestId('offline-indicator')).not.toBeInTheDocument();
  });

  it('removes its event listeners on unmount', () => {
    // Spy on add / removeEventListener so we can assert the
    // component's cleanup actually unregisters the same handler
    // references it registered. Dispatching events post-unmount
    // doesn't throw in React 19, so a "did the listener still run"
    // assertion would silently pass even if cleanup were broken.
    const addSpy = vi.spyOn(globalThis, 'addEventListener');
    const removeSpy = vi.spyOn(globalThis, 'removeEventListener');

    const { unmount } = render(<OfflineIndicator />);

    const onlineCall = addSpy.mock.calls.find(([type]) => type === 'online');
    const offlineCall = addSpy.mock.calls.find(([type]) => type === 'offline');
    expect(onlineCall).toBeDefined();
    expect(offlineCall).toBeDefined();
    const onlineHandler = onlineCall?.[1];
    const offlineHandler = offlineCall?.[1];

    unmount();

    expect(removeSpy).toHaveBeenCalledWith('online', onlineHandler);
    expect(removeSpy).toHaveBeenCalledWith('offline', offlineHandler);
  });
});
