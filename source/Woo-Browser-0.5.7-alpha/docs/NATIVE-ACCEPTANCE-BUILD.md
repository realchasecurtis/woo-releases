# Separate native acceptance build

Normal source policy src/download-release-policy.json has enabled=false and nativeAcceptanceBuild=false. Flags alone cannot activate downloads. No renderer API changes these fields.

After review and scoped runtime approval, a distinct acceptance build may set ONLY nativeAcceptanceBuild=true, with enabled remainingfalse. Launch with --download-native-acceptance --supervised-native-save and an explicit absolute --data-dir in the owned acceptance directory. This exercises the same DownloadItem/native Save dialog path; there is no setSavePath or fake picker. This opt-in is not proof of quarantine/MOTW and must never be presented as release activation. Record the exact test-policy delta/hash and build identity.

No acceptance-policy change or runtime execution has occurred yet. Native validation must inspect actual Windows protection metadata and preserve failures honestly. Final distributable must restore nativeAcceptanceBuild=false, and enabled may change only after reviewed evidence supports actual platform release. Native Save path is still chosen by the human in the real dialog; selecting owned fixture paths is part of supervised test procedure.
