import { type AnchorHTMLAttributes } from 'react';
import { css, cx } from 'styled-system/css';
import type { SystemStyleObject } from 'styled-system/types';

interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  readonly external?: boolean;
  readonly css?: SystemStyleObject;
}

export function Link({
  external,
  className,
  css: cssProp,
  ...rest
}: LinkProps) {
  return (
    <a
      className={cx(
        css({
          color: 'colorPalette.11',
          colorPalette: 'green',
          textDecoration: 'underline',
          textDecorationThickness: '1px',
          textUnderlineOffset: '2px',
          transition: 'color 0.15s',
          _hover: { color: 'colorPalette.12' },
          ...cssProp,
        }),
        className
      )}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      {...rest}
    />
  );
}
