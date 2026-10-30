# BirdEar app

Expo (SDK 58) / React Native app, TypeScript, Expo Router. Runs on iOS,
Android and web.

## Run

```bash
npm install
```

```bash
cp .env.example .env
```

Point `EXPO_PUBLIC_API_URL` at the server. On a physical phone that's your
computer's LAN IP, not `localhost`. If unset, the app uses the Metro host on
port 8000.

```bash
npx expo start
```

Everything used (expo-audio, expo-location, expo-image, react-native-webview)
is available in Expo Go. For store builds use EAS (`npx eas-cli@latest build`).

## Checks

```bash
npm run typecheck
```

```bash
npm run lint
```

## Structure

```
src/
  app/                       Expo Router routes (screens only)
    _layout.tsx              root stack + providers
    (tabs)/index.tsx         Listen: record + identify
    (tabs)/history.tsx       My birds
    (tabs)/map.tsx           Leaflet sightings map
    (tabs)/feed.tsx          Community feed
    analysis/[id].tsx        Job progress → results
  features/                  one folder per feature: api, hooks, components, types
    recording/               useBirdRecorder (expo-audio), RecordButton, LevelMeter
    location/                useCurrentLocation (high-accuracy fix)
    analysis/                upload, polling, results, window timeline, spectrogram
    species/                 photo/summary/reference call lookup
    sightings/               save/list/delete sightings
    map/                     Leaflet page + WebView (native) / iframe (web) bridge
    feed/                    community feed, trending species, display name
    profile/                 local profile context
  components/ui, media       shared primitives (Button, Card, Text, PlayButton, …)
  lib/                       API client, device id, storage, formatting
  theme/, config/            colors/spacing (light + dark), env and constants
```

Features import shared code from `components/`, `lib/` and other features'
`index.ts` only. Routes stay thin and compose features.

## Notes

- **Identity** – an anonymous per-install id (`lib/device.ts`) is sent as
  `X-Device-Id` to group your own sightings; no account needed.
- **Map** – Leaflet + OpenStreetMap tiles inside a WebView, talking to the app
  over `postMessage` (see `features/map/leafletHtml.ts`).
- **Privacy** – other people's sightings come back with coordinates rounded
  to ~1 km; private sightings never leave your own list and map.
