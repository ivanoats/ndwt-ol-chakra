import { describe, expect, it } from 'vitest';

import theme from '../theme';

describe('theme', () => {
  it('configures Chakra to follow the system color mode', () => {
    expect(theme.config.useSystemColorMode).toBe(true);
    expect(theme.config.initialColorMode).toBe('light');
  });
});
