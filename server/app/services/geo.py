import math

EARTH_RADIUS_KM = 6371.0088


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * EARTH_RADIUS_KM * math.asin(min(1.0, math.sqrt(a)))


def bbox_around(lat: float, lon: float, radius_km: float) -> tuple[float, float, float, float]:
    """Bounding box (min_lon, min_lat, max_lon, max_lat) that contains the circle; used as a cheap pre-filter."""
    dlat = math.degrees(radius_km / EARTH_RADIUS_KM)
    cos_lat = max(math.cos(math.radians(lat)), 1e-6)
    dlon = min(180.0, math.degrees(radius_km / (EARTH_RADIUS_KM * cos_lat)))
    min_lat, max_lat = max(-90.0, lat - dlat), min(90.0, lat + dlat)
    if dlon >= 180:
        return -180.0, min_lat, 180.0, max_lat
    min_lon = ((lon - dlon + 180) % 360) - 180
    max_lon = ((lon + dlon + 180) % 360) - 180
    return min_lon, min_lat, max_lon, max_lat
