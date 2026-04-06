# Loom Extension

Browser extension that intercepts `loom.*` URLs and creates a Peerly weave from the target page.

## How it works

User types `loom.reddit.com/r/india` in the address bar → extension detects the `loom.` prefix → strips it → sends the real URL to `peerly.app/loom?url=...` → the app fetches the page, extracts content, generates a weave with AI, and redirects the user to it.

## Development setup

1. Open `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked" → select this `extension/` folder
4. For local dev, change `PEERLY_BASE` in `background.js` to `http://localhost:3000`

## Files

- `manifest.json` — extension config (Manifest V3)
- `background.js` — service worker that intercepts navigation and redirects

## Production

Change `PEERLY_BASE` in `background.js` to your production domain before publishing to the Chrome Web Store.
