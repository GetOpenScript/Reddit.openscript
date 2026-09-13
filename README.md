# Reddit.openscript

User scripts for Reddit integrations powered by [OpenScript](https://github.com/GetOpenScript/OpenScript).

## Scripts

### 1. Reddit Comments on YouTube (`YouTube.os.js`)

Embeds relevant Reddit discussion threads and comments directly above the native YouTube comment section on any YouTube video page.

#### Features
- **Zero API Keys & Read-Only:** Queries public Reddit JSON endpoints without credentials or cookies. Completely anonymous.
- **Dual Comment Display:** YouTube comments remain visible and accessible directly beneath the Reddit discussion section.
- **Multiple Threads Support:** Displays clickable subreddit tabs sorted by `top` score.
- **Official Subreddit Detection:** Automatically detects subreddit links in video descriptions and badges matching threads as `Official`.
- **Collapsible Comment Trees:** Clean nested thread view with `[–]` and `[+]` collapse toggles.
- **Native YouTube Theming:** Adapts seamlessly to YouTube's light and dark themes using YouTube CSS color variables.
- **Always Fresh:** No caching, so newly submitted threads appear on page navigation.

#### Installation
1. Install [OpenScript](https://chromewebstore.google.com/detail/openscript/dkelmgdchndagjemmodhkphdikhpnfol) (requires version `1.0.4` or newer for `OpenScript.fetch`).
2. Open the OpenScript popup and click **New Script**.
3. Copy and paste the contents of [`YouTube.os.js`](YouTube.os.js) into the editor.
4. Save the script and ensure it is enabled.
5. Open any YouTube video with Reddit discussions (e.g. trailers, music videos, podcasts).
