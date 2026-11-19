"""The public group example works without keys and survives a service restart."""
import json
from pathlib import Path

from fastapi.testclient import TestClient

from relationship_candlestick import server


def test_group_demo_round_trip_and_restart(tmp_path, monkeypatch):
    monkeypatch.setattr(server, "WORK_DIR", tmp_path / "output" / "_jobs")
    monkeypatch.setattr(server, "JOBS", {})
    manifest = json.loads((Path(__file__).resolve().parents[1] / "examples/group_chat/manifest.json").read_text(encoding="utf-8"))
    with TestClient(server.app) as client:
        response = client.post("/api/demo/group")
        assert response.status_code == 200
        job = response.json()
        assert job["status"] == "done", job
        assert job["scored"] == job["total"] == 1497
        jid = job["id"]
        events = client.get(f"/api/jobs/{jid}/events").json()
        assert len(events) == 1497
        assert events[-1]["index"] == 83.4186
        assert {e["sender"] for e in events} == set(manifest["participant_counts"])
        assert all("omitted" in e["message"] and "omitted" in e["rationale"] for e in events)
        candles = {}
        for timeframe, expected_count in manifest["bars_per_timeframe"].items():
            response = client.get(f"/api/jobs/{jid}/ohlc", params={"tf": timeframe})
            assert response.status_code == 200
            candles[timeframe] = response.json()
            assert len(candles[timeframe]) == expected_count
            assert sum(bar["msg_count"] for bar in candles[timeframe]) == 1497
        indicators = client.get(f"/api/jobs/{jid}/indicators", params={"tf": "1d", "spec": "ma:5,10;bb:20,2;macd;rsi:14;kdj"})
        assert indicators.status_code == 200
        assert indicators.json()
    server.JOBS.clear()
    with TestClient(server.app) as client:
        assert client.get(f"/api/jobs/{jid}").json()["status"] == "done"
        assert client.get(f"/api/jobs/{jid}/events").json() == events
        for timeframe, before in candles.items():
            assert client.get(f"/api/jobs/{jid}/ohlc", params={"tf": timeframe}).json() == before
