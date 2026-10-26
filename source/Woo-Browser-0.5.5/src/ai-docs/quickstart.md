> RELEASE STATE 0.5.0: New domain/alias/site-identity creation is temporarily CLOSED in the packaged app. Creation examples below describe development fixtures or future approved operation, not actions an AI should enable. Normal public HTTPS browsing and explicit web search work. Existing recent projects and verified snapshots remain available; signing remains temporary.

# Quickstart — a website on this PC

## Create

Open Woo, choose Create your website, and enter a short label such as my-studio. Choose an ending explicitly. No ending is selected automatically. .woo are examples already used by this prototype. The other choices are proposals, not final or exclusively reserved namespaces. You can type a different ASCII ending for a local experiment. A green/local availability message means unused in this profile only.

Add a page title. Choose the starter page if you do not have files yet. Woo writes editable index.html and style.css inside the profile's sites/<name>/ directory and shows the full location after creation. Alternatively choose a static folder with index.html. Woo does not run its build scripts or install packages. Keep an independent backup of your original work.

Review the summary. The checkbox confirms temporary local preview only. Create local preview saves a signed snapshot and local metadata. Open my preview shows the site in a separate verified-origin window. The address is a Woo name; the actual rendering origin is a cryptographically derived woo-site:// identity. This is not HTTPS under an arbitrary new public root.

## Edit

Edit the starter HTML/CSS or your chosen folder in your own editor. Refresh preview builds a new signed snapshot while the temporary signing identity is still in memory. Existing source files are not changed by the preview process. Supported JavaScript runs inside a sandboxed page without Node/native access. Public network requests, frames, workers, forms, popups and downloads are restricted in the verified local site mode. See security before adapting features.

If you close Woo, the private demo key is discarded. Reopening can display the last verified snapshot. Refreshing/signing is then unavailable. The UI should say so rather than pretending edits were published. A lasting identity and recovery design need explicit future approval; this build does not silently create them.

## Stop and resume

Stop preview closes verified windows and disables their local protocol serving entries. No public server is opened or closed because this mode uses direct verified bundles, not HTTP. Source files, public metadata and cached snapshots remain. Start / open preview re-verifies and displays the saved selected snapshot. This does not restore a lost signing key. Closing the entire app pauses observed ownership time and discards the temporary key.

## Search

New profiles default to regular public web search with Google. Woo sites on this PC is an explicit local scope: it searches registered names, aliases, titles, descriptions and published metadata. Exact names and direct safe URLs navigate. Settings can change provider and default scope; queries are sent only on explicit submission, never on every keystroke. Light/dark/system theme applies to Woo's own UI. External sites control their own theme.

## Give this to your AI

Open Help & AI setup guide. Copy complete AI guide puts only these documents on your clipboard. Save documentation ZIP writes a local versioned bundle. Neither action includes profile records, browsing history, selected website files or private keys. You decide what to share with an AI. Read its proposed actions before granting filesystem, hosting or credential access.

## Bookmarks and window controls
The tab row contains minimize, maximize/restore and close controls. Drag its empty space to move Woo. On a loaded HTTPS website, the star saves or removes the committed page even if you have typed a different address. Press Enter to navigate typed text. The bookmarks bar appears after the first bookmark and collapses after the last removal. Open Settings > Manage bookmarks to edit titles or remove entries. Bookmarks are local, capped at 200, and never synchronized. Native Woo previews currently open in separate verified windows; bookmarking those custom origins is not supported.

New users: type a query on Home and submit to search Google. Choose Woo sites on this PC for the local metadata index. Settings can change the provider and default scope. Create your website holds creator tools and RECENTS; new domain creation is temporarily closed. Back/Forward includes Home and bundled guides.
