import time
import asyncio
import threading
from datetime import datetime

from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.text import Text
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TimeElapsedColumn

console = Console(safe_box=True)

class _CommandCenter:
    def __init__(self):
        self._lock = threading.Lock()
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
            "Last Chat Latency (ms)": 0.0,
            "Total DB Queries": 0,
        }
        
        # LLM Token Counters
        self.token_stats = {
            "Total Input Tokens": 0,
            "Total Output Tokens": 0,
            "Total Tokens": 0,
            "Total LLM Calls": 0,
            "Last Call Tokens": "0 In / 0 Out",
        }
        self._total_response_time = 0.0
        self.startup_time = time.time()
        self._last_snapshot_time = time.time()
        
    def _ts(self):
        return datetime.now().strftime("%H:%M:%S")

    def set_health(self, component: str, status: str):
        with self._lock:
            if component in self.health_status:
                self.health_status[component] = status
            
    def increment_active_requests(self, amount=1):
        with self._lock:
            self.perf_stats["Active Requests"] += amount

    def start_dashboard(self):
        """Prints the initial header banner."""
        uptime = int(time.time() - self.startup_time)
        header = Text(f"MYTHRI V5 - DEVELOPER COMMAND CENTER (STREAMING MODE)", style="bold cyan", justify="center")
        console.print(Panel(header, style="cyan"))
        self._print_snapshot()

    def stop_dashboard(self):
        console.print(Panel("[bold red]Shutting down Backend...[/bold red]", border_style="red"))

    def _print_snapshot(self):
        """Prints a horizontal summary table of Health, Performance, and Token Usage."""
        table = Table(show_header=True, header_style="bold magenta", expand=True)
        table.add_column("System Health", style="cyan")
        table.add_column("Performance Metrics", style="green")
        table.add_column("LLM Token Usage", style="bright_yellow")
        
        with self._lock:
            health_text = []
            for comp, status in self.health_status.items():
                color = "green" if status == "Healthy" else "yellow" if status == "Warning" else "red" if status == "Failed" else "blue"
                health_text.append(f"{comp}: [{color}]{status}[/{color}]")
                
            perf_text = []
            for k, v in self.perf_stats.items():
                val = f"{v:.1f}" if isinstance(v, float) else str(v)
                perf_text.append(f"{k}: [bold]{val}[/bold]")
            
            token_text = [
                f"Prompt Tokens  : [bold]{self.token_stats['Total Input Tokens']:,}[/bold]",
                f"Output Tokens  : [bold]{self.token_stats['Total Output Tokens']:,}[/bold]",
                f"Total Tokens   : [bold cyan]{self.token_stats['Total Tokens']:,}[/bold cyan]",
                f"Total Calls    : [bold]{self.token_stats['Total LLM Calls']}[/bold]",
                f"Last Call      : [dim]{self.token_stats['Last Call Tokens']}[/dim]",
            ]
            
            table.add_row("\n".join(health_text), "\n".join(perf_text), "\n".join(token_text))
            self._last_snapshot_time = time.time()
            
        console.print(Panel(table, title="[b]Live Snapshot", border_style="magenta"))

    def log_tokens(self, call_type: str, prompt_tokens: int, completion_tokens: int, duration_ms: float = 0.0, details: str = ""):
        """Logs exact token usage in real-time to the terminal."""
        import os
        show_tokens = os.getenv("SHOW_TOKEN_USAGE", "true").lower() in ("true", "1", "yes")
        total_tokens = prompt_tokens + completion_tokens

        with self._lock:
            self.token_stats["Total Input Tokens"] += prompt_tokens
            self.token_stats["Total Output Tokens"] += completion_tokens
            self.token_stats["Total Tokens"] += total_tokens
            self.token_stats["Total LLM Calls"] += 1
            self.token_stats["Last Call Tokens"] = f"{prompt_tokens:,} In / {completion_tokens:,} Out ({total_tokens:,})"
            session_cumulative = self.token_stats["Total Tokens"]

        if not show_tokens:
            return

        try:
            self._check_snapshot()
            text = Text()
            text.append(f"[{self._ts()}] ", style="dim")
            text.append("TOKENS ", style="bold bright_yellow")
            text.append(f"- {call_type} ", style="bold cyan")
            if duration_ms > 0:
                text.append(f"({duration_ms:.1f}ms) ", style="dim")
            text.append("| ", style="dim")
            text.append(f"In: ", style="dim")
            text.append(f"{prompt_tokens:,} ", style="bold green")
            text.append(f"| Out: ", style="dim")
            text.append(f"{completion_tokens:,} ", style="bold bright_magenta")
            text.append(f"| Total: ", style="dim")
            text.append(f"{total_tokens:,} tok ", style="bold bright_cyan")
            text.append(f"[Session: {session_cumulative:,} tok]", style="dim bright_yellow")
            if details:
                text.append(f" ({details})", style="dim")
            console.print(text)
        except Exception as e:
            print(f"[LOG_TOKEN_ERROR] {e}")

    def _check_snapshot(self):
        """Prints a snapshot every 60 seconds automatically."""
        # Check without lock first for performance, then lock in _print_snapshot
        if time.time() - self._last_snapshot_time > 60:
            self._print_snapshot()

    def log_api(self, method: str, endpoint: str, status: int, duration_ms: float):
        try:
            self._check_snapshot()
            with self._lock:
                self.perf_stats["Total Requests"] += 1
                self._total_response_time += duration_ms
                self.perf_stats["Avg Response (ms)"] = self._total_response_time / self.perf_stats["Total Requests"]
                if "/api/consultation/message" in endpoint:
                    self.perf_stats["Last Chat Latency (ms)"] = duration_ms
            
            color = "green" if status < 400 else "red"
            text = Text()
            text.append(f"[{self._ts()}] ", style="dim")
            text.append(f"{str(method):>6} ", style="bold blue")
            text.append(f"{endpoint} ", style="default")
            text.append(f"{status} ", style=f"bold {color}")
            text.append(f"({duration_ms:.1f}ms)", style="dim")
            
            console.print(text)
        except Exception as e:
            print(f"[LOG_API_ERROR] {e}")

    def log_db(self, action: str, query: str):
        try:
            self._check_snapshot()
            with self._lock:
                self.perf_stats["Total DB Queries"] += 1
            
            text = Text()
            text.append(f"[{self._ts()}] ", style="dim")
            text.append(f"DB {action} ", style="bold yellow")
            text.append(str(query), style="yellow")
            console.print(text)
        except Exception as e:
            print(f"[LOG_DB_ERROR] {e}")

    def log_ai(self, phase: str, details: str):
        try:
            self._check_snapshot()
            
            text = Text()
            text.append(f"[{self._ts()}] ", style="dim")
            text.append(f"AI {str(phase):>15} | ", style="bold magenta")
            text.append(str(details), style="magenta")
            console.print(text)
        except Exception as e:
            print(f"[LOG_AI_ERROR] {e}")

    def log_error(self, msg: str, exc: Exception = None):
        self._check_snapshot()
        
        file_path = "Unknown"
        line = "?"
        func = ""
        problem = msg

        import os
        import traceback
        import inspect

        if exc and hasattr(exc, "__traceback__") and exc.__traceback__:
            tb = traceback.extract_tb(exc.__traceback__)
            if tb:
                last_frame = tb[-1]
                try:
                    file_path = os.path.relpath(last_frame.filename, start=os.getcwd())
                except ValueError:
                    file_path = last_frame.filename
                line = str(last_frame.lineno)
                func = last_frame.name
        else:
            try:
                frame = inspect.currentframe().f_back
                try:
                    file_path = os.path.relpath(frame.f_code.co_filename, start=os.getcwd())
                except ValueError:
                    file_path = frame.f_code.co_filename
                line = str(frame.f_lineno)
                func = frame.f_code.co_name
            except Exception:
                pass
                
        func_text = f" (in {func})" if func and func != "<module>" else ""
        content = (
            f"[bold white]File:[/bold white]    [cyan]{file_path}[/cyan]\n"
            f"[bold white]Line:[/bold white]    [yellow]{line}{func_text}[/yellow]\n"
            f"[bold white]Problem:[/bold white] [bold red]{problem}[/bold red]"
        )

        console.print(Panel(content, title=f"[bold red]ERROR at {self._ts()}[/bold red]", border_style="red", expand=False))
        try:
            from modules.dashboard.api import broadcast_event
            loop = asyncio.get_running_loop()
            loop.create_task(broadcast_event("ERROR", problem))
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
