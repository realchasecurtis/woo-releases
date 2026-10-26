# Built-in shortcut choices (0.5.0)

Official pages checked 2026-10-26:
- map.woo: https://www.openstreetmap.org/ — worldwide map, open map data.
- translate.woo: https://translate.google.com/ — text translation.
- weather.woo: https://www.weather.gov/ — US National Weather Service overview and city/ZIP input. US coverage is explicit; no location coordinates are appended.
- code.woo: https://developer.mozilla.org/en-US/ — HTML/CSS/JavaScript documentation.
- learn.woo remains https://www.wikipedia.org/.

The first four are source-configured reserved aliases in src/builtin-shortcuts.json, overlaid without writing or replacing user records. Existing conflicts win and are flagged in Registry Settings. Ordinary claims/imports cannot assign reserved names. Deliberate operator source edits can change defaults. Clicking one makes a normal HTTPS request: providers receive ordinary network metadata such as IP address. Woo does not send precise location, text, credentials or profile data automatically, and browser geolocation permissions remain denied. Public website availability or full compatibility is not guaranteed; these are not native Woo-hosted services or public DNS registrations. No account or paid service was created.

0.5.0 supersedes code.woo's earlier MDN default: it opens the bundled AI setup guide internally. MDN remains an ordinary public website used in browsing tests, not the default code.woo target. Custom saved overrides are retained. No native node code is integrated.
