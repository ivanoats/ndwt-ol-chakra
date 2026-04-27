import { type ButtonHTMLAttributes, type ReactNode, type Ref } from 'react';
import { css, cx } from 'styled-system/css';
import type { SystemStyleObject } from 'styled-system/types';

type ButtonHTMLAttributesWithoutLabel = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'aria-label'
>;

interface IconButtonProps extends ButtonHTMLAttributesWithoutLabel {
  readonly 'aria-label': string;
  readonly icon: ReactNode;
  readonly size?: 'sm' | 'md' | 'lg';
  readonly variant?: 'solid' | 'ghost' | 'outline';
  readonly colorScheme?: 'green' | 'gray';
  readonly css?: SystemStyleObject;
  readonly ref?: Ref<HTMLButtonElement>;
}

const DIM: Record<NonNullable<IconButtonProps['size']>, string> = {
  sm: '8',
  md: '10',
  lg: '12',
};

export function IconButton({
  icon,
  size = 'md',
  variant = 'ghost',
  colorScheme = 'green',
  className,
  css: cssProp,
  ref,
  ...rest
}: IconButtonProps) {
  const dim = DIM[size];
  const palette = colorScheme === 'green' ? 'green' : 'sage';
  return (
    <button
      type="button"
      ref={ref}
      className={cx(
        css({
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: dim,
          height: dim,
          borderRadius: 'full',
          cursor: 'pointer',
          colorPalette: palette,
          transition: 'background-color 0.15s, color 0.15s',
          color: variant === 'solid' ? 'white' : 'colorPalette.11',
          backgroundColor:
            variant === 'solid' ? 'colorPalette.9' : 'transparent',
          borderWidth: variant === 'outline' ? '1px' : '0',
          borderColor: variant === 'outline' ? 'colorPalette.7' : 'transparent',
          boxShadow: 'sm',
          _hover: {
            backgroundColor:
              variant === 'solid' ? 'colorPalette.10' : 'colorPalette.4',
          },
          _focusVisible: {
            outline: '2px solid',
            outlineColor: 'colorPalette.9',
            outlineOffset: '2px',
          },
          ...cssProp,
        }),
        className
      )}
      {...rest}
    >
      {icon}
    </button>
  );
}
