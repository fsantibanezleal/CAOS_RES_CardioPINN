// Single source of the display version for the frontend. Used by the shell config (footer) AND to cache-bust
// the committed data fetches on GitHub Pages, where index.html and the JSON traces are CDN-cached independently
// of the content-hashed JS bundle (see the GitHub-Pages stale-cache gotcha). Bump this on every release.
export const APP_VERSION = '0.21.006';
