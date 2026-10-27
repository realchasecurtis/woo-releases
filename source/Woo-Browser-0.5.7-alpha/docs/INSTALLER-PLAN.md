# Installer and activation checkpoint

Windows: existing pinned Electron ZIP and PE editor available. Bounded lookup found no NSIS, Inno Setup or WiX compiler on PATH or standard NSIS/Inno paths. Recommended per-user installer: reviewed Inno Setup script targeting LocalAppData/Programs/Woo, Start menu shortcut, optional desktop shortcut, uninstaller that preserves browsing profile by default. Compiler acquisition/install needs approval; no dependency installed. ZIP remains optional. Signing is separate and unconfigured; installer alone does not resolve SmartScreen trust.

Mac: build/test on authorized Apple Silicon Mac using matching darwin-arm64 Electron. Standard .app inside DMG, Applications link, native hdiutil packaging. No Mac build/runtime or notarization performed here. Developer ID signing/notarization and credentials require separate setup approval. Never remove quarantine or advise bypassing Gatekeeper. Website publication awaits verified actual artifact.

Download activation remains OFF pending platform safety review and actual marking validation. Controller default platformApproved=false; production main does not override it. Mock tests explicitly opt in. hasUserGesture plus matching initiating HTTPS origin/main frame and browsing session ownership are required. This is a review candidate, not a finished download release. Native completion alone is not treated as evidence that MOTW/quarantine succeeded. Missing OS protection must keep activation unavailable until a reviewed fail-closed pipeline is implemented/tested.

Folder name 0.5.8-downloads-candidate is isolation only; package version remains0.5.7-alpha pending consolidated release naming. Frozen0.5.7 archives remain unchanged.
