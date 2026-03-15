import serial
import serial.tools.list_ports
from textual.app import App, ComposeResult
from textual.binding import Binding
from textual.containers import Vertical, Horizontal
from textual.screen import ModalScreen
from textual.widgets import Header, Footer, RichLog, Input, SelectionList, OptionList, Button, Label
from textual.widgets.option_list import Option
from textual.widget import Widget
from textual.worker import get_current_worker
from textual import on, work

from sync import (
    load_profiles,
    compute_diff,
    execute_sync,
    FileAction,
    FileChange,
    DeployProfile,
)

BAUD_RATE = 115200
RECONNECT_DELAY = 3


class PortSelectionScreen(ModalScreen[list[str]]):
    """Modal screen that scans COM ports and lets the user pick which to monitor."""

    CSS = """
    PortSelectionScreen {
        align: center middle;
    }
    #dialog {
        width: 60;
        height: auto;
        max-height: 80%;
        border: thick $accent;
        padding: 1 2;
        background: $surface;
    }
    #port-list {
        height: auto;
        max-height: 20;
        margin: 1 0;
    }
    #confirm {
        width: 100%;
        margin-top: 1;
    }
    """

    def compose(self) -> ComposeResult:
        ports = sorted(serial.tools.list_ports.comports(), key=lambda p: p.device)
        with Vertical(id="dialog"):
            if ports:
                yield Label("Select COM ports to monitor:")
                yield SelectionList[str](
                    *[
                        (f"{p.device}  {p.description}", p.device, True)
                        for p in ports
                    ],
                    id="port-list",
                )
                yield Button("Connect", id="confirm", variant="primary")
            else:
                yield Label("[red]No COM ports found.[/]")
                yield Button("Quit", id="quit-btn", variant="error")

    @on(Button.Pressed, "#confirm")
    def confirm(self) -> None:
        selected = list(self.query_one(SelectionList).selected)
        if selected:
            self.dismiss(selected)

    @on(Button.Pressed, "#quit-btn")
    def quit_no_ports(self) -> None:
        self.app.exit()

    def on_mount(self) -> None:
        try:
            self.query_one("#confirm", Button).focus()
        except Exception:
            pass

    @on(SelectionList.SelectionToggled)
    def update_button(self) -> None:
        try:
            btn = self.query_one("#confirm", Button)
            btn.disabled = len(self.query_one(SelectionList).selected) == 0
        except Exception:
            pass


class SerialPane(Widget):
    """A pane for a single serial connection with scrollable output and command input."""

    def __init__(self, port_name: str) -> None:
        super().__init__()
        self.port_name = port_name
        self.serial_conn: serial.Serial | None = None
        self.border_title = port_name
        self.border_subtitle = "connecting…"

    def compose(self) -> ComposeResult:
        yield RichLog(markup=True, wrap=True, auto_scroll=True, min_width=40)
        yield Input(placeholder=f"Send command to {self.port_name}…")

    def on_mount(self) -> None:
        self.connect_serial()

    @work(thread=True, exclusive=True, group="serial")
    def connect_serial(self) -> None:
        import time

        worker = get_current_worker()
        log = self.query_one(RichLog)

        while not worker.is_cancelled:
            try:
                conn = serial.Serial(self.port_name, BAUD_RATE, timeout=1)
                self.serial_conn = conn
                self.app.call_from_thread(
                    setattr, self, "border_subtitle", "connected"
                )
                self.app.call_from_thread(
                    log.write, f"[green]Connected to {self.port_name}[/]"
                )
                conn.write(b"\r\n")

                while not worker.is_cancelled:
                    data = conn.readline()
                    if data:
                        decoded = data.decode("utf-8", errors="replace").rstrip()
                        if decoded:
                            self.app.call_from_thread(log.write, decoded)

            except serial.SerialException as exc:
                self.serial_conn = None
                self.app.call_from_thread(
                    setattr, self, "border_subtitle", "disconnected"
                )
                self.app.call_from_thread(
                    log.write,
                    f"[red]Connection failed: {exc}[/]",
                )
                self.app.call_from_thread(
                    log.write,
                    f"[dim]Retrying in {RECONNECT_DELAY}s…[/]",
                )
                time.sleep(RECONNECT_DELAY)

    @on(Input.Submitted)
    def send_command(self, event: Input.Submitted) -> None:
        log = self.query_one(RichLog)
        if not event.value:
            return
        if self.serial_conn and self.serial_conn.is_open:
            try:
                self.serial_conn.write((event.value + "\r\n").encode("utf-8"))
                log.write(f"[bold cyan]>>> {event.value}[/]")
            except serial.SerialException as exc:
                log.write(f"[red]Send failed: {exc}[/]")
        else:
            log.write("[yellow]Not connected — command not sent[/]")
        event.input.clear()

    def send_control_char(self, byte: bytes, label: str) -> None:
        log = self.query_one(RichLog)
        if self.serial_conn and self.serial_conn.is_open:
            try:
                self.serial_conn.write(byte)
                log.write(f"[bold magenta]>>> {label}[/]")
            except serial.SerialException as exc:
                log.write(f"[red]Send failed: {exc}[/]")
        else:
            log.write("[yellow]Not connected — control char not sent[/]")

    def cleanup(self) -> None:
        if self.serial_conn:
            try:
                self.serial_conn.close()
            except Exception:
                pass


