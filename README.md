# Cover BB

Cover BB is a Tampermonkey userscript helper for Bearbit. It improves torrent list browsing, cover previews, download handling, and page cleanup while keeping the public script file encrypted.

Current version: `2.28.0`

## What It Does

- Shows configurable thumbnail covers on torrent list pages.
- Resolves indirect image hosts to direct image URLs when possible.
- Adds thumbnail hover zoom and optional title hover preview.
- Adds a lightbox/album viewer with next and previous controls.
- Adds a custom torrent download button with referer-aware download flow.
- Supports selecting multiple torrents and downloading them one by one with a random `3-10` second delay between items.
- Sends auto-thanks when enabled.
- Marks downloaded torrents locally.
- Cleans detail pages by removing banner/advertising rows, bookmark links, promote links, and download icons.
- Can fit oversized detail images to the screen.
- Provides a web GUI from the floating gear button.

## Files

- `cover-bb.user.js` - Tampermonkey metadata wrapper.
- `cover-bb.js` - encrypted public loader used by Tampermonkey.
- `cover-bb.source.js` - local readable source only. This file is ignored and should not be committed.
- `cover-next-master/` - local reference material only, not part of this project output.

## Install Locally

1. Install Tampermonkey.
2. Add or update `cover-bb.user.js` in Tampermonkey.
3. Confirm the `@require` path points to the local encrypted loader:

```js
// @require      file:///C:/Users/lPae/Desktop/VideCode/bearbit/cover-bb.js
```

4. Enable local file access for Tampermonkey if the browser requires it.
5. Open a supported Bearbit page and use the floating gear button.

## Settings

Open the floating gear button on Bearbit. The popup shows the current version and grouped controls.

Display:
- Thumbnail width and height
- Hover zoom
- Thumbnail preview on/off
- Title hover preview on/off
- Album lightbox on/off
- Font size override

Data:
- Local cache on/off
- Cache expiry days
- Direct source resolver on/off
- Except category keys
- Clear cache

Actions:
- Custom download button on/off
- Multi-download selection on/off
- Auto thanks on/off
- Mark downloaded torrents on/off

Cleanup:
- Clean detail banner/ads
- Clean detail download icon
- Clean detail bookmark link
- Clean detail promote link
- Fit oversized detail images

Stored localStorage keys:

```text
bb_cover_settings
bb_downloaded_v2
cache_v2_*
```

## Multi-Download

When `Select and download multiple` is enabled:

1. Select torrent rows with the `Select` checkbox.
2. Use the floating `Download selected` panel.
3. The script downloads one torrent at a time.
4. It waits a random `3-10` seconds before starting the next selected torrent.

This uses the same referer-aware download function as the single `Download Torrent` button.

## Encryption Workflow

Readable source stays local in `cover-bb.source.js`.

Public output is `cover-bb.js`, generated as an XOR + Base64 self-decrypting loader with key:

```text
bearbit-cover-bb-2026
```

Important:
- Keep `cover-bb.source.js` local only.
- Commit/push only `cover-bb.js` and `cover-bb.user.js` for public updates.
- The loader uses direct `eval(code);` so Tampermonkey APIs such as `GM_xmlhttpRequest` remain available in the userscript sandbox.

## Regenerate Encrypted Loader

Use Node.js to regenerate `cover-bb.js` from `cover-bb.source.js` with the existing encryption helper logic.

After regenerating, verify:

```powershell
node --check cover-bb.source.js
node --check cover-bb.js
node --check cover-bb.user.js
```

Also decode `cover-bb.js` and compare it byte-for-byte with `cover-bb.source.js` before committing.

## Git Remotes

Current remotes:

```text
origin  https://github.com/x98company/cover-bb.git
gitea   http://192.168.1.31:8418/codex_org/cover-bb.git
```

The local branch `main` tracks `gitea/main`.

## Troubleshooting

`GM_xmlhttpRequest not found`

- Confirm `cover-bb.user.js` includes:

```js
// @grant        GM_xmlhttpRequest
```

- Confirm `cover-bb.js` loader uses:

```js
eval(code);
```

not indirect eval.

Downloads do not start:

- Confirm Tampermonkey has local file access.
- Confirm the `@require` file path exists.
- Try clearing the script cache from the settings popup.

Images do not load:

- Enable `Resolve image hosts`.
- Clear cache.
- Check whether the host is allowed by `@connect`.
