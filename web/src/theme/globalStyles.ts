import { css } from '@emotion/react';

export const globalStyles = css`
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html, body, #root {
    height: 100%;
    width: 100%;
  }

  body {
    font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
      "Helvetica Neue", Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    background-color: #f5f5f5;
    color: #262626;
  }

  a {
    color: #1677ff;
    text-decoration: none;
  }

  a:hover {
    color: #4096ff;
  }
`;

export default globalStyles;
