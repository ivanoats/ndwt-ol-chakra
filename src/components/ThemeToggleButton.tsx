'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

import { IconButton } from './ui/icon-button';

const ICON_SIZE = 20;

interface ThemeToggleButtonProps {
  readonly className?: string;
  readonly position?: 'fixed' | 'absolute' | 'static';
  readonly bottom?: string;
  readonly right?: string;
}

export default function ThemeToggleButton({
  className,
  position = 'fixed',
  bottom = '2',
  right = '2',
}: ThemeToggleButtonProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Avoid SSR/CSR mismatch on initial render — the chosen theme is
  // only known on the client after `next-themes` reads localStorage
  // / system preference.
  const isDark = mounted && resolvedTheme === 'dark';
  const next = isDark ? 'light' : 'dark';

  return (
    <IconButton
      aria-label={`Activate ${next} mode`}
      onClick={() => setTheme(next)}
      icon={
        mounted && isDark ? <Sun size={ICON_SIZE} /> : <Moon size={ICON_SIZE} />
      }
      css={{
        position,
        bottom,
        right,
      }}
      className={className}
    />
  );
}
