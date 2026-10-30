"""Combine BirdNET's per-window detections into one ranked species list."""

from collections import defaultdict
from dataclasses import dataclass

from app.services.classifiers.base import Detection

# BirdNET v2.4 includes a handful of non-bird "event" classes. They are useful for
# telling the user why nothing was found but must not be reported as species.
NON_BIRD_LABELS = {
    "Dog",
    "Engine",
    "Environmental",
    "Fireworks",
    "Gun",
    "Human non-vocal",
    "Human vocal",
    "Human whistle",
    "Noise",
    "Power tools",
    "Siren",
}


def is_non_bird(d: Detection) -> bool:
    return d.common_name in NON_BIRD_LABELS or d.scientific_name in NON_BIRD_LABELS


@dataclass
class SpeciesSummary:
    scientific_name: str
    common_name: str
    confidence: float
    max_confidence: float
    mean_confidence: float
    windows: int
    first_seen: float
    last_seen: float

    def as_dict(self) -> dict:
        return {
            "scientific_name": self.scientific_name,
            "common_name": self.common_name,
            "confidence": round(self.confidence, 4),
            "max_confidence": round(self.max_confidence, 4),
            "mean_confidence": round(self.mean_confidence, 4),
            "windows": self.windows,
            "first_seen": self.first_seen,
            "last_seen": self.last_seen,
        }


def combine_scores(scores: list[float], support_weight: float = 0.5) -> float:
    """Best window score, nudged up by corroborating windows.

    combined = max + (1 - max) * support_weight * P(any other window is right)

    The strongest window dominates, so one confident call is enough, while a bird
    heard faintly across many windows gains a little. With `support_weight`
    < 1, a run of weak false positives can't snowball past the threshold the way
    a plain noisy-OR would.
    """
    if not scores:
        return 0.0
    ordered = sorted(scores, reverse=True)
    best, rest = ordered[0], ordered[1:]
    p_none = 1.0
    for s in rest:
        p_none *= 1.0 - s
    return min(1.0, best + (1.0 - best) * support_weight * (1.0 - p_none))


def aggregate(detections: list[Detection], min_confidence: float = 0.5) -> list[SpeciesSummary]:
    by_species: dict[tuple[str, str], dict[float, float]] = defaultdict(dict)
    for d in detections:
        if is_non_bird(d):
            continue
        per_window = by_species[(d.scientific_name, d.common_name)]
        # One score per window (overlapping windows can report the same start twice).
        per_window[d.start] = max(per_window.get(d.start, 0.0), d.confidence)

    summaries: list[SpeciesSummary] = []
    for (sci, common), per_window in by_species.items():
        scores = list(per_window.values())
        combined = combine_scores(scores)
        if combined < min_confidence:
            continue
        summaries.append(
            SpeciesSummary(
                scientific_name=sci,
                common_name=common,
                confidence=combined,
                max_confidence=max(scores),
                mean_confidence=sum(scores) / len(scores),
                windows=len(scores),
                first_seen=min(per_window),
                last_seen=max(per_window),
            )
        )
    summaries.sort(key=lambda s: (-s.confidence, -s.windows))
    return summaries


def detected_noise(detections: list[Detection], threshold: float = 0.3) -> list[str]:
    """Non-bird sounds BirdNET was fairly sure about (e.g. 'Engine'), for user feedback."""
    return sorted({d.common_name for d in detections if is_non_bird(d) and d.confidence >= threshold})
