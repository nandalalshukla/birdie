from datetime import datetime, timedelta, timezone

import pytest

from app.db import session_scope
from app.models import Sighting
from app.services.geo import bbox_around, haversine_km

LONDON = (51.5074, -0.1278)
OXFORD = (51.7520, -1.2577)  # ~80 km from London
NYC = (40.7128, -74.0060)


def add(n, at, species=("Turdus merula", "Eurasian Blackbird"), device="d1", public=True, offset=0):
    now = datetime.now(timezone.utc)
    with session_scope() as s:
        for i in range(n):
            s.add(
                Sighting(
                    device_id=device, scientific_name=species[0], common_name=species[1], confidence=0.8,
                    lat=at[0], lon=at[1], observed_at=now - timedelta(hours=i + offset),
                    created_at=now - timedelta(minutes=i + offset), is_public=public,
                )
            )


def test_geo_helpers():
    assert haversine_km(*LONDON, *OXFORD) == pytest.approx(83, abs=3)
    min_lon, min_lat, max_lon, max_lat = bbox_around(*LONDON, 50)
    assert min_lat < LONDON[0] < max_lat and min_lon < LONDON[1] < max_lon
    # crossing the antimeridian wraps
    assert bbox_around(0, 179.9, 50)[0] > bbox_around(0, 179.9, 50)[2]


def test_feed_paginates_newest_first(client):
    add(25, LONDON)
    add(1, LONDON, public=False, offset=100)
    page1 = client.get("/feed", params={"limit": 10}).json()
    assert len(page1["items"]) == 10 and page1["next_cursor"]
    times = [i["created_at"] for i in page1["items"]]
    assert times == sorted(times, reverse=True)

    seen = {i["id"] for i in page1["items"]}
    cursor = page1["next_cursor"]
    while cursor:
        page = client.get("/feed", params={"limit": 10, "cursor": cursor}).json()
        ids = {i["id"] for i in page["items"]}
        assert not ids & seen
        seen |= ids
        cursor = page["next_cursor"]
    assert len(seen) == 25, "private sighting excluded, nothing duplicated or skipped"


def test_feed_nearby_filters_by_radius(client):
    add(3, LONDON)
    add(2, OXFORD, species=("Erithacus rubecula", "European Robin"))
    add(4, NYC, species=("Cardinalis cardinalis", "Northern Cardinal"))
    near = client.get("/feed", params={"lat": LONDON[0], "lon": LONDON[1], "radius_km": 50}).json()["items"]
    assert {i["common_name"] for i in near} == {"Eurasian Blackbird"}
    assert all(i["distance_km"] is not None and i["distance_km"] < 1 for i in near)
    wider = client.get("/feed", params={"lat": LONDON[0], "lon": LONDON[1], "radius_km": 150}).json()["items"]
    assert len(wider) == 5


def test_feed_rejects_bad_cursor(client):
    assert client.get("/feed", params={"cursor": "%%%"}).status_code == 422


def test_stats_trending(client):
    add(3, LONDON, device="a")
    add(1, LONDON, species=("Erithacus rubecula", "European Robin"), device="b")
    add(5, NYC, species=("Cardinalis cardinalis", "Northern Cardinal"))
    stats = client.get("/feed/stats", params={"lat": LONDON[0], "lon": LONDON[1]}).json()
    assert stats["sightings"] == 4 and stats["species"] == 2 and stats["observers"] == 2
    assert [t["common_name"] for t in stats["trending"]] == ["Eurasian Blackbird", "European Robin"]
    assert client.get("/feed/stats").json()["trending"][0]["common_name"] == "Northern Cardinal"
