# LeftBehind

Cross-platform travel packing companion built with Expo + React Native.

Pack smart checklists for hotels, Airbnbs, gyms, and more. Track personal blind spots, budget trips on a calendar, and get checkout reminders — with a liquid-glass UI, local accounts, and offline-first data.

## Run

```bash
npm install
npx expo start
```

- Android: press `a` or `npx expo start --android`
- iOS (macOS): press `i` or `npx expo start --ios`
- Web: `npx expo start --web`

## What's included

- Liquid glass UI (blur cards, frosted tab bar, Material Icons — no emoji UI)
- Local register / login / forgot-password (device-only; hashed with SHA-256 + salt)
- Trips, packing checklists, check-in / check-out times
- Calendar + daily budget entries
- Blind-spot insights (by normalized item label across venues)
- Light / dark / system themes
- 21 selectable languages (full translations for major locales; others fall back to English)
- Offline packing, trips, budget, and settings (maps/search need network + API keys)
- Local checkout reminder notifications

## Project structure

```
app/                 Expo Router screens
  auth/              login, register, forgot-password
  (tabs)/            home, trips, map, calendar, profile
  session/           new-trip, active checklist
src/
  components/        Glass, AppBackground, ErrorBoundary
  store/             appStore, authStore, settingsStore
  hooks/             useNotifications.ts
  i18n/              translations + useT
  data/venues.ts     venue packing templates
```

## Before store builds

1. Set real bundle IDs if you want different ones than `com.leftbehind.app` in `app.json`.
2. Add Google Maps API keys in `app.json` (`ios.config.googleMapsApiKey` / `android.config.googleMaps.apiKey`).
3. Enable Places / Directions APIs in Google Cloud if you want live hotel/restaurant search and routing.
4. For cross-device accounts, connect Firebase Auth or Supabase (local auth is device-scoped today).

## Notes

- Map place search stays disabled until a Places API key is configured (`PLACES_API_CONFIGURED` in `app/(tabs)/map.tsx`).
- Web uses a map stub because `react-native-maps` has no browser implementation; packing and auth work on web.
