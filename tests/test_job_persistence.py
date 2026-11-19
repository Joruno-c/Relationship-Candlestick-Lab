import json
import pytest
from fastapi.testclient import TestClient

from relationship_candlestick import job_store, server


@pytest.fixture
def isolated_jobs(tmp_path, monkeypatch):
    work_dir = tmp_path / "output" / "_jobs"
    work_dir.mkdir(parents=True)
    monkeypatch.setattr(server, "WORK_DIR", work_dir)
    monkeypatch.setattr(server, "JOBS", {})
    return work_dir


def write_scores(path, *, compact=False):
    path.parent.mkdir(parents=True, exist_ok=True)
    messages = [
        {"i": 0, "timestamp": "2026-11-01T12:00:00+08:00", "sender": "成员A", "message": "我来整理资料。"},
        {"i": 1, "timestamp": "2026-11-01T12:00:00+08:00", "sender": "成员B", "message": "我帮你核对。"},
        {"i": 2, "timestamp": "2026-11-02T13:21:00+08:00", "sender": "成员A", "message": "谢谢，已经完成。"},
    ]
    scores = [
        {"i": i, "delta_vs_prior": delta, "delta_vs_atmosphere": delta,
         "primary_dim": "互助支持", "tags": ["help"], "rationale": "协作语义"}
        for i, delta in enumerate([0.3, 0.5, 0.2])
    ]
    if not compact:
        scores = [dict(message, **score) for message, score in zip(messages, scores)]
    path.write_text("".join(json.dumps(row, ensure_ascii=False) + "\n" for row in scores), encoding="utf-8")
    if compact:
        path.with_name("messages.jsonl").write_text(
            "".join(json.dumps(row, ensure_ascii=False) + "\n" for row in messages), encoding="utf-8")
    return path


def chart_responses(client, jid):
    routes = ["events"]
    routes += [f"ohlc?tf={tf}" for tf in server.ALL_TIMEFRAMES]
    routes += ["indicators?tf=1d&spec=ma:2;bb:2,2;macd;rsi:2;kdj"]
    result = {}
    for route in routes:
        response = client.get(f"/api/jobs/{jid}/{route}")
        assert response.status_code == 200
        result[route] = response.json()
    return result


def test_ingest_survives_restart_and_source_removal(isolated_jobs):
    source = write_scores(isolated_jobs.parent / "source" / "scored.jsonl", compact=True)
    with TestClient(server.app) as client:
        response = client.post("/api/ingest", json={"scored_path": str(source), "initial_index": 61})
        job = response.json()
        assert job["status"] == "done", job
        jid = job["id"]
        before = chart_responses(client, jid)
        assert before["events"][0]["index"] == 61.3
        assert job["params"]["initial_index"] == 61
    source.unlink()
    source.with_name("messages.jsonl").unlink()
    server.JOBS.clear()  # Process memory is lost on restart.
    with TestClient(server.app) as client:
        restored = client.get(f"/api/jobs/{jid}").json()
        assert restored["total"] == restored["scored"] == 3
        assert restored["params"]["initial_index"] == 61
        assert chart_responses(client, jid) == before


def test_legacy_web_job_migrates_original_id_once(isolated_jobs):
    source = write_scores(isolated_jobs.parent / "旧导出" / "scored.jsonl")
    jid = "8dbf1222cda2"
    manifest = source.with_name("web-job.json")
    manifest.write_text(json.dumps({"id": jid, "status": "done", "stage": "done",
                                    "total": 3, "scored": 3, "params": {"scorer": "ingest"}}), encoding="utf-8")
    result = server.restore_completed_jobs()
    assert result == {"restored": [], "migrated": [jid], "failed": []}
    assert server.JOBS[jid].total == 3
    assert (isolated_jobs / jid / job_store.SNAPSHOT_NAME).is_file()
    before = server.get_events(jid)
    manifest.unlink()
    source.unlink()
    server.JOBS.clear()
    result = server.restore_completed_jobs()
    assert result == {"restored": [jid], "migrated": [], "failed": []}
    assert server.get_events(jid) == before


def test_bad_snapshot_or_incomplete_checkpoint_does_not_block_good_result(isolated_jobs):
    good = write_scores(isolated_jobs.parent / "good" / "scored.jsonl")
    response = server.ingest_scored(server.IngestRequest(scored_path=str(good)))
    jid = response["id"]
    broken = isolated_jobs / "111111111111"
    broken.mkdir()
    (broken / job_store.SNAPSHOT_NAME).write_text('{"version":', encoding="utf-8")
    write_scores(isolated_jobs / "222222222222" / "scored.jsonl")
    legacy = write_scores(isolated_jobs.parent / "incomplete" / "scored.jsonl")
    legacy.with_name("web-job.json").write_text(json.dumps({
        "id": "333333333333", "status": "done", "stage": "done", "total": 99, "scored": 99,
    }), encoding="utf-8")
    server.JOBS.clear()
    result = server.restore_completed_jobs()
    assert result["restored"] == [jid]
    assert result["migrated"] == []
    assert set(server.JOBS) == {jid}
    assert len(result["failed"]) == 2


def test_snapshot_excludes_credentials_and_failed_write_preserves_previous(isolated_jobs, monkeypatch):
    source = write_scores(isolated_jobs.parent / "good" / "scored.jsonl")
    jid = server.ingest_scored(server.IngestRequest(scored_path=str(source)))["id"]
    job = server.JOBS[jid]
    job.params.update(api_key="SECRET-SENTINEL", base_url="https://user:SECRET-SENTINEL@host",
                      nested={"token": "SECRET-SENTINEL"})
    server._persist_job(job)
    snapshot = job.work_dir / job_store.SNAPSHOT_NAME
    before = snapshot.read_bytes()
    assert b"SECRET-SENTINEL" not in before
    assert b'"api_key"' not in before
    assert b'"scored_path"' not in before
    def fail_replace(*args):
        raise OSError("Simulated interrupted replacement")
    monkeypatch.setattr(job_store.os, "replace", fail_replace)
    with pytest.raises(OSError):
        server._persist_job(job)
    assert snapshot.read_bytes() == before
    assert not list(job.work_dir.glob(".result-*.tmp"))


def test_api_completion_persists_without_request_key(isolated_jobs, monkeypatch):
    from relationship_candlestick import pipeline
    chat = isolated_jobs.parent / "chat.csv"
    chat.write_text("timestamp,sender,message\n2026-11-01 12:00:00,A,hello\n", encoding="utf-8")
    req = server.JobRequest(chat_path=str(chat), api_key="API-SECRET-SENTINEL", initial_index=55)
    job = server.Job("444444444444")
    job.params = req.model_dump(exclude={"api_key"})
    monkeypatch.setattr(pipeline, "run_full_pipeline", lambda **kwargs: write_scores(job.scored_path))
    server._run_job(job, req)
    assert job.status == "done", job.error
    payload = (job.work_dir / job_store.SNAPSHOT_NAME).read_text(encoding="utf-8")
    assert "API-SECRET-SENTINEL" not in payload
    assert job.total == job.scored == 3
    restored = job_store.load_snapshot(job.work_dir / job_store.SNAPSHOT_NAME)
    assert restored["events"].iloc[0]["relationship_index"] == 55.3
