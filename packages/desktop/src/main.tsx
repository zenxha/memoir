import React from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider, createTheme } from '@mantine/core';
import '@mantine/core/styles.css';
import './styles/theme.css';
import { App } from './App';

// dark[7] is the Mantine body background in dark mode — map to ink-050
const theme = createTheme({
  primaryColor: 'dark',
  defaultRadius: 'sm',
  fontFamily: '"Geist", -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif',
  fontFamilyMonospace: '"JetBrains Mono", "SF Mono", ui-monospace, monospace',
  headings: {
    fontFamily: '"Instrument Serif", "Times New Roman", serif',
  },
  colors: {
    dark: [
      '#f3ece0', // 0 — paper-900, text
      '#c8c0b3', // 1 — paper-700, muted text
      '#8a8377', // 2 — paper-500, secondary
      '#6a6358', // 3 — paper-400, tertiary
      '#4d4940', // 4 — paper-300, faint
      '#3d3848', // 5 — ink-400, divider
      '#2a2632', // 6 — ink-300, border
      '#0c0a10', // 7 — ink-050, body background
      '#07060a', // 8 — ink-000, deepest
      '#040309', // 9 — near-black floor
    ],
  },
});

createRoot(document.getElementById('root')!).render(
  <MantineProvider theme={theme} defaultColorScheme="dark">
    <App />
  </MantineProvider>,
);
