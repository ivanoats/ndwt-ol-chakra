import { type HTMLAttributes, type Ref } from 'react';
import { css, cx } from 'styled-system/css';
import type { SystemStyleObject } from 'styled-system/types';

interface TextProps extends HTMLAttributes<HTMLSpanElement> {
  readonly as?: 'p' | 'span' | 'div';
  readonly css?: SystemStyleObject;
  readonly ref?: Ref<HTMLElement>;
}

export function Text({
  as: As = 'p',
  className,
  css: cssProp,
  ref,
  ...rest
}: TextProps) {
  return (
    <As
      ref={ref as never}
      className={cx(cssProp ? css(cssProp) : undefined, className)}
      {...(rest as object)}
    />
  );
}