class SyncProfileScreen(ModalScreen[tuple[str, list[str]] | None]):
    """Modal screen to choose a deploy profile and target ports."""

    CSS = """
    SyncProfileScreen {
        align: center middle;
    }
    #sync-dialog {
        width: 60;
        height: 30;
        border: thick $accent;
        padding: 1 2;
        background: $surface;
    }
    #profile-list {
        height: 1fr;
        margin: 1 0;
    }
    #port-sync-list {
        height: 1fr;
        margin: 1 0;
    }
    #sync-buttons {
        dock: bottom;
        height: auto;
        margin-top: 1;
    }
    #sync-confirm {
        width: 1fr;
    }
    #sync-cancel {
        width: 1fr;
    }
    """

    def __init__(self, all_ports: list[str], default_port: str) -> None:
        super().__init__()
        self.all_ports = all_ports
        self.default_port = default_port

    def compose(self) -> ComposeResult:
        try:
            profiles = load_profiles()
        except Exception as exc:
            with Vertical(id="sync-dialog"):
                yield Label(f"[red]Failed to load deploy.toml: {exc}[/]")
                yield Button("Close", id="sync-cancel", variant="error")
            return

        with Vertical(id="sync-dialog"):
            yield Label("Select profile:")
            yield OptionList(
                *[Option(name, id=name) for name in profiles],
                id="profile-list",
            )
            yield Label("Select target port(s):")
            yield SelectionList[str](
                *[
                    (port, port, port == self.default_port)
                    for port in self.all_ports
                ],
                id="port-sync-list",
            )
            with Horizontal(id="sync-buttons"):
                yield Button("Compute diff", id="sync-confirm", variant="primary")
                yield Button("Cancel", id="sync-cancel")

    def on_mount(self) -> None:
        try:
            self.query_one(OptionList).focus()
        except Exception:
            pass

    def _get_selection(self) -> tuple[str, list[str]] | None:
        ol = self.query_one(OptionList)
        if ol.highlighted is None:
            return None
        profile = ol.get_option_at_index(ol.highlighted).id
        ports = list(self.query_one(SelectionList).selected)
        if not ports:
            return None
        return (profile, ports)

    @on(OptionList.OptionSelected)
    def on_option_selected(self, event: OptionList.OptionSelected) -> None:
        sel = self._get_selection()
        if sel:
            self.dismiss(sel)

    @on(Button.Pressed, "#sync-confirm")
    def confirm(self) -> None:
        sel = self._get_selection()
        if sel:
            self.dismiss(sel)

    @on(Button.Pressed, "#sync-cancel")
    def cancel(self) -> None:
        self.dismiss(None)


PortDiffResult = tuple[list[FileChange], list[str], list[str]]


