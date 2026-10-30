import base64
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session

from app.api.deps import get_app_settings
from app.config import Settings
from app.db import get_session
from app.models import Sighting
from app.schemas import FeedStats, SightingOut, SightingPage, TrendingSpecies
from app.services.geo import bbox_around, haversine_km
from app.services.sightings import sightings_query, to_out

router = APIRouter(prefix="/feed", tags=["community"])


def _decode_cursor(cursor: str) -> tuple[datetime, str]:
    try:
        created, sid = base64.urlsafe_b64decode(cursor.encode()).decode().split("|", 1)
        return datetime.fromisoformat(created), sid
    except Exception:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Invalid cursor")


def _public_query(lat: float | None, lon: float | None, radius_km: float):
    """Public sightings only (the viewer's private ones never appear in the community feed)."""
    bbox = bbox_around(lat, lon, radius_km) if lat is not None and lon is not None else None
    return sightings_query(viewer_device_id=None, bbox=bbox)


@router.get("", response_model=SightingPage)
def feed(
    cursor: str | None = None,
    limit: int = Query(20, ge=1, le=100),
    lat: float | None = Query(None, ge=-90, le=90),
    lon: float | None = Query(None, ge=-180, le=180),
    radius_km: float = Query(50, gt=0, le=2000),
    species: str | None = None,
    device_id: str | None = Header(None, alias="X-Device-Id", max_length=64),
    session: Session = Depends(get_session),
    settings: Settings = Depends(get_app_settings),
) -> SightingPage:
    """Newest public sightings, optionally within `radius_km` of a point. Cursor-paginated."""
    near = lat is not None and lon is not None
    q = _public_query(lat, lon, radius_km)
    if species:
        q = q.where(Sighting.scientific_name == species)
    q = q.order_by(Sighting.created_at.desc(), Sighting.id.desc())

    def after(c: tuple[datetime, str] | None):
        if c is None:
            return q
        created, sid = c
        return q.where(or_(Sighting.created_at < created, and_(Sighting.created_at == created, Sighting.id < sid)))

    position = _decode_cursor(cursor) if cursor else None
    items: list[SightingOut] = []
    has_more = False
    batch = limit * 4
    # The bbox pre-filter over-selects at the corners, so rows outside the radius
    # are dropped here and we keep scanning until the page is full.
    while True:
        rows = session.scalars(after(position).limit(batch)).all()
        for i, s in enumerate(rows):
            position = (s.created_at, s.id)
            dist = haversine_km(lat, lon, s.lat, s.lon) if near else None
            if dist is not None and dist > radius_km:
                continue
            out = to_out(s, device_id, settings.public_coordinate_decimals)
            out.distance_km = round(dist, 1) if dist is not None else None
            items.append(out)
            if len(items) == limit:
                has_more = i < len(rows) - 1 or len(rows) == batch
                break
        if len(items) == limit or len(rows) < batch:
            break

    next_cursor = None
    if has_more and position:
        next_cursor = base64.urlsafe_b64encode(f"{position[0].isoformat()}|{position[1]}".encode()).decode()
    return SightingPage(items=items, next_cursor=next_cursor)


@router.get("/stats", response_model=FeedStats)
def feed_stats(
    days: int = Query(7, ge=1, le=365),
    lat: float | None = Query(None, ge=-90, le=90),
    lon: float | None = Query(None, ge=-180, le=180),
    radius_km: float = Query(50, gt=0, le=2000),
    top: int = Query(8, ge=1, le=50),
    session: Session = Depends(get_session),
) -> FeedStats:
    """What the community has been hearing recently (nearby, if a point is given)."""
    since = datetime.now(timezone.utc) - timedelta(days=days)
    base = _public_query(lat, lon, radius_km).where(Sighting.observed_at >= since)
    rows = session.scalars(base).all()
    if lat is not None and lon is not None:
        rows = [s for s in rows if haversine_km(lat, lon, s.lat, s.lon) <= radius_km]

    by_species: dict[str, list[Sighting]] = {}
    for s in rows:
        by_species.setdefault(s.scientific_name, []).append(s)
    trending = sorted(
        (
            TrendingSpecies(
                scientific_name=sci,
                common_name=group[0].common_name,
                sightings=len(group),
                last_seen=max(x.observed_at for x in group),
            )
            for sci, group in by_species.items()
        ),
        key=lambda t: (-t.sightings, t.common_name),
    )[:top]
    return FeedStats(
        days=days,
        sightings=len(rows),
        species=len(by_species),
        observers=len({s.device_id for s in rows}),
        trending=trending,
    )
