import { type HTMLAttributes } from 'react';
import { css, cx } from 'styled-system/css';
import type { SystemStyleObject } from 'styled-system/types';

type HeadingTag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  readonly as?: HeadingTag;
  readonly size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  readonly css?: SystemStyleObject;
}

const SIZE_STYLES: Record<
  NonNullable<HeadingProps['size']>,
  SystemStyleObject
> = {
  sm: { fontSize: 'sm', fontWeight: 'semibold', lineHeight: 'short' },
  md: { fontSize: 'md', fontWeight: 'semibold', lineHeight: 'short' },
  lg: { fontSize: 'lg', fontWeight: 'bold', lineHeight: 'short' },
  xl: { fontSize: 'xl', fontWeight: 'bold', lineHeight: 'short' },
  '2xl': { fontSize: '2xl', fontWeight: 'bold', lineHeight: 'short' },
};

export function Heading({
  as: As = 'h2',
  size = 'md',
  className,
  css: cssProp,
  ...rest
}: HeadingProps) {
  return (
    <As
      className={cx(
        css({ ...SIZE_STYLES[size], margin: 0, ...cssProp }),
        className
      )}
      {...rest}
    />
  );
}