class SyncDiffScreen(ModalScreen[bool]):
    """Modal screen showing the computed diff per port with confirm/cancel."""

    CSS = """
    SyncDiffScreen {
        align: center middle;
    }
    #diff-dialog {
        width: 80;
        height: 90%;
        max-height: 40;
        border: thick $accent;
        padding: 1 2;
        background: $surface;
    }
    #diff-log {
        height: 1fr;
        border: round $secondary;
        padding: 0 1;
    }
    #diff-buttons {
        dock: bottom;
        height: auto;
        margin-top: 1;
    }
    #diff-sync-btn {
        width: 1fr;
    }
    #diff-cancel-btn {
        width: 1fr;
    }
    """

    ACTION_STYLES = {
        FileAction.ADD: ("[green]+ ", "[/]"),
        FileAction.MODIFY: ("[yellow]~ ", "[/]"),
        FileAction.DELETE: ("[red]- ", "[/]"),
        FileAction.UNCHANGED: ("[dim]  ", "[/]"),
    }

    def __init__(
        self,
        port_diffs: dict[str, PortDiffResult],
        profile: DeployProfile,
    ) -> None:
        super().__init__()
        self.port_diffs = port_diffs
        self.profile = profile

    def compose(self) -> ComposeResult:
        has_work = any(
            any(c.action in (FileAction.ADD, FileAction.MODIFY, FileAction.DELETE) for c in changes)
            for changes, _, _ in self.port_diffs.values()
        )

        with Vertical(id="diff-dialog"):
            yield Label(f"Profile [bold]{self.profile.name}[/]")
            yield RichLog(markup=True, wrap=True, auto_scroll=False, id="diff-log")
            with Horizontal(id="diff-buttons"):
                yield Button(
                    "Sync" if has_work else "Nothing to sync",
                    id="diff-sync-btn",
                    variant="success" if has_work else "default",
                    disabled=not has_work,
                )
                yield Button("Cancel", id="diff-cancel-btn")

    def on_mount(self) -> None:
        log = self.query_one("#diff-log", RichLog)

        for port, (changes, excluded, preserved) in self.port_diffs.items():
            adds = sum(1 for c in changes if c.action is FileAction.ADD)
            mods = sum(1 for c in changes if c.action is FileAction.MODIFY)
            dels = sum(1 for c in changes if c.action is FileAction.DELETE)
            unch = sum(1 for c in changes if c.action is FileAction.UNCHANGED)
            log.write(
                f"[bold]── {port} ──[/]  "
                f"[green]+{adds}[/] "
                f"[yellow]~{mods}[/] "
                f"[red]-{dels}[/] "
                f"[dim]={unch}[/] "
                f"[dim]x{len(excluded)}[/] "
                f"[cyan]p{len(preserved)}[/]"
            )
            for change in changes:
                if change.action is FileAction.UNCHANGED:
                    continue
                pre, post = self.ACTION_STYLES[change.action]
                log.write(f"  {pre}{change.remote_path}{post}")
            for path in excluded:
                log.write(f"  [dim]x {path} (excluded)[/]")
            for path in preserved:
                log.write(f"  [cyan]p {path} (preserved)[/]")
            if not adds and not mods and not dels and not excluded and not preserved:
                log.write("  [dim]No differences found.[/]")

        try:
            self.query_one("#diff-sync-btn", Button).focus()
        except Exception:
            pass

    @on(Button.Pressed, "#diff-sync-btn")
    def do_sync(self) -> None:
        self.dismiss(True)

    @on(Button.Pressed, "#diff-cancel-btn")
    def do_cancel(self) -> None:
        self.dismiss(False)


