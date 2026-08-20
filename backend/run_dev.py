import subprocess
import sys
import time
import os
import signal
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

COOLDOWN = 1.5  # seconds to wait after a change before restarting (debounce)

# Directories to ignore completely
IGNORED_DIRS = {
    "venv", ".venv", "__pycache__", ".git", "node_modules",
    "chroma_db", "training", "scripts", "knowledge",
}

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
            time.sleep(1.5)  # Allow OS time to release the port socket on Windows
        
        print("\n--- Starting Uvicorn Server ---")
        self.process = subprocess.Popen([
            sys.executable, "-m", "uvicorn", "app:app",
            "--host", "0.0.0.0",
            "--port", "8000",
            "--timeout-graceful-shutdown", "3",  # Max 3s for connections to close
            "--log-level", "warning", # Suppress standard access logs for Terminal Command Center
        ])

    def on_any_event(self, event):
        if event.is_directory:
            return

        # Ignore changes inside venv or other non-source directories
        path_parts = event.src_path.replace("\\", "/").split("/")
        if any(part in IGNORED_DIRS for part in path_parts):
            return

        if not (event.src_path.endswith('.py') or event.src_path.endswith('.env')):
            return

        # Debounce: ignore rapid duplicate events (e.g. editor writes temp file)
        now = time.time()
        if now - self._last_restart < COOLDOWN:
            return
        
        print(f"\n[Watcher] Detected change in {event.src_path}. Restarting...")
        self.start_server()
        self._last_restart = time.time()

def free_port(port: int):
    """Kill any process occupying the given port so we can bind cleanly."""
    import socket
    import psutil
    for conn in psutil.net_connections(kind='tcp'):
        if conn.laddr.port == port and conn.pid:
            try:
                psutil.Process(conn.pid).terminate()
                print(f"[Watcher] Freed port {port} (killed PID {conn.pid})")
                time.sleep(0.5)
            except Exception:
                pass


def check_rag_initialization():
    chroma_path = os.path.join("rag", "knowledge", "chroma_db")
    if not os.path.exists(chroma_path):
        print(f"\n[Warning] RAG ChromaDB not found at '{chroma_path}'.")
        print("[Warning] RAG features might fail. Please ensure your knowledge base is initialized.\n")
    else:
        print(f"[Info] RAG ChromaDB found at '{chroma_path}'. Seamless RAG is ready.\n")

if __name__ == "__main__":
    free_port(8000)
    check_rag_initialization()
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
