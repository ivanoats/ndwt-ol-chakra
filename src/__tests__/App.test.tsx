import { describe, it, vi } from 'vitest';

import { ChakraProvider } from '@chakra-ui/react';
import { render } from '@testing-library/react';

import App from '../App';

vi.mock('../components/map', () => ({
  default: () => null,
}));

describe('<App />', () => {
  it('renders without errors', () => {
    render(
      <ChakraProvider>
        <App />
      </ChakraProvider>
    );
  });
});
