"""Photo, description and a reference call for a species.

Sources (all free, no auth except xeno-canto v3):
- iNaturalist taxa API: CC-licensed photo with attribution, Wikipedia link
- Wikipedia REST summary: short description
- xeno-canto API v3: a high-quality recording of the species' song/call
"""

import logging
from datetime import datetime, timedelta, timezone
from urllib.parse import quote

import httpx
from sqlalchemy.orm import Session

from app.config import Settings
from app.models import SpeciesInfoCache

log = logging.getLogger(__name__)


def _empty(scientific_name: str, common_name: str | None) -> dict:
    return {
        "scientific_name": scientific_name,
        "common_name": common_name,
        "photo_url": None,
        "photo_attribution": None,
        "summary": None,
        "wikipedia_url": None,
        "call_url": None,
        "call_attribution": None,
        "call_page_url": f"https://xeno-canto.org/explore?query={quote(scientific_name)}",
        "complete": False,
    }


class SpeciesInfoService:
    def __init__(self, settings: Settings, client: httpx.Client | None = None) -> None:
        self.settings = settings
        self.client = client or httpx.Client(
            timeout=settings.species_info_timeout,
            headers={"User-Agent": settings.user_agent},
            follow_redirects=True,
        )

    def get(self, session: Session, scientific_name: str, common_name: str | None = None) -> dict:
        cached = session.get(SpeciesInfoCache, scientific_name)
        ttl = timedelta(days=self.settings.species_info_ttl_days)
        if cached and cached.data.get("complete"):
            fetched = cached.fetched_at if cached.fetched_at.tzinfo else cached.fetched_at.replace(tzinfo=timezone.utc)
            if datetime.now(timezone.utc) - fetched < ttl:
                return cached.data

        info = self.fetch(scientific_name, common_name)
        if cached:
            cached.data = info
            cached.fetched_at = datetime.now(timezone.utc)
        else:
            session.add(SpeciesInfoCache(scientific_name=scientific_name, data=info))
        session.commit()
        return info

    def fetch(self, scientific_name: str, common_name: str | None = None) -> dict:
        info = _empty(scientific_name, common_name)
        ok = [self._inaturalist(info), self._wikipedia(info), self._xeno_canto(info)]
        # Only cache "for real" when every source answered, so outages self-heal.
        info["complete"] = all(ok)
        return info

    def _inaturalist(self, info: dict) -> bool:
        try:
            r = self.client.get(
                "https://api.inaturalist.org/v1/taxa",
                params={"q": info["scientific_name"], "rank": "species", "per_page": 1},
            )
            r.raise_for_status()
            results = r.json().get("results") or []
        except Exception as exc:
            log.info("iNaturalist lookup failed for %s: %s", info["scientific_name"], exc)
            return False
        if results:
            taxon = results[0]
            photo = taxon.get("default_photo") or {}
            info["photo_url"] = photo.get("medium_url") or photo.get("url")
            info["photo_attribution"] = photo.get("attribution")
            info["wikipedia_url"] = taxon.get("wikipedia_url")
            info["common_name"] = info["common_name"] or taxon.get("preferred_common_name")
        return True

    def _wikipedia(self, info: dict) -> bool:
        title = quote(info["scientific_name"].replace(" ", "_"))
        try:
            r = self.client.get(f"https://en.wikipedia.org/api/rest_v1/page/summary/{title}")
            if r.status_code == 404:
                return True
            r.raise_for_status()
            data = r.json()
        except Exception as exc:
            log.info("Wikipedia lookup failed for %s: %s", info["scientific_name"], exc)
            return False
        info["summary"] = data.get("extract")
        info["wikipedia_url"] = info["wikipedia_url"] or data.get("content_urls", {}).get("mobile", {}).get("page")
        if not info["photo_url"]:
            info["photo_url"] = (data.get("thumbnail") or {}).get("source")
        return True

    def _xeno_canto(self, info: dict) -> bool:
        key = self.settings.xeno_canto_api_key
        if not key:
            return True  # nothing to fetch; the app links to call_page_url
        genus, _, species = info["scientific_name"].partition(" ")
        try:
            r = self.client.get(
                "https://xeno-canto.org/api/3/recordings",
                params={"query": f'gen:{genus} sp:{species} q:A type:song', "key": key, "per_page": 50},
            )
            r.raise_for_status()
            recordings = r.json().get("recordings") or []
        except Exception as exc:
            log.info("xeno-canto lookup failed for %s: %s", info["scientific_name"], exc)
            return False
        if recordings:
            rec = recordings[0]
            url = rec.get("file") or ""
            info["call_url"] = f"https:{url}" if url.startswith("//") else url
            info["call_attribution"] = f"XC{rec.get('id')} · {rec.get('rec')} · {rec.get('lic', '').lstrip('/')}"
            info["call_page_url"] = f"https://xeno-canto.org/{rec.get('id')}"
        return True
