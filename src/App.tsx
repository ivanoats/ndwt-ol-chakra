import { Box, Flex, Text } from '@chakra-ui/react';

import ThemeToggleButton from './components/ThemeToggleButton';

const textFontSizes = [14, 18, 24, 30];

const App = (): JSX.Element => {
  return (
    <Box>
      <Flex
        as="header"
        direction="column"
        alignItems="center"
        justifyContent="center"
        h="100vh"
        fontSize="3xl"
      >
        <Text fontSize={textFontSizes}>Northwest Discovery Water Trail</Text>
      </Flex>
      <ThemeToggleButton pos="fixed" bottom="2" right="2" />
    </Box>
  );
};

export default App;
