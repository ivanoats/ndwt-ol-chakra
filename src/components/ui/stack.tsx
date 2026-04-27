import { type HTMLAttributes } from 'react';
import { css, cx } from 'styled-system/css';
import type { SystemStyleObject } from 'styled-system/types';

interface StackProps extends HTMLAttributes<HTMLDivElement> {
  readonly direction?: 'row' | 'column';
  readonly gap?: string | number;
  readonly align?: SystemStyleObject['alignItems'];
  readonly justify?: SystemStyleObject['justifyContent'];
  readonly wrap?: SystemStyleObject['flexWrap'];
  readonly css?: SystemStyleObject;
}

export function Stack({
  direction = 'column',
  gap = '4',
  align,
  justify,
  wrap,
  className,
  css: cssProp,
  ...rest
}: StackProps) {
  return (
    <div
      className={cx(
        css({
          display: 'flex',
          flexDirection: direction,
          gap,
          alignItems: align,
          justifyContent: justify,
          flexWrap: wrap,
          ...cssProp,
        }),
        className
      )}
      {...rest}
    />
  );
}

export const HStack = (props: Omit<StackProps, 'direction'>) => (
  <Stack {...props} direction="row" />
);
export const VStack = (props: Omit<StackProps, 'direction'>) => (
  <Stack {...props} direction="column" />
);
