from datetime import datetime

from sqlalchemy import Select, select

from app.models import Sighting
from app.schemas import SightingOut


def to_out(s: Sighting, viewer_device_id: str | None, public_decimals: int) -> SightingOut:
    mine = viewer_device_id is not None and s.device_id == viewer_device_id
    lat, lon = (s.lat, s.lon) if mine else (round(s.lat, public_decimals), round(s.lon, public_decimals))
    return SightingOut(
        id=s.id,
        job_id=s.job_id if mine else None,
        scientific_name=s.scientific_name,
        common_name=s.common_name,
        confidence=s.confidence,
        lat=lat,
        lon=lon,
        observed_at=s.observed_at,
        observer_name=s.observer_name,
        note=s.note,
        is_public=s.is_public,
        is_mine=mine,
        created_at=s.created_at,
    )


def parse_bbox(bbox: str | None) -> tuple[float, float, float, float] | None:
    """`min_lon,min_lat,max_lon,max_lat` (Leaflet's toBBoxString order)."""
    if not bbox:
        return None
    parts = [float(p) for p in bbox.split(",")]
    if len(parts) != 4:
        raise ValueError("bbox must have 4 numbers")
    min_lon, min_lat, max_lon, max_lat = parts
    if min_lat > max_lat:
        raise ValueError("bbox min_lat > max_lat")
    return min_lon, min_lat, max_lon, max_lat


def sightings_query(
    *,
    viewer_device_id: str | None,
    mine: bool = False,
    bbox: tuple[float, float, float, float] | None = None,
    species: str | None = None,
    since: datetime | None = None,
) -> Select[tuple[Sighting]]:
    q = select(Sighting)
    if mine:
        q = q.where(Sighting.device_id == (viewer_device_id or "\x00"))
    elif viewer_device_id:
        q = q.where((Sighting.is_public.is_(True)) | (Sighting.device_id == viewer_device_id))
    else:
        q = q.where(Sighting.is_public.is_(True))
    if bbox:
        min_lon, min_lat, max_lon, max_lat = bbox
        q = q.where(Sighting.lat.between(min_lat, max_lat))
        if min_lon <= max_lon:
            q = q.where(Sighting.lon.between(min_lon, max_lon))
        else:  # crosses the antimeridian
            q = q.where((Sighting.lon >= min_lon) | (Sighting.lon <= max_lon))
    if species:
        q = q.where(Sighting.scientific_name == species)
    if since:
        q = q.where(Sighting.observed_at >= since)
    return q
