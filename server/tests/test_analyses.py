def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_upload_and_poll(client, wav_bytes):
    r = client.post(
        "/analyses",
        files={"audio": ("clip.wav", wav_bytes, "audio/wav")},
        data={"lat": "51.5", "lon": "-0.12", "device_id": "dev-1"},
    )
    assert r.status_code == 202, r.text
    job_id = r.json()["id"]

    r = client.get(f"/analyses/{job_id}")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "done"
    assert body["lat"] == 51.5


def test_rejects_bad_coordinates(client, wav_bytes):
    r = client.post("/analyses", files={"audio": ("clip.wav", wav_bytes)}, data={"lat": "123"})
    assert r.status_code == 422


def test_missing_job(client):
    assert client.get("/analyses/nope").status_code == 404


def test_upload_too_large(client, settings):
    settings.max_upload_mb = 0
    r = client.post("/analyses", files={"audio": ("clip.wav", b"x" * 10)})
    assert r.status_code == 413
