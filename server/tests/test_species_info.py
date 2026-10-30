import httpx
import pytest

from app.config import Settings
from app.main import create_app
from app.services.species_info import SpeciesInfoService
from app.worker.queue import SyncQueue
from fastapi.testclient import TestClient


def fake_transport(calls: list[str], fail: bool = False):
    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request.url.host)
        if fail:
            return httpx.Response(503)
        if request.url.host == "api.inaturalist.org":
            return httpx.Response(
                200,
                json={
                    "results": [
                        {
                            "preferred_common_name": "Eurasian Blackbird",
                            "wikipedia_url": "https://en.wikipedia.org/wiki/Common_blackbird",
                            "default_photo": {"medium_url": "https://img/blackbird.jpg", "attribution": "(c) someone"},
                        }
                    ]
                },
            )
        if request.url.host == "en.wikipedia.org":
            return httpx.Response(200, json={"extract": "A true thrush."})
        if request.url.host == "xeno-canto.org":
            return httpx.Response(
                200, json={"recordings": [{"id": "123", "file": "//xeno-canto.org/123/download", "rec": "Jo", "lic": "//cc"}]}
            )
        return httpx.Response(404)

    return httpx.MockTransport(handler)


@pytest.fixture
def make_client(tmp_path):
    def _make(fail=False, key=None):
        calls: list[str] = []
        settings = Settings(data_dir=tmp_path, classifier="mock", xeno_canto_api_key=key)
        service = SpeciesInfoService(settings, client=httpx.Client(transport=fake_transport(calls, fail)))
        app = create_app(settings=settings, queue_factory=SyncQueue, species_info=service)
        return TestClient(app), calls

    return _make


def test_species_info_is_fetched_and_cached(make_client):
    client, calls = make_client(key="k")
    with client:
        body = client.get("/species/Turdus merula").json()
        assert body["photo_url"] == "https://img/blackbird.jpg"
        assert body["summary"] == "A true thrush."
        assert body["common_name"] == "Eurasian Blackbird"
        assert body["call_url"] == "https://xeno-canto.org/123/download"
        n = len(calls)
        client.get("/species/Turdus merula")
        assert len(calls) == n, "second request should be served from cache"


def test_species_info_degrades_gracefully(make_client):
    client, calls = make_client(fail=True)
    with client:
        body = client.get("/species/Turdus merula", params={"common_name": "Blackbird"}).json()
        assert body["photo_url"] is None
        assert body["common_name"] == "Blackbird"
        assert "xeno-canto.org" in body["call_page_url"]
        assert body["complete"] is False
        client.get("/species/Turdus merula")
        assert len(calls) > 2, "incomplete results are retried"
