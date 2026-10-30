import pytest

DEVICE = "device-aaaa-1111"
OTHER = "device-bbbb-2222"


@pytest.fixture
def job(client, wav_bytes):
    job_id = client.post(
        "/analyses",
        files={"audio": ("clip.wav", wav_bytes)},
        data={"lat": "51.501234", "lon": "-0.141234", "device_id": DEVICE},
    ).json()["id"]
    return client.get(f"/analyses/{job_id}").json()


def save(client, job, **kw):
    body = {"job_id": job["id"], "scientific_name": job["result"]["species"][0]["scientific_name"], "device_id": DEVICE}
    body.update(kw)
    return client.post("/sightings", json=body)


def test_save_sighting_uses_analysis_data(client, job):
    r = save(client, job, note="On the feeder")
    assert r.status_code == 201, r.text
    s = r.json()
    top = job["result"]["species"][0]
    assert s["common_name"] == top["common_name"]
    assert s["confidence"] == top["confidence"]
    assert (s["lat"], s["lon"]) == (51.501234, -0.141234)
    assert s["is_mine"] is True


def test_saving_twice_updates(client, job):
    a = save(client, job).json()
    b = save(client, job, note="edited").json()
    assert a["id"] == b["id"] and b["note"] == "edited"


def test_cannot_save_unidentified_species_or_others_job(client, job):
    assert save(client, job, scientific_name="Made up").status_code == 422
    assert save(client, job, device_id=OTHER).status_code == 403


def test_others_see_rounded_coordinates_and_no_job(client, job):
    save(client, job)
    mine = client.get("/sightings", headers={"X-Device-Id": DEVICE}).json()[0]
    theirs = client.get("/sightings", headers={"X-Device-Id": OTHER}).json()[0]
    assert mine["lat"] == 51.501234 and mine["job_id"]
    assert theirs["lat"] == 51.5 and theirs["lon"] == -0.14 and theirs["job_id"] is None
    assert theirs["is_mine"] is False


def test_private_sightings_hidden_from_others(client, job):
    save(client, job, is_public=False)
    assert client.get("/sightings", headers={"X-Device-Id": OTHER}).json() == []
    assert len(client.get("/sightings", headers={"X-Device-Id": DEVICE}).json()) == 1


def test_bbox_and_mine_filters(client, job):
    save(client, job)
    assert len(client.get("/sightings", params={"bbox": "-1,51,0,52"}).json()) == 1
    assert client.get("/sightings", params={"bbox": "10,40,11,41"}).json() == []
    assert client.get("/sightings", params={"bbox": "1,2,3"}).status_code == 422
    assert client.get("/sightings", params={"mine": True}, headers={"X-Device-Id": OTHER}).json() == []


def test_geojson(client, job):
    save(client, job)
    fc = client.get("/sightings/geojson").json()
    assert fc["type"] == "FeatureCollection"
    f = fc["features"][0]
    assert f["geometry"]["coordinates"] == [-0.14, 51.5]
    assert f["properties"]["common_name"]


def test_delete_own_only(client, job):
    sid = save(client, job).json()["id"]
    assert client.delete(f"/sightings/{sid}", headers={"X-Device-Id": OTHER}).status_code == 403
    assert client.delete(f"/sightings/{sid}", headers={"X-Device-Id": DEVICE}).status_code == 204
    assert client.get("/sightings").json() == []
