from __future__ import annotations

import os
import signal
import subprocess
import sys
import threading
import time
from pathlib import Path


ROOT = Path(__file__).resolve().parent
BACKEND_DIR = ROOT / "backend"
FRONTEND_DIR = ROOT / "frontend"


def find_repo_python() -> str:
    if os.name == "nt":
        candidate = ROOT / ".venv" / "Scripts" / "python.exe"
    else:
        candidate = ROOT / ".venv" / "bin" / "python"

    if candidate.exists():
        return str(candidate)

    return sys.executable


def npm_command() -> list[str]:
    return ["npm.cmd"] if os.name == "nt" else ["npm"]


def stream_output(prefix: str, pipe):
    try:
        for line in iter(pipe.readline, ""):
            if not line:
                break
            print(f"[{prefix}] {line.rstrip()}")
    finally:
        pipe.close()


def terminate_process(process: subprocess.Popen[str]):
    if process.poll() is not None:
        return

    if os.name == "nt":
        process.send_signal(signal.CTRL_BREAK_EVENT)
    else:
        process.terminate()

    try:
        process.wait(timeout=5)
    except subprocess.TimeoutExpired:
        process.kill()


def main() -> int:
    python_cmd = find_repo_python()
    backend_env = os.environ.copy()
    backend_env["FLASK_APP"] = "app.py"

    print("Applying backend migrations...")
    upgrade = subprocess.run(
        [python_cmd, "-m", "flask", "db", "upgrade"],
        cwd=BACKEND_DIR,
        env=backend_env,
        text=True,
    )
    if upgrade.returncode != 0:
        return upgrade.returncode

    backend = subprocess.Popen(
        [python_cmd, "-m", "flask", "run"],
        cwd=BACKEND_DIR,
        env=backend_env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if os.name == "nt" else 0,
    )

    frontend = subprocess.Popen(
        [*npm_command(), "run", "dev"],
        cwd=FRONTEND_DIR,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if os.name == "nt" else 0,
    )

    threads = [
        threading.Thread(target=stream_output, args=("backend", backend.stdout), daemon=True),
        threading.Thread(target=stream_output, args=("frontend", frontend.stdout), daemon=True),
    ]
    for thread in threads:
        thread.start()

    print("Starting backend and frontend. Press Ctrl+C to stop both.")

    try:
        while True:
            backend_code = backend.poll()
            frontend_code = frontend.poll()

            if backend_code is not None or frontend_code is not None:
                terminate_process(backend)
                terminate_process(frontend)
                return backend_code or frontend_code or 0

            time.sleep(0.5)
    except KeyboardInterrupt:
        print("\nStopping services...")
        terminate_process(backend)
        terminate_process(frontend)
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
