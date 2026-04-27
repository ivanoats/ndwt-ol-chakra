import { type HTMLAttributes, type Ref } from 'react';
import { css, cx } from 'styled-system/css';
import type { SystemStyleObject } from 'styled-system/types';

export interface BoxProps extends HTMLAttributes<HTMLDivElement> {
  readonly css?: SystemStyleObject;
  readonly ref?: Ref<HTMLDivElement>;
}

export function Box({ className, css: cssProp, ref, ...rest }: BoxProps) {
  return (
    <div
      ref={ref}
      className={cx(cssProp ? css(cssProp) : undefined, className)}
      {...rest}
    />
  );
}
