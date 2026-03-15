"""Deploy sync: compare local files against a Pico's filesystem and mirror via mpremote."""

from __future__ import annotations

import hashlib
import os
import shutil
import subprocess
import tomllib
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Callable

COLLAPSE_EXCLUDED_DIRS = True
COLLAPSE_PRESERVED_DIRS = True


class FileAction(Enum):
    ADD = "add"
    MODIFY = "modify"
    DELETE = "delete"
    UNCHANGED = "unchanged"


@dataclass
class DeployProfile:
    name: str
    source: str
    target: str
    exclude: list[str] = field(default_factory=list)
    include: list[str] = field(default_factory=list)
    preserve: list[str] = field(default_factory=list)


@dataclass
class FileChange:
    remote_path: str
    action: FileAction
    local_path: str | None = None


def load_profiles(toml_path: str = "deploy.toml") -> dict[str, DeployProfile]:
    with open(toml_path, "rb") as f:
        data = tomllib.load(f)
    profiles: dict[str, DeployProfile] = {}
    for name, section in data.items():
        profiles[name] = DeployProfile(
            name=name,
            source=section["source"],
            target=section.get("target", "/"),
            exclude=section.get("exclude", []),
            include=section.get("include", []),
            preserve=section.get("preserve", []),
        )
    return profiles


def _matches_pattern(rel_path: str, pattern: str) -> bool:
    """Check if rel_path matches a pattern.

    A pattern can be a bare name (matches any path component) or a
    slash-separated path (matches as an exact prefix or exact path).
    """
    normalized = rel_path.replace("\\", "/")
    if "/" in pattern:
        return normalized == pattern or normalized.startswith(pattern + "/")
    parts = normalized.split("/")
    return pattern in parts


def _is_excluded(rel_path: str, exclude: list[str]) -> bool:
    return any(_matches_pattern(rel_path, p) for p in exclude)


def _is_included(rel_path: str, include: list[str]) -> bool:
    if not include:
        return True
    return any(_matches_pattern(rel_path, p) for p in include)


