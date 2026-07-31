import time
import asyncio
from datetime import datetime

from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.text import Text
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TimeElapsedColumn

console = Console()

class _CommandCenter:
    def __init__(self):
        # System Health State
        self.health_status = {
            "Brain": "Initializing",
            "Database": "Initializing",
            "Firebase": "Initializing",
            "Sarvam": "Initializing",
            "API Server": "Initializing",
        }
        
        # Performance Counters
        self.perf_stats = {
            "Total Requests": 0,
            "Active Requests": 0,
            "Avg Response (ms)": 0.0,
            "Total DB Queries": 0,
        }
        self._total_response_time = 0.0
        self.startup_time = time.time()
        self._last_snapshot_time = time.time()
        
    def _ts(self):
        return datetime.now().strftime("%H:%M:%S")

    def set_health(self, component: str, status: str):
        if component in self.health_status:
            self.health_status[component] = status
            
    def increment_active_requests(self, amount=1):
        self.perf_stats["Active Requests"] += amount

    def start_dashboard(self):
        """Prints the initial header banner."""
        uptime = int(time.time() - self.startup_time)
        header = Text(f"MAITRI V5 - DEVELOPER COMMAND CENTER (STREAMING MODE)", style="bold cyan", justify="center")
        console.print(Panel(header, style="cyan"))
        self._print_snapshot()

    def stop_dashboard(self):
        console.print(Panel("[bold red]Shutting down Backend...[/bold red]", border_style="red"))

    def _print_snapshot(self):
        """Prints a horizontal summary table of Health and Performance."""
        table = Table(show_header=True, header_style="bold magenta", expand=True)
        table.add_column("System Health", style="cyan")
        table.add_column("Performance Metrics", style="green")
        
        health_text = []
        for comp, status in self.health_status.items():
            color = "green" if status == "Healthy" else "yellow" if status == "Warning" else "red" if status == "Failed" else "blue"
            health_text.append(f"{comp}: [{color}]{status}[/{color}]")
            
        perf_text = []
        for k, v in self.perf_stats.items():
            val = f"{v:.1f}" if isinstance(v, float) else str(v)
            perf_text.append(f"{k}: [bold]{val}[/bold]")
            
        table.add_row("\n".join(health_text), "\n".join(perf_text))
        console.print(Panel(table, title="[b]Live Snapshot", border_style="magenta"))
        self._last_snapshot_time = time.time()

    def _check_snapshot(self):
        """Prints a snapshot every 60 seconds automatically."""
        if time.time() - self._last_snapshot_time > 60:
            self._print_snapshot()

    def log_api(self, method: str, endpoint: str, status: int, duration_ms: float):
        self._check_snapshot()
        self.perf_stats["Total Requests"] += 1
        self._total_response_time += duration_ms
        self.perf_stats["Avg Response (ms)"] = self._total_response_time / self.perf_stats["Total Requests"]
        
        color = "green" if status < 400 else "red"
        text = Text()
        text.append(f"[{self._ts()}] ", style="dim")
        text.append(f"{method:>6} ", style="bold blue")
        text.append(f"{endpoint} ", style="default")
        text.append(f"{status} ", style=f"bold {color}")
        text.append(f"({duration_ms:.1f}ms)", style="dim")
        
        console.print(text)

    def log_db(self, action: str, query: str):
        self._check_snapshot()
        self.perf_stats["Total DB Queries"] += 1
        
        text = Text()
        text.append(f"[{self._ts()}] ", style="dim")
        text.append(f"DB {action} ", style="bold yellow")
        text.append(query, style="yellow")
        console.print(text)

    def log_ai(self, phase: str, details: str):
        self._check_snapshot()
        
        text = Text()
        text.append(f"[{self._ts()}] ", style="dim")
        text.append(f"AI {phase:>15} | ", style="bold magenta")
        text.append(details, style="magenta")
        console.print(text)

    def log_error(self, msg: str):
        self._check_snapshot()
        console.print(Panel(f"[bold red]ERROR at {self._ts()}:[/bold red]\n{msg}", border_style="red"))
        try:
            from modules.dashboard.api import broadcast_event
            loop = asyncio.get_running_loop()
            loop.create_task(broadcast_event("ERROR", msg))
        except Exception:
            pass

    def create_progress(self):
        """Creates a Progress bar for the boot sequence (runs before dashboard)"""
        return Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            BarColumn(),
            TextColumn("[progress.percentage]{task.percentage:>3.0f}%"),
            TimeElapsedColumn(),
            console=console
        )

# Global singleton
CommandCenter = _CommandCenter()
