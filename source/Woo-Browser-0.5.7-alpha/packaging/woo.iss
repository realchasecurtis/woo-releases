#ifndef PayloadDir
  #error PayloadDir must identify a validated, frozen Windows x64 payload
#endif
#ifndef ReleaseVersion
  #error ReleaseVersion is required
#endif
#ifndef NumericVersion
  #error NumericVersion is required
#endif
#ifndef OutputDir
  #error OutputDir is required
#endif
[Setup]
AppId={{7CFA8D34-5D5B-44D1-AC07-C04F743E20D0}
AppName=Woo
AppVersion={#ReleaseVersion}
VersionInfoVersion={#NumericVersion}
DefaultDirName={localappdata}\Programs\Woo
DisableDirPage=yes
UsePreviousAppDir=no
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
MinVersion=10.0
DefaultGroupName=Woo
DisableProgramGroupPage=yes
UninstallDisplayIcon={app}\Woo.exe
OutputDir={#OutputDir}
OutputBaseFilename=Woo-{#ReleaseVersion}-Windows-x64-Setup
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
CloseApplications=yes
RestartApplications=no
SetupLogging=yes
Uninstallable=yes
; No profile/document deletion, registry integration, protocol handler, or auto-launch.
[Tasks]
Name: desktopicon; Description: "Create a desktop shortcut"; Flags: unchecked
[Files]
Source: "{#PayloadDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
[Icons]
Name: "{autoprograms}\Woo"; Filename: "{app}\Woo.exe"; WorkingDir: "{app}"
Name: "{autodesktop}\Woo"; Filename: "{app}\Woo.exe"; WorkingDir: "{app}"; Tasks: desktopicon
