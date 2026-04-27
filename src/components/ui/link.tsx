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
  // Compute final target/rel from `external` AFTER spreading the
  // caller's rest props. Callers that pass `target` explicitly can
  // still use it, but `external` always wins on the safety side: if
  // we end up with target="_blank", we force `rel="noopener noreferrer"`.
  const target = external ? '_blank' : rest.target;
  const baseRel = rest.rel;
  const rel =
    target === '_blank'
      ? [baseRel, 'noopener', 'noreferrer']
          .filter((part): part is string => Boolean(part))
          .join(' ')
      : baseRel;

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
      {...rest}
      target={target}
      rel={rel}
    />
  );
}
