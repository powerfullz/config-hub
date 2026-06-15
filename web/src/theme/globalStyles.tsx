import { css, Global } from '@emotion/react';

export function getGlobalStyles(isDark: boolean) {
  return (
    <Global
      styles={css`
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        html,
        body,
        #root {
          height: 100%;
          width: 100%;
        }

        body {
          font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI",
            Roboto, "Helvetica Neue", Arial, sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          background-color: ${isDark ? '#141414' : '#f5f5f5'};
          color: ${isDark ? 'rgba(255,255,255,0.85)' : '#262626'};
        }

        a {
          color: ${isDark ? '#4dabf7' : '#1677ff'};
          text-decoration: none;
        }

        a:hover {
          color: #4096ff;
        }
      `}
    />
  );
}

export default getGlobalStyles;
