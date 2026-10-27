"""Explicitly approved LIVE Electron check. No installation, listener, or launch on import.
Run only AFTER the parent confirms both public files and separately approves runtime launch.
Uses a NEW profile for every invocation; keeps profile/evidence at the requested local path.
"""
import argparse
import json
import os
from pathlib import Path
import signal
import subprocess
import sys

def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--public-files-confirmed', action='store_true', required=True)
    p.add_argument('--runtime-launch-approved', action='store_true', required=True)
    p.add_argument('--electron', type=Path, required=True)
    p.add_argument('--profile', type=Path, required=True, help='New nonexistent disposable path')
    args = p.parse_args()
    candidate = Path(__file__).resolve().parents[1]
    runtime = args.electron.resolve(strict=True)
    profile = args.profile.absolute()
    if not runtime.is_file(): p.error('Electron must be an existing verified executable file')
    if profile.exists(): p.error('Profile already exists; choose a new disposable path')
    profile.mkdir(parents=False)
    command = [str(runtime), str(candidate), '--shared-catalogue-live-check', '--public-files-confirmed', '--data-dir=' + str(profile)]
    kwargs = {'start_new_session': True} if os.name != 'nt' else {'creationflags': subprocess.CREATE_NEW_PROCESS_GROUP}
    timed_out = False
    with (profile / 'shared-live-process.log').open('wb') as output:
        child = subprocess.Popen(command, stdout=output, stderr=subprocess.STDOUT, **kwargs)
        try:
            returncode = child.wait(timeout=60)
        except subprocess.TimeoutExpired:
            timed_out = True
            if os.name == 'nt':
                subprocess.run(['taskkill', '/PID', str(child.pid), '/T', '/F'], check=False, stdout=output, stderr=subprocess.STDOUT)
            else:
                os.killpg(child.pid, signal.SIGTERM)
            try: returncode = child.wait(timeout=5)
            except subprocess.TimeoutExpired:
                if os.name != 'nt': os.killpg(child.pid, signal.SIGKILL)
                else: child.kill()
                returncode = child.wait(timeout=5)
    result_path = profile / 'shared-live-results.json'
    result = json.loads(result_path.read_text()) if result_path.exists() else {'pass': False, 'error': 'No GUI result'}
    summary = {'pass': not timed_out and returncode == 0 and result.get('pass') is True, 'timeout': timed_out, 'forcedCleanup': timed_out, 'returncode': returncode, 'profile': str(profile), 'result': result}
    (profile / 'shared-live-summary.json').write_text(json.dumps(summary, indent=2))
    print(json.dumps(summary, indent=2))
    return 0 if summary['pass'] else 1

if __name__ == '__main__':
    sys.exit(main())
