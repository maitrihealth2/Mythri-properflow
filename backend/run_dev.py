import subprocess
import sys
import time
import os
import signal
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

COOLDOWN = 1.0  # seconds to wait after a change before restarting (debounce)

class RestartHandler(FileSystemEventHandler):
    def __init__(self):
        self.process = None
        self._last_restart = 0
        self.start_server()

    def start_server(self):
        if self.process:
            print("[Watcher] Sending SIGTERM to old process...")
            self.process.terminate()
            try:
                # Wait up to 4 seconds for graceful shutdown, then force-kill
                self.process.wait(timeout=4)
            except subprocess.TimeoutExpired:
                print("[Watcher] Graceful shutdown timed out. Force-killing...")
                self.process.kill()
                self.process.wait()
            print("[Watcher] Old process stopped.")
        
        print("\n--- Starting Uvicorn Server ---")
        self.process = subprocess.Popen([
            sys.executable, "-m", "uvicorn", "app:app",
            "--port", "8000",
            "--timeout-graceful-shutdown", "3",  # Max 3s for connections to close
        ])

    def on_any_event(self, event):
        if event.is_directory:
            return
        if not (event.src_path.endswith('.py') or event.src_path.endswith('.env')):
            return
        # Debounce: ignore rapid duplicate events (e.g. editor writes temp file)
        now = time.time()
        if now - self._last_restart < COOLDOWN:
            return
        self._last_restart = now
        print(f"\n[Watcher] Detected change in {event.src_path}. Restarting...")
        self.start_server()

if __name__ == "__main__":
    event_handler = RestartHandler()
    observer = Observer()
    observer.schedule(event_handler, path='.', recursive=True)
    observer.start()
    
    print("[Watcher] Watching for .py / .env changes. Press Ctrl+C to stop.")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
        if event_handler.process:
            event_handler.process.terminate()
            try:
                event_handler.process.wait(timeout=4)
            except subprocess.TimeoutExpired:
                event_handler.process.kill()
    observer.join()
    print("[Watcher] Stopped.")
