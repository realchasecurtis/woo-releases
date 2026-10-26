# Woo Browser 0.5.4 source

Windows-first, open-source browser prototype built on Electron. This source snapshot corresponds to Browser 0.5.4, a bounded quality candidate. Public HTTPS browsing, Google-default web search, Woo-only naming aliases, tabs, bookmarks and local creator documentation are included. Domain creation remains closed. Native Woo metadata discovery is local; ordinary internet browsing is not restricted to local sites.

Source is MIT licensed under the existing LICENSE. Electron/Chromium and vendored node/agent subsets retain their own notices. No runtime executable is bundled in this repository. No hosting-alpha or client-app groundwork project is included: only the experimental subsets actually used by Browser, disabled by default, are retained under src/experimental/vendor.

## Build on Windows

Use Node 24+ and PowerShell. There are zero third-party npm application dependencies. package-lock.json describes that empty npm dependency graph; build-tools.lock.json separately pins Electron and rcedit archives. No npm install is required.

1. Download Electron 45.0.0 win32-x64 from its official release into downloads/electron-v45.0.0-win32-x64.zip.
2. Download official rcedit 2.0.0 x64 into downloads/rcedit-x64-v2.0.0.exe.
3. Check hashes in build-tools.lock.json. tools/build.ps1 also rejects mismatches.
4. Run tools/build.ps1 with a fresh -Output directory. It retains Electron LICENSE/LICENSES.chromium.html and installs Woo LICENSE as WOO-LICENSE.txt. This produces an unsigned folder distribution. Keep all files together.

Do not automatically run installation/build scripts from website content. Do not bypass Windows warnings. Signing and authenticated distribution are separate operations. Hash-pinned inputs improve reproducibility; a byte-for-byte identical ZIP is not promised because ZIP metadata/timestamps can differ.

## Tests and development

Unit test sources are in test/. Tests may create ephemeral fixture identities and temporary loopback services; inspect their scope and run only in a disposable development environment. Never point --data-dir at a real profile. A narrow pure test example: node --test test/navigation-settings.test.cjs. Full suite: node --test --test-concurrency=1 test/*.test.cjs. Some environment-specific targets were not runnable during development; this repository does not imply every target passed. New tests/public runtime validation are still necessary.

Launch unpackaged development using a locally obtained Electron runtime against this directory with a disposable --data-dir. Public page isolation, origin validation and closed-creation policy must remain intact. Do not configure a trusted updater, persistent identity, public listener or service without an explicit operator decision.

## Settings clarification

The active settings surface is src/settings-popover.html, opened by main.cjs. In the verified 0.5.4 test copy it has no Close button and fits ordinary desktop windows. Escape/outside click/settings toggle dismiss it. Very small display work areas or high zoom retain scrolling to avoid inaccessible options. The unused legacy menu and its bindings have been removed. About Woo & Privacy shows trusted version, source fingerprint and the running executable path. A reported mismatch in a user's running copy remains under investigation. This removes the duplicate implementation but does not prove why the previously running copy showed different controls.

Automatic check scheduling exists, but src/update-trust.json has no endpoint/key configured; no production update is fetched and nothing automatically installs. Settings reports not configured. Google remains the new-profile default; explicit prior user settings are preserved.

## Documentation

src/ai-docs and the bundled ai-docs.zip contain architecture, protocol, SDK, setup and security guides. docs/ contains selected public technical references and licenses, not personal test screenshots/profiles or private task reports. Some versioned documents describe earlier milestones; current source and this README determine implemented scope. Read SECURITY.md before extending privileges. No distributed public network, standalone hosting app or executable game support is activated here.

## Changes in this candidate
Removed personal .bunker promotion from the new-user selector, default search and examples; existing saved records and resolution stay compatible. No user profile is migrated, cleared or renamed. Privacy/help describes local storage, submitted searches, page favicons and Chromium uncertainty without claiming zero tracking. Spellcheck behavior is unchanged pending measured runtime evidence. No public deployment or update trust activation is part of this build.
