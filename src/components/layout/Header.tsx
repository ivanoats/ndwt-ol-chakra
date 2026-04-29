'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { css } from 'styled-system/css';

const NAV_ITEMS = [
  { href: '/', label: 'Map' },
  { href: '/sites/', label: 'Sites' },
  { href: '/about/', label: 'About' },
  { href: '/trip-planning/', label: 'Trip Planning' },
] as const;

export default function Header() {
  const pathname = usePathname();
  return (
    <header
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
        <Image src="/logo.svg" alt="" width={28} height={28} priority />
        <span
          className={css({
            fontSize: { base: 'md', md: 'lg' },
            whiteSpace: 'nowrap',
          })}
        >
          NW Discovery Water Trail
        </span>
      </Link>
      <nav
        aria-label="Primary"
        className={css({
          display: 'flex',
          alignItems: 'center',
          gap: { base: '3', md: '5' },
        })}
      >
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/' || pathname === ''
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={css({
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
              })}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
