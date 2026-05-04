import type { Preview } from '@storybook/react';
import '../src/styles/tokens.css';
import '../src/styles/global.css';

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: 'app',
      values: [
        { name: 'app', value: '#f4f5f9' },
        { name: 'sidebar', value: '#1e2a5e' },
        { name: 'white', value: '#ffffff' },
      ],
    },
    controls: { expanded: true, matchers: { color: /color$/i, date: /date$/i } },
  },
};

export default preview;
