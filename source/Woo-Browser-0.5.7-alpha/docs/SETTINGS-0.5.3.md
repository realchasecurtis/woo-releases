# Settings menu sizing — 0.5.3

Removed the separate Close button. Escape, outside focus and the settings-icon toggle dismiss the menu. The separate sandboxed window preserves the visible web page. A bounded size-only IPC from the exact menu frame reports intrinsic content height; main places it inside the display work area. Ordinary desktop menus fit without scrolling. On constrained screens or high zoom, height is capped to the available screen and overflow remains keyboard/scroll accessible instead of clipping. No security/origin permission changes.

Screenshot attachment was not inspected; explicit text requirements guided this patch. No Library transfer retry or guessed screenshot detail. Prior Browser 0.5.2 and Hosting alpha 0.1.1 remain unchanged.
