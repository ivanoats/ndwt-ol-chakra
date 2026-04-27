import { type ButtonHTMLAttributes, type Ref } from 'react';
import { css, cx } from 'styled-system/css';
import type { SystemStyleObject } from 'styled-system/types';

type Size = 'sm' | 'md' | 'lg';
type Variant = 'solid' | 'ghost' | 'outline';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly size?: Size;
  readonly variant?: Variant;
  readonly colorScheme?: 'green' | 'gray';
  readonly css?: SystemStyleObject;
  readonly ref?: Ref<HTMLButtonElement>;
}

const SIZE_STYLES: Record<Size, SystemStyleObject> = {
  sm: { fontSize: 'sm', height: '8', paddingX: '3' },
  md: { fontSize: 'md', height: '10', paddingX: '4' },
  lg: { fontSize: 'lg', height: '12', paddingX: '6' },
};

const VARIANT_STYLES: Record<Variant, SystemStyleObject> = {
  solid: {
    color: 'white',
    backgroundColor: 'colorPalette.9',
    _hover: { backgroundColor: 'colorPalette.10' },
    _active: { backgroundColor: 'colorPalette.11' },
  },
  ghost: {
    color: 'colorPalette.11',
    backgroundColor: 'transparent',
    _hover: { backgroundColor: 'colorPalette.4' },
    _active: { backgroundColor: 'colorPalette.5' },
  },
  outline: {
    color: 'colorPalette.11',
    backgroundColor: 'transparent',
    borderWidth: '1px',
    borderColor: 'colorPalette.7',
    _hover: { backgroundColor: 'colorPalette.4' },
  },
};

export function Button({
  size = 'md',
  variant = 'solid',
  colorScheme = 'green',
  className,
  css: cssProp,
  ref,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      ref={ref}
      className={cx(
        css({
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '2',
          fontWeight: 'medium',
          borderRadius: 'md',
          cursor: 'pointer',
          colorPalette: colorScheme === 'green' ? 'green' : 'sage',
          transition: 'background-color 0.15s, color 0.15s',
          _focusVisible: {
            outline: '2px solid',
            outlineColor: 'colorPalette.9',
            outlineOffset: '2px',
          },
          _disabled: { opacity: 0.5, cursor: 'not-allowed' },
          ...SIZE_STYLES[size],
          ...VARIANT_STYLES[variant],
          ...cssProp,
        }),
        className
      )}
      {...rest}
    />
  );
}
