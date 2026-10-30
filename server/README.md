# BirdEar server

FastAPI service that queues uploaded recordings, runs BirdNET v2.4 on them,
and stores sightings for the map and community feed.

## Setup

Requires Python 3.11+ and **ffmpeg** (to decode the AAC/Opus audio phones and
browsers record).

```bash
python -m venv .venv && source .venv/bin/activate
```

```bash
pip install -r requirements-dev.txt
```

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API docs: http://localhost:8000/docs

The BirdNET model (~50 MB) ships inside `birdnetlib`. It needs a TFLite
interpreter: `tflite-runtime`, `tensorflow`, or `ai-edge-litert` (installed
automatically on Python ≥ 3.12; the app shims it in for birdnetlib).

For UI work without the model, set `BIRDEAR_CLASSIFIER=mock`.

## Configuration

Environment variables (or `.env`), all prefixed with `BIRDEAR_` — see `.env.example`:

| Variable | Default | |
|---|---|---|
| `DATA_DIR` | `./data` | uploads, spectrograms, SQLite DB |
| `DATABASE_URL` | `sqlite:///<DATA_DIR>/birdear.db` | any SQLAlchemy URL |
| `CLASSIFIER` | `birdnet` | `birdnet` or `mock` |
| `WORKER_THREADS` | `2` | concurrent analyses (each loads its own interpreter) |
| `MIN_CONFIDENCE` | `0.5` | species threshold after aggregation |
| `WINDOW_MIN_CONFIDENCE` | `0.1` | per-window threshold fed into aggregation |
| `LOCATION_FILTER_THRESHOLD` | `0.03` | BirdNET range-model cut-off |
| `WINDOW_OVERLAP_SECONDS` | `0` | overlap between 3 s windows |
| `MAX_UPLOAD_MB` | `15` | |
| `PUBLIC_COORDINATE_DECIMALS` | `2` | rounding of other users' sightings (~1 km) |
| `XENO_CANTO_API_KEY` | – | enables in-app reference calls (otherwise a link) |

## API

| Method | Path | |
|---|---|---|
| `POST` | `/analyses` | multipart `audio` + `lat`, `lon`, `recorded_at`, `min_confidence`, `device_id` → `202 {id}` |
| `GET` | `/analyses/{id}` | status (`queued`/`processing`/`done`/`failed`) and result |
| `GET` | `/analyses/{id}/audio` | original recording |
| `GET` | `/analyses/{id}/spectrogram.png` | annotated mel spectrogram |
| `GET` | `/species/{scientific_name}` | photo, summary, reference call (cached) |
| `POST` | `/sightings` | save a species from a finished analysis |
| `GET` | `/sightings`, `/sightings/geojson` | `bbox`, `species`, `mine`, `since` filters |
| `DELETE` | `/sightings/{id}` | own sightings only (`X-Device-Id`) |
| `GET` | `/feed` | public sightings, cursor-paginated, optional `lat`/`lon`/`radius_km` |
| `GET` | `/feed/stats` | counts and trending species over the last `days` |

### Result shape

```json
{
  "model": "BirdNET-Analyzer v2.4 (GLOBAL 6K)",
  "window_count": 5, "window_seconds": 3.0,
  "location_filtered": true, "candidate_species": 157,
  "species": [{ "scientific_name": "Poecile atricapillus", "common_name": "Black-capped Chickadee",
                "confidence": 0.85, "max_confidence": 0.83, "windows": 2, "first_seen": 0.0, "last_seen": 3.0 }],
  "windows": [{ "start": 0.0, "end": 3.0, "scientific_name": "...", "common_name": "...", "confidence": 0.83 }],
  "noise": ["Engine"]
}
```

## Pipeline

`app/worker/tasks.py` → `AnalysisPipeline`:

1. `services/audio.py` – decode to mono float32 at 48 kHz, enforce 3–20 s.
2. `services/classifiers/birdnet.py` – birdnetlib `RecordingBuffer` splits 3 s
   windows (short tail zero-padded) and scores each; with a location, BirdNET's
   meta-model limits candidates to species expected that week.
3. `services/aggregation.py` – per species: `best + (1 − best) · 0.5 · P(any other window)`.
   One confident window is enough; repeated weak hits can't snowball.
4. `services/spectrogram.py` – mel spectrogram, 150 Hz–15 kHz, window markers + labels.

### Scaling

The queue is an in-process thread pool behind a small `JobQueue` protocol
(`app/worker/queue.py`). To scale out, implement it with RQ/Celery/arq and run
the pipeline in dedicated worker processes; swap SQLite for Postgres via
`BIRDEAR_DATABASE_URL`.

## Tests

```bash
pytest
```

The real model test is opt-in:

```bash
BIRDEAR_TEST_AUDIO=/path/to/birdsong.wav pytest tests/test_birdnet.py
```
