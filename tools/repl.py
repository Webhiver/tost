import serial
import serial.tools.list_ports
from textual.app import App, ComposeResult
from textual.binding import Binding
from textual.containers import Center, Vertical
from textual.screen import ModalScreen
from textual.widgets import Header, Footer, RichLog, Input, SelectionList, Button, Label
from textual.widget import Widget
from textual.worker import get_current_worker
from textual import on, work

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

    def action_quit(self) -> None:
        for pane in self.query(SerialPane):
            pane.cleanup()
        self.exit()


if __name__ == "__main__":
    app = SerialMonitorApp()
    app.run()
