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
          color: colorScheme === 'green' ? 'colorPalette.11' : 'gray.11',
          backgroundColor:
            colorScheme === 'green' ? 'colorPalette.3' : 'gray.3',
          colorPalette: colorScheme === 'green' ? 'green' : 'sage',
        }),
        className
      )}
      {...rest}
    />
  );
}
