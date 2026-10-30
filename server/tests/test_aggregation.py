import pytest

from app.services.aggregation import aggregate, combine_scores, detected_noise
from app.services.classifiers.base import Detection


def d(start, sci, conf, common=None):
    return Detection(start, start + 3, sci, common or sci, conf)


def test_combine_scores_single_window_is_identity():
    assert combine_scores([0.8]) == pytest.approx(0.8)


def test_combine_scores_corroboration_helps_but_weak_runs_stay_low():
    assert combine_scores([0.8, 0.5]) > 0.8
    assert combine_scores([0.2] * 5) < 0.5


def test_aggregate_groups_filters_and_ranks():
    dets = [
        d(0, "Poecile atricapillus", 0.83, "Black-capped Chickadee"),
        d(3, "Poecile atricapillus", 0.22, "Black-capped Chickadee"),
        d(9, "Haemorhous mexicanus", 0.62, "House Finch"),
        d(6, "Baeolophus bicolor", 0.2, "Tufted Titmouse"),
        d(12, "Engine", 0.9),
    ]
    out = aggregate(dets, min_confidence=0.5)
    assert [s.common_name for s in out] == ["Black-capped Chickadee", "House Finch"]
    chickadee = out[0]
    assert chickadee.windows == 2
    assert chickadee.first_seen == 0 and chickadee.last_seen == 3
    assert chickadee.max_confidence == 0.83
    assert chickadee.confidence > 0.83


def test_duplicate_window_counts_once():
    out = aggregate([d(0, "A", 0.6), d(0, "A", 0.7)], 0.5)
    assert out[0].windows == 1 and out[0].confidence == pytest.approx(0.7)


def test_detected_noise():
    assert detected_noise([d(0, "Engine", 0.9), d(3, "Dog", 0.1), d(0, "A", 0.9)]) == ["Engine"]