class SerialMonitorApp(App):
    """Multi-device serial monitor with split-pane TUI."""

    TITLE = "Pico Serial Monitor"

    CSS = """
    Screen {
        layout: vertical;
    }
    SerialPane {
        height: 1fr;
        border: round $secondary;
        padding: 0 1;
    }
    SerialPane:focus-within {
        border: heavy $accent;
    }
    SerialPane RichLog {
        height: 1fr;
        scrollbar-size: 1 1;
    }
    SerialPane Input {
        dock: bottom;
    }
    """

    BINDINGS = [
        Binding("ctrl+c", "send_ctrl_c", "Interrupt", priority=True),
        Binding("ctrl+d", "send_ctrl_d", "Soft reboot", priority=True),
        ("ctrl+k", "clear_panes", "Clear all"),
        ("ctrl+n", "focus_next_pane", "Next pane"),
        ("ctrl+p", "focus_prev_pane", "Prev pane"),
        ("ctrl+s", "sync", "Sync files"),
        ("ctrl+q", "quit", "Quit"),
    ]

    def compose(self) -> ComposeResult:
        yield Header()
        yield Footer()

    def _get_focused_pane(self) -> SerialPane | None:
        """Return the SerialPane that currently contains focus, if any."""
        node = self.focused
        while node is not None:
            if isinstance(node, SerialPane):
                return node
            node = node.parent
        return None

    def action_send_ctrl_c(self) -> None:
        pane = self._get_focused_pane()
        if pane:
            pane.send_control_char(b"\x03", "Ctrl+C (interrupt)")
        else:
            self.exit()

    def action_send_ctrl_d(self) -> None:
        pane = self._get_focused_pane()
        if pane:
            pane.send_control_char(b"\x04", "Ctrl+D (soft reboot)")

    def action_clear_panes(self) -> None:
        for pane in self.query(SerialPane):
            pane.query_one(RichLog).clear()

    def _get_pane_inputs(self) -> list[Input]:
        return [pane.query_one(Input) for pane in self.query(SerialPane)]

    def action_focus_next_pane(self) -> None:
        inputs = self._get_pane_inputs()
        if not inputs:
            return
        try:
            idx = inputs.index(self.focused)
            inputs[(idx + 1) % len(inputs)].focus()
        except (ValueError, TypeError):
            inputs[0].focus()

    def action_focus_prev_pane(self) -> None:
        inputs = self._get_pane_inputs()
        if not inputs:
            return
        try:
            idx = inputs.index(self.focused)
            inputs[(idx - 1) % len(inputs)].focus()
        except (ValueError, TypeError):
            inputs[-1].focus()

    def on_mount(self) -> None:
        self.push_screen(PortSelectionScreen(), self._on_ports_selected)

    def _on_ports_selected(self, ports: list[str]) -> None:
        if not ports:
            self.exit()
            return
        footer = self.query_one(Footer)
        for port in ports:
            self.mount(SerialPane(port), before=footer)
        self.set_timer(0.1, self._focus_first_input)

    def _focus_first_input(self) -> None:
        inputs = self._get_pane_inputs()
        if inputs:
            inputs[0].focus()

    # ── Sync flow ──────────────────────────────────────────────────

    def action_sync(self) -> None:
        pane = self._get_focused_pane()
        if not pane:
            self.notify("Focus a serial pane first", severity="warning")
            return
        all_ports = [p.port_name for p in self.query(SerialPane)]
        self.push_screen(
            SyncProfileScreen(all_ports, pane.port_name),
            self._on_profile_selected,
        )

    def _panes_for_ports(self, ports: list[str]) -> list[SerialPane]:
        return [p for p in self.query(SerialPane) if p.port_name in ports]

    def _disconnect_pane(self, pane: SerialPane) -> None:
        pane.workers.cancel_group(pane, "serial")
        pane.cleanup()
        pane.border_subtitle = "sync…"

    def _reconnect_pane(self, pane: SerialPane) -> None:
        pane.connect_serial()

    def _on_profile_selected(
        self, result: tuple[str, list[str]] | None
    ) -> None:
        if result is None:
            return
        profile_name, ports = result
        self._sync_profile_name = profile_name
        self._sync_ports = ports
        self._sync_panes = self._panes_for_ports(ports)
        for pane in self._sync_panes:
            self._disconnect_pane(pane)
        self._run_diff(profile_name)

    @work(thread=True, exclusive=True, group="sync")
    def _run_diff(self, profile_name: str) -> None:
        first_pane = self._sync_panes[0]
        log = first_pane.query_one(RichLog)
        try:
            profiles = load_profiles()
            profile = profiles[profile_name]
            port_diffs: dict[str, PortDiffResult] = {}
            for port in self._sync_ports:
                self.app.call_from_thread(
                    log.write, f"[dim]Computing diff on {port}…[/]"
                )
                port_diffs[port] = compute_diff(profile, port)
            self.app.call_from_thread(
                self.push_screen,
                SyncDiffScreen(port_diffs, profile),
                self._on_diff_confirmed,
            )
        except Exception as exc:
            self.app.call_from_thread(
                log.write, f"[red]Diff failed: {exc}[/]"
            )
            for p in self._sync_panes:
                self.app.call_from_thread(self._reconnect_pane, p)

    def _on_diff_confirmed(self, confirmed: bool) -> None:
        if not confirmed:
            for p in self._sync_panes:
                self._reconnect_pane(p)
            return
        self._run_sync()

    @work(thread=True, exclusive=True, group="sync")
    def _run_sync(self) -> None:
        profiles = load_profiles()
        profile = profiles[self._sync_profile_name]

        for pane in self._sync_panes:
            port = pane.port_name
            log = pane.query_one(RichLog)
            try:
                self.app.call_from_thread(
                    log.write, f"[dim]Syncing '{profile.name}' to {port}…[/]"
                )
                changes, _, _ = compute_diff(profile, port)

                def on_progress(
                    idx: int, total: int, change: FileChange, _log=log
                ) -> None:
                    symbol = {
                        FileAction.ADD: "[green]+[/]",
                        FileAction.MODIFY: "[yellow]~[/]",
                        FileAction.DELETE: "[red]-[/]",
                    }.get(change.action, " ")
                    self.app.call_from_thread(
                        _log.write,
                        f"[dim]({idx + 1}/{total})[/] {symbol} {change.remote_path}",
                    )

                execute_sync(changes, port, profile, on_progress=on_progress)
                self.app.call_from_thread(
                    log.write, f"[green bold]Sync complete on {port}.[/]"
                )
            except Exception as exc:
                self.app.call_from_thread(
                    log.write, f"[red]Sync failed on {port}: {exc}[/]"
                )
            finally:
                self.app.call_from_thread(self._reconnect_pane, pane)

    # ── Quit ─────────────────────────────────────────────────────

    def action_quit(self) -> None:
        for pane in self.query(SerialPane):
            pane.cleanup()
        self.exit()


if __name__ == "__main__":
    app = SerialMonitorApp()
    app.run()
