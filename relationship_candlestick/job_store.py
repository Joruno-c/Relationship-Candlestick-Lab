"""Durable local snapshots of completed chart results (never model credentials).

Persist the calculated values, rather than recalculating on every startup, so
existing chart links keep showing the same result after a restart or source move.
"""
from __future__ import annotations

import json
import os
import re
import tempfile
from pathlib import Path

import pandas as pd

from .utils import ALL_TIMEFRAMES


SNAPSHOT_NAME = "result.json"
_ID = re.compile(r"[0-9a-f]{12}\Z")
_PARAMS = {"scorer", "calendar_mode", "initial_index"}


def valid_job_id(jid: object) -> bool:
    return isinstance(jid, str) and _ID.fullmatch(jid) is not None


def _pack_frame(frame: pd.DataFrame, date_columns: tuple[str, ...]) -> dict:
    copy = frame.copy()
    for column in date_columns:
        if column in copy:
            # Preserve the original timezone and sub-second timestamps.
            copy[column] = copy[column].map(lambda value: pd.Timestamp(value).isoformat())
    # Convert missing optional columns to null and numpy scalars to Python
    # values. json.dump retains full float precision (DataFrame.to_json rounds).
    copy = copy.astype(object).where(copy.notna(), None)
    return copy.to_dict(orient="split", index=False)


def _unpack_frame(data: dict, date_columns: tuple[str, ...]) -> pd.DataFrame:
    frame = pd.DataFrame(data["data"], columns=data["columns"])
    for column in date_columns:
        if column in frame:
            frame[column] = pd.to_datetime(frame[column])
    return frame


def save_snapshot(work_dir: Path, jid: str, params: dict,
                  events: pd.DataFrame, ohlc: dict[str, pd.DataFrame]) -> None:
    if not valid_job_id(jid) or events.empty or set(ohlc) != set(ALL_TIMEFRAMES):
        raise ValueError("Only complete chart results can be saved")
    payload = {
        "version": 1,
        "id": jid,
        "status": "done",
        "total": len(events),
        # Explicit allowlist: request objects, API keys, URLs and raw source
        # paths must never leak into the persistence metadata.
        "params": {key: params[key] for key in _PARAMS if key in params},
        "events": _pack_frame(events, ("timestamp",)),
        "ohlc": {tf: _pack_frame(frame, ("period_start", "period_end"))
                 for tf, frame in ohlc.items()},
    }
    work_dir.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=work_dir,
                                         prefix=".result-", suffix=".tmp", delete=False) as stream:
            temporary = Path(stream.name)
            json.dump(payload, stream, ensure_ascii=False, allow_nan=False, separators=(",", ":"))
            stream.flush()
            os.fsync(stream.fileno())
        # One atomic replacement makes a failed/interrupted write leave the
        # previously completed result intact.
        os.replace(temporary, work_dir / SNAPSHOT_NAME)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


def load_snapshot(path: Path) -> dict:
    payload = json.loads(path.read_text(encoding="utf-8"))
    jid = payload.get("id")
    if (payload.get("version") != 1 or payload.get("status") != "done"
            or not valid_job_id(jid) or path.parent.name != jid):
        raise ValueError("Invalid completed-job snapshot")
    events = _unpack_frame(payload["events"], ("timestamp",))
    ohlc = {tf: _unpack_frame(frame, ("period_start", "period_end"))
            for tf, frame in payload["ohlc"].items()}
    if (events.empty or len(events) != payload["total"]
            or set(ohlc) != set(ALL_TIMEFRAMES)
            or not {"timestamp", "sender", "message", "relationship_index"}.issubset(events.columns)
            or any(frame.empty or not {"period_start", "open", "high", "low", "close"}.issubset(frame.columns)
                   for frame in ohlc.values())):
        raise ValueError("Incomplete completed-job snapshot")
    return {
        "id": jid,
        "params": {key: payload["params"][key] for key in _PARAMS if key in payload["params"]},
        "events": events,
        "ohlc": ohlc,
    }