def _hash_file(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while True:
            chunk = f.read(8192)
            if not chunk:
                break
            h.update(chunk)
    return h.hexdigest()


def scan_local(profile: DeployProfile) -> tuple[dict[str, str], list[str]]:
    """Walk the local source directory for a profile.

    Returns (files, excluded) where files is {relative_path: sha256} and
    excluded is a list of relative paths that matched exclude patterns.
    """
    source = Path(profile.source)
    if not source.is_dir():
        raise FileNotFoundError(f"Source directory not found: {source}")

    files: dict[str, str] = {}
    excluded: list[str] = []

    for root, dirs, filenames in os.walk(source):
        for fname in filenames:
            full = os.path.join(root, fname)
            rel = os.path.relpath(full, source).replace("\\", "/")

            if not _is_included(rel, profile.include):
                continue

            if _is_excluded(rel, profile.exclude):
                excluded.append(rel)
                continue

            files[rel] = _hash_file(full)

        kept = []
        for d in dirs:
            rel_dir = os.path.relpath(os.path.join(root, d), source).replace("\\", "/")
            if not _is_included(rel_dir, profile.include) or _is_excluded(rel_dir, profile.exclude):
                if COLLAPSE_EXCLUDED_DIRS:
                    excluded.append(rel_dir + "/")
                else:
                    for exc_root, _, exc_files in os.walk(os.path.join(root, d)):
                        for ef in exc_files:
                            excluded.append(
                                os.path.relpath(os.path.join(exc_root, ef), source).replace("\\", "/")
                            )
            else:
                kept.append(d)
        dirs[:] = kept

    return files, excluded


_REMOTE_HASH_SCRIPT = r"""
import os, hashlib
def walk(path, prefix=""):
    try:
        entries = os.listdir(path)
    except OSError:
        return
    for name in sorted(entries):
        full = path.rstrip("/") + "/" + name
        try:
            os.listdir(full)
            walk(full, prefix + name + "/")
        except OSError:
            h = hashlib.sha256()
            try:
                with open(full, "rb") as f:
                    while True:
                        chunk = f.read(512)
                        if not chunk:
                            break
                        h.update(chunk)
                print(prefix + name + "|" + "".join("{:02x}".format(b) for b in h.digest()))
            except OSError:
                pass
walk("__TARGET__")
"""


def _mpremote(*args: str, port: str) -> subprocess.CompletedProcess[str]:
    if not shutil.which("mpremote"):
        raise RuntimeError(
            "mpremote is not installed. Install it with: pip install mpremote"
        )
    cmd = ["mpremote", "connect", port, *args]
    return subprocess.run(cmd, capture_output=True, text=True, timeout=120)


def scan_remote(port: str, target: str) -> dict[str, str]:
    """List files on the Pico at *target* with their SHA-256 hashes."""
    script = _REMOTE_HASH_SCRIPT.replace("__TARGET__", target)
    result = _mpremote("exec", script, port=port)
    if result.returncode != 0:
        stderr = result.stderr.strip()
        raise RuntimeError(f"mpremote exec failed: {stderr}")

    files: dict[str, str] = {}
    for line in result.stdout.splitlines():
        line = line.strip()
        if "|" not in line:
            continue
        rel_path, hash_hex = line.rsplit("|", 1)
        files[rel_path] = hash_hex
    return files


def compute_diff(
    profile: DeployProfile, port: str
) -> tuple[list[FileChange], list[str], list[str]]:
    """Compare local source against the Pico and return (changes, excluded, preserved)."""
    local_files, excluded = scan_local(profile)
    remote_files = scan_remote(port, profile.target)

    changes: list[FileChange] = []
    source = Path(profile.source)
    target = profile.target.rstrip("/")

    for rel, local_hash in sorted(local_files.items()):
        remote_path = f"{target}/{rel}" if target != "/" else f"/{rel}"
        local_path = str(source / rel)

        if rel not in remote_files:
            changes.append(FileChange(remote_path, FileAction.ADD, local_path))
        elif remote_files[rel] != local_hash:
            changes.append(FileChange(remote_path, FileAction.MODIFY, local_path))
        else:
            changes.append(FileChange(remote_path, FileAction.UNCHANGED, local_path))

    preserved: list[str] = []
    seen_preserved_dirs: set[str] = set()
    for rel in sorted(remote_files):
        if rel not in local_files:
            if _is_excluded(rel, profile.preserve):
                if COLLAPSE_PRESERVED_DIRS:
                    matched = next(
                        (p for p in profile.preserve
                         if _matches_pattern(rel, p) and "/" not in p and rel != p),
                        None,
                    )
                    if matched and matched not in seen_preserved_dirs:
                        seen_preserved_dirs.add(matched)
                        preserved.append(matched + "/")
                    elif not matched:
                        preserved.append(rel)
                else:
                    preserved.append(rel)
            else:
                remote_path = f"{target}/{rel}" if target != "/" else f"/{rel}"
                changes.append(FileChange(remote_path, FileAction.DELETE))

    return changes, excluded, preserved


def _ensure_remote_dirs(port: str, remote_path: str) -> None:
    """Create parent directories on the Pico for *remote_path* if needed."""
    parts = remote_path.strip("/").split("/")
    for i in range(1, len(parts)):
        dir_path = "/" + "/".join(parts[:i])
        _mpremote("fs", "mkdir", f":{dir_path}", port=port)


def _remove_empty_remote_dirs(port: str, remote_path: str, target: str) -> None:
    """Try to remove empty parent directories up to *target* after a deletion."""
    parts = remote_path.strip("/").split("/")
    target_depth = len(target.strip("/").split("/")) if target != "/" else 0
    for i in range(len(parts) - 1, target_depth, -1):
        dir_path = "/" + "/".join(parts[:i])
        result = _mpremote("fs", "rmdir", f":{dir_path}", port=port)
        if result.returncode != 0:
            break


def execute_sync(
    changes: list[FileChange],
    port: str,
    profile: DeployProfile,
    on_progress: Callable[[int, int, FileChange], None] | None = None,
) -> None:
    """Apply the computed changes to the Pico via mpremote."""
    actionable = [c for c in changes if c.action is not FileAction.UNCHANGED]
    total = len(actionable)

    for idx, change in enumerate(actionable):
        if on_progress:
            on_progress(idx, total, change)

        if change.action in (FileAction.ADD, FileAction.MODIFY):
            _ensure_remote_dirs(port, change.remote_path)
            result = _mpremote(
                "fs", "cp", change.local_path, f":{change.remote_path}", port=port
            )
            if result.returncode != 0:
                raise RuntimeError(
                    f"Failed to copy {change.local_path} -> {change.remote_path}: "
                    f"{result.stderr.strip()}"
                )

        elif change.action is FileAction.DELETE:
            result = _mpremote("fs", "rm", f":{change.remote_path}", port=port)
            if result.returncode != 0:
                raise RuntimeError(
                    f"Failed to delete {change.remote_path}: {result.stderr.strip()}"
                )
            _remove_empty_remote_dirs(port, change.remote_path, profile.target)

    if on_progress and total > 0:
        on_progress(total, total, actionable[-1])
