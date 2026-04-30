'use client';

import { Menu, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { css } from 'styled-system/css';

// Exported so tests can iterate over the canonical list rather
// than hand-maintaining a parallel one. Keeping it `as const`
// preserves the literal-tuple types for the labels.
export const NAV_ITEMS = [
  { href: '/', label: 'Map' },
  { href: '/sites/', label: 'Sites' },
  { href: '/water-safety/', label: 'Safety' },
  { href: '/river-navigation/', label: 'Navigation' },
  { href: '/leave-no-trace/', label: 'Leave No Trace' },
  { href: '/natural-world/', label: 'Natural World' },
  { href: '/past-and-present/', label: 'Past & Present' },
  { href: '/trip-planning/', label: 'Trip Planning' },
  { href: '/get-involved/', label: 'Get Involved' },
  { href: '/about/', label: 'About' },
] as const;

const isActive = (href: string, pathname: string): boolean =>
  href === '/'
    ? pathname === '/' || pathname === ''
    : pathname.startsWith(href);

const linkStyle = css({
  fontSize: { base: 'sm', md: 'md' },
  color: 'fg.default',
  textDecoration: 'none',
  paddingY: '1',
  borderBottomWidth: '2px',
  borderColor: 'transparent',
  colorPalette: 'green',
  _hover: { color: 'colorPalette.11' },
  '&[aria-current="page"]': {
    color: 'colorPalette.11',
    borderColor: 'colorPalette.9',
  },
});

// Switch to the inline desktop nav at `xl` (1280px) rather than
// `md` (768px). With 9 nav items the bar gets crowded below
// ~1095px; bumping the cutoff to xl keeps the hamburger in play
// for tablet viewports too.
const desktopNavStyle = css({
  display: { base: 'none', xl: 'flex' },
  alignItems: 'center',
  gap: '4',
});

const mobileToggleStyle = css({
  display: { base: 'inline-flex', xl: 'none' },
  alignItems: 'center',
  justifyContent: 'center',
  width: '10',
  height: '10',
  borderRadius: 'md',
  border: 'none',
  backgroundColor: 'transparent',
  color: 'fg.default',
  cursor: 'pointer',
  _hover: { backgroundColor: 'gray.4' },
});

const mobilePanelStyle = css({
  display: { base: 'flex', xl: 'none' },
  position: 'absolute',
  top: 'var(--header-height, 56px)',
  right: 0,
  left: 0,
  flexDirection: 'column',
  paddingX: '4',
  paddingY: '4',
  gap: '3',
  backgroundColor: 'bg.default',
  borderBottomWidth: '1px',
  borderColor: 'gray.6',
  boxShadow: 'lg',
});

export default function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  // Close on route change.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Click-outside + ESC to dismiss the mobile panel. Explicit
  // `return undefined` on the early-bail satisfies DeepSource's
  // consistent-return rule (JS-0045) since the success path
  // returns a cleanup function.
  useEffect(() => {
    if (!mobileOpen) return undefined;
    const handlePointer = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) {
        setMobileOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false);
    };
    document.addEventListener('pointerdown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('pointerdown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [mobileOpen]);

  return (
    <header
      ref={headerRef}
      className={css({
        position: 'sticky',
        top: 0,
        zIndex: 'sticky',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingX: { base: '4', md: '6' },
        paddingY: '3',
        backgroundColor: 'bg.default',
        borderBottomWidth: '1px',
        borderColor: 'gray.6',
      })}
    >
      <Link
        href="/"
        className={css({
          display: 'inline-flex',
          alignItems: 'center',
          gap: '2',
          color: 'fg.default',
          textDecoration: 'none',
          fontWeight: 'semibold',
          _hover: { color: 'colorPalette.11', colorPalette: 'green' },
        })}
      >
        {/* Logo extracted from the legacy ndwt.org header image
            (top-left of /ndwt/images/header.jpg). The photo bleed
            in the corners is part of the original brand asset.
            Decorative — site title text follows for screen
            readers. */}
        <Image src="/logo.png" alt="" width={36} height={46} priority />
        <span
          className={css({
            fontSize: { base: 'md', md: 'lg' },
            whiteSpace: 'nowrap',
          })}
        >
          NW Discovery Water Trail
        </span>
      </Link>

      <nav aria-label="Primary" className={desktopNavStyle}>
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive(item.href, pathname) ? 'page' : undefined}
            className={linkStyle}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <button
        type="button"
        aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={mobileOpen}
        aria-controls="mobile-nav"
        className={mobileToggleStyle}
        onClick={() => setMobileOpen((open) => !open)}
      >
        {mobileOpen ? (
          <X size={22} aria-hidden />
        ) : (
          <Menu size={22} aria-hidden />
        )}
      </button>

      {mobileOpen ? (
        <nav
          id="mobile-nav"
          aria-label="Primary (mobile)"
          className={mobilePanelStyle}
        >
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href, pathname) ? 'page' : undefined}
              className={css({
                fontSize: 'md',
                color: 'fg.default',
                textDecoration: 'none',
                paddingY: '2',
                colorPalette: 'green',
                _hover: { color: 'colorPalette.11' },
                '&[aria-current="page"]': { color: 'colorPalette.11' },
              })}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </header>
  );
}
