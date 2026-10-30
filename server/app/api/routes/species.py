from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.db import get_session
from app.services.species_info import SpeciesInfoService

router = APIRouter(prefix="/species", tags=["species"])


def get_species_service(request: Request) -> SpeciesInfoService:
    return request.app.state.species_info


@router.get("/{scientific_name}")
def species_info(
    scientific_name: str,
    common_name: str | None = Query(None),
    session: Session = Depends(get_session),
    service: SpeciesInfoService = Depends(get_species_service),
) -> dict:
    """Photo, summary and a reference call for a species (cached)."""
    return service.get(session, scientific_name, common_name)
