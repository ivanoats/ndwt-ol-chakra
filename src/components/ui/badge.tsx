import { type HTMLAttributes } from 'react';
import { css, cx } from 'styled-system/css';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  readonly colorScheme?: 'green' | 'gray';
}

export function Badge({
  colorScheme = 'green',
  className,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={cx(
        css({
          display: 'inline-flex',
          alignItems: 'center',
          paddingX: '2',
          paddingY: '1',
          fontSize: 'xs',
          fontWeight: 'medium',
          lineHeight: 'none',
          textTransform: 'uppercase',
          borderRadius: 'sm',
          letterSpacing: 'wider',
          color: 'colorPalette.11',
          backgroundColor: 'colorPalette.3',
          colorPalette: colorScheme === 'green' ? 'green' : 'sage',
        }),
        className
      )}
      {...rest}
    />
  );
}
