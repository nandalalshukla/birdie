from datetime import datetime

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_app_settings
from app.config import Settings
from app.db import get_session
from app.models import AnalysisJob, JobStatus, Sighting
from app.schemas import SightingCreate, SightingOut
from app.services.sightings import parse_bbox, sightings_query, to_out

router = APIRouter(prefix="/sightings", tags=["sightings"])

DeviceHeader = Header(None, alias="X-Device-Id", max_length=64)


@router.post("", response_model=SightingOut, status_code=status.HTTP_201_CREATED)
def create_sighting(
    body: SightingCreate,
    session: Session = Depends(get_session),
    settings: Settings = Depends(get_app_settings),
) -> SightingOut:
    """Save a species from a finished analysis. Name, confidence, time and place come from the analysis."""
    job = session.get(AnalysisJob, body.job_id)
    if job is None or job.status != JobStatus.done or not job.result:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Finished analysis not found")
    if job.device_id and job.device_id != body.device_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This analysis belongs to another device")

    match = next((s for s in job.result.get("species", []) if s["scientific_name"] == body.scientific_name), None)
    if match is None:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Species was not identified in this analysis")

    lat, lon = (job.lat, job.lon) if job.lat is not None and job.lon is not None else (body.lat, body.lon)
    if lat is None or lon is None:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "A location is required to save a sighting")

    existing = (
        session.query(Sighting).filter_by(job_id=job.id, scientific_name=body.scientific_name).one_or_none()
    )
    sighting = existing or Sighting(job_id=job.id, device_id=body.device_id, scientific_name=body.scientific_name)
    sighting.common_name = match["common_name"]
    sighting.confidence = match["confidence"]
    sighting.lat, sighting.lon = lat, lon
    sighting.observed_at = job.recorded_at
    sighting.observer_name = body.observer_name
    sighting.note = body.note
    sighting.is_public = body.is_public
    session.add(sighting)
    session.commit()
    return to_out(sighting, body.device_id, settings.public_coordinate_decimals)


@router.get("", response_model=list[SightingOut])
def list_sightings(
    bbox: str | None = Query(None, description="min_lon,min_lat,max_lon,max_lat"),
    species: str | None = None,
    mine: bool = False,
    since: datetime | None = None,
    limit: int = Query(500, ge=1, le=2000),
    device_id: str | None = DeviceHeader,
    session: Session = Depends(get_session),
    settings: Settings = Depends(get_app_settings),
) -> list[SightingOut]:
    try:
        box = parse_bbox(bbox)
    except ValueError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc))
    q = sightings_query(viewer_device_id=device_id, mine=mine, bbox=box, species=species, since=since)
    rows = session.scalars(q.order_by(Sighting.observed_at.desc()).limit(limit)).all()
    return [to_out(s, device_id, settings.public_coordinate_decimals) for s in rows]


@router.get("/geojson")
def sightings_geojson(
    bbox: str | None = Query(None, description="min_lon,min_lat,max_lon,max_lat"),
    species: str | None = None,
    mine: bool = False,
    since: datetime | None = None,
    limit: int = Query(1000, ge=1, le=5000),
    device_id: str | None = DeviceHeader,
    session: Session = Depends(get_session),
    settings: Settings = Depends(get_app_settings),
) -> dict:
    """Sightings as a GeoJSON FeatureCollection, ready for Leaflet's L.geoJSON()."""
    items = list_sightings(bbox, species, mine, since, limit, device_id, session, settings)
    return {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "id": s.id,
                "geometry": {"type": "Point", "coordinates": [s.lon, s.lat]},
                "properties": s.model_dump(mode="json", exclude={"lat", "lon"}),
            }
            for s in items
        ],
    }


@router.delete("/{sighting_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_sighting(
    sighting_id: str,
    device_id: str | None = DeviceHeader,
    session: Session = Depends(get_session),
) -> None:
    sighting = session.get(Sighting, sighting_id)
    if sighting is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Sighting not found")
    if sighting.device_id != device_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You can only delete your own sightings")
    session.delete(sighting)
    session.commit()
