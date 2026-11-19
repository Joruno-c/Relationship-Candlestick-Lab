"""Replay numerical annotations from our anonymized course-project group.

This checks parsing, scoring recurrence and OHLC; it does not evaluate a model's
interpretation of private text. Expected values come from the saved source run.
"""
import hashlib
import json
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from relationship_candlestick.ai_scorer import load_scored_jsonl, write_messages_jsonl
from relationship_candlestick.ohlc import aggregate_ohlc
from relationship_candlestick.parser import parse
from relationship_candlestick.utils import ALL_TIMEFRAMES, load_config

FIXTURE = Path(__file__).resolve().parents[1] / "examples" / "group_chat"
MANIFEST = json.loads((FIXTURE / "manifest.json").read_text(encoding="utf-8"))
EXPECTED_OHLC = json.loads((FIXTURE / "expected_ohlc.json").read_text(encoding="utf-8"))


@pytest.fixture(scope="module")
def scored_group():
    return load_scored_jsonl(FIXTURE / "scored.jsonl")


@pytest.mark.parametrize("filename", ["messages.csv", "messages.jsonl"])
def test_parse_group_formats_and_join_existing_scores(filename, tmp_path):
    parsed = parse(FIXTURE / filename)
    rows = [json.loads(line) for line in (FIXTURE / "scored.jsonl").read_text(encoding="utf-8").splitlines()]
    assert len(parsed) == 1497
    assert parsed["timestamp"].is_monotonic_increasing
    assert parsed["sender"].value_counts().to_dict() == MANIFEST["participant_counts"]
    assert parsed["timestamp"].iloc[0].isoformat() == MANIFEST["first_timestamp"]
    assert parsed["timestamp"].iloc[-1].isoformat() == MANIFEST["last_timestamp"]
    # Same-second group replies must keep source order for score/message joins.
    assert parsed["sender"].tolist() == [row["sender"] for row in rows]
    # Exercise the normal parse -> prepare -> compact-score join path.
    messages = tmp_path / "messages.jsonl"
    write_messages_jsonl(parsed, messages)
    compact = tmp_path / "scores.jsonl"
    keys = ("i", "delta_vs_prior", "delta_vs_atmosphere", "primary_dim", "tags", "rationale")
    compact.write_text("".join(json.dumps({key: row[key] for key in keys}) + "\n" for row in rows), encoding="utf-8")
    scored = load_scored_jsonl(compact, messages_path=messages)
    expected = pd.read_csv(FIXTURE / "expected_index.csv")
    np.testing.assert_allclose(scored["relationship_index"], expected["relationship_index"], rtol=0, atol=0.00005)


def test_full_group_index_matches_saved_source_run(scored_group):
    expected = pd.read_csv(FIXTURE / "expected_index.csv")
    np.testing.assert_allclose(scored_group["relationship_index"], expected["relationship_index"], rtol=0, atol=0.00005)
    assert len(scored_group) == 1497
    assert scored_group["relationship_index"].iloc[-1] == 83.4186
    assert scored_group["relationship_index"].min() == 50.0
    assert scored_group["relationship_index"].max() == 83.4364
    assert scored_group["raw_delta"].sum() == pytest.approx(146.5)


@pytest.mark.parametrize("timeframe", ALL_TIMEFRAMES)
def test_every_group_candle_matches_saved_source_run(scored_group, timeframe):
    actual = aggregate_ohlc(scored_group, timeframe, load_config(None))
    expected = pd.DataFrame(EXPECTED_OHLC[timeframe])
    assert len(actual) == MANIFEST["bars_per_timeframe"][timeframe]
    assert int(actual["message_count"].sum()) == 1497
    assert list(actual["period_start"]) == list(pd.to_datetime(expected["period_start"]))
    for field in ("open", "high", "low", "close"):
        np.testing.assert_allclose(actual[field], expected[field], rtol=0, atol=0.00005)
    assert actual["message_count"].tolist() == expected["message_count"].tolist()
    assert (actual["high"] >= actual[["open", "close"]].max(axis=1)).all()
    assert (actual["low"] <= actual[["open", "close"]].min(axis=1)).all()


def test_public_fixture_contains_only_allowlisted_fields_and_placeholders():
    allowed_keys = {"i", "timestamp", "sender", "message", "record_kind", "delta_vs_prior",
                    "delta_vs_atmosphere", "primary_dim", "tags", "rationale"}
    placeholders = {"text": "[Text omitted for public regression fixture]",
                    "media": "[Media metadata omitted for public regression fixture]",
                    "system": "[System notice omitted for public regression fixture]"}
    dimensions = {"engagement", "coordination", "unassessed_media", "support", "investment",
                  "shared_identity", "system", "repair"}
    rows = [json.loads(line) for line in (FIXTURE / "scored.jsonl").read_text(encoding="utf-8").splitlines()]
    assert [row["i"] for row in rows] == list(range(1, 1498))
    for row in rows:
        assert set(row) == allowed_keys
        assert row["sender"] in {"System", "Member 01", "Member 02", "Member 03", "Member 04", "Member 05"}
        assert row["primary_dim"] in dimensions
        assert row["message"] == placeholders[row["record_kind"]]
        assert row["rationale"] == "Original rationale omitted; retained numerical annotation only."
        assert row["tags"] == [row["record_kind"]]
    for name, digest in MANIFEST["sha256"].items():
        assert hashlib.sha256((FIXTURE / name).read_bytes()).hexdigest() == digest
