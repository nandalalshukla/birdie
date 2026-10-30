# BirdEar 🐦

**Record 10–15 seconds of birdsong and find out which bird it is.**

You hear a bird every morning but can't see it or name it. BirdEar listens for
you: record a short clip, and [BirdNET v2.4](https://github.com/kahst/BirdNET-Analyzer)
(~6,000 species) tells you what's singing, narrowed down to the species that
are actually expected where you are this week. Save what you hear to a map and
see what other birders nearby are hearing.

Built for nature lovers, students, school projects and birding groups.

## How it works

```
 ┌──────────── App (Expo / React Native) ────────────┐        ┌──────────────── Server (FastAPI) ────────────────┐
 │ Record 10–15 s (expo-audio, 48 kHz mono AAC)      │        │ POST /analyses → save upload → queue job          │
 │ + precise location (expo-location)                ├──────▶ │ Worker:                                           │
 │                                                   │ upload │   decode + resample to 48 kHz (ffmpeg / soxr)     │
 │ Poll job ◀────────────────────────────────────────┤        │   split into 3 s windows                          │
 │                                                   │        │   BirdNET (birdnetlib, TFLite) per window,        │
 │ Results: species, photo, confidence, reference    │        │     lat/lon + week → range filter                 │
 │   call, per-window timeline, spectrogram          │ ◀──────┤   aggregate windows → species ≥ 0.5               │
 │ Save sighting → Leaflet map + community feed      │        │   mel spectrogram (librosa) → PNG                 │
 └───────────────────────────────────────────────────┘        │ /species: iNaturalist photo, Wikipedia, xeno-canto│
                                                              │ /sightings, /feed: SQLite + GeoJSON               │
                                                              └───────────────────────────────────────────────────┘
```

1. **Recording** – 10, 12 or 15 s clips at 48 kHz mono with a live level meter;
   precise location is requested up front.
2. **Inference** – `birdnetlib` runs BirdNET in background worker threads.
   Latitude, longitude and date are passed so BirdNET's range model only
   considers species likely in your region that week.
3. **Aggregation** – per-window detections are combined per species (best
   window, nudged up by corroborating windows); non-bird classes such as
   *Engine* or *Human vocal* are filtered out and reported as feedback; species
   above ~0.5 are kept.
4. **Spectrogram** – a librosa mel spectrogram annotated with BirdNET's 3 s
   windows shows what the model "sees".
5. **Sightings map & community** – saved sightings appear on a Leaflet map and
   in a nearby/global community feed with trending species. Other people's
   locations are rounded to ~1 km.

## Repository layout

```
app/                     Expo app (TypeScript, Expo Router)
  src/app/               routes: (tabs)/index|history|map|feed, analysis/[id]
  src/features/          recording, location, analysis, species, sightings, map, feed, profile
  src/components/        shared UI primitives and media components
  src/lib/               API client, device id, storage, formatting
  src/theme/, src/config/
server/                  FastAPI service
  app/api/routes/        analyses, species, sightings, feed, health
  app/services/          audio, classifiers (birdnet|mock), aggregation, spectrogram, species_info, geo
  app/worker/            job queue + analysis pipeline
  tests/
docker-compose.yml
```

## Quick start

```bash
docker compose up --build
```

```bash
cd app && npm install && cp .env.example .env
```

Set `EXPO_PUBLIC_API_URL` in `app/.env` to your computer's LAN address (e.g.
`http://192.168.1.10:8000`), then:

```bash
npx expo start
```

Details: [`server/README.md`](server/README.md) · [`app/README.md`](app/README.md)

## Credits

- [BirdNET](https://birdnet.cornell.edu/) by the K. Lisa Yang Center for Conservation Bioacoustics
  (Cornell Lab of Ornithology) and Chemnitz University of Technology — model weights licensed CC BY-NC-SA 4.0.
- [birdnetlib](https://github.com/joeweiss/birdnetlib), [librosa](https://librosa.org/), [Leaflet](https://leafletjs.com/),
  [OpenStreetMap](https://www.openstreetmap.org/copyright), [iNaturalist](https://www.inaturalist.org/),
  [Wikipedia](https://www.wikipedia.org/), [xeno-canto](https://xeno-canto.org/).
