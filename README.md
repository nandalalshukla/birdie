# BirdEar 🐦

Record 10–15 seconds of birdsong and find out which bird it is.

BirdEar is a React Native (Expo) app backed by a small Python service that runs
[BirdNET v2.4](https://github.com/kahst/BirdNET-Analyzer) (TFLite, ~6,000 species)
through [`birdnetlib`](https://github.com/joeweiss/birdnetlib).

```
Record (expo-audio) → Upload → Queue → Resample 48 kHz, split 3 s windows → BirdNET
  → species + confidence per window → Aggregate + filter by location/week
  → Species, photo, call sample, spectrogram → Save sighting → Map + community feed
```

## Repository layout

| Path      | What                                                       |
|-----------|------------------------------------------------------------|
| `app/`    | Expo / React Native client (TypeScript, Expo Router)       |
| `server/` | FastAPI API + background inference worker (BirdNET, librosa) |

See each folder's README for setup.
