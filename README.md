# SnapShift

A mobile app that lets you photograph or upload your work schedule and automatically extracts shift information into a calendar view using OCR. All data stays on your device.

Built with React Native and Expo.

## Features

- **Schedule OCR** — Take a photo or select a screenshot of your work schedule and automatically extract shifts into your calendar
- **Calendar View** — Interactive monthly calendar with color-coded event dots by category
- **Weekly View** — 7-day overview with compact shift blocks, week navigation, and today highlighting
- **Manual Events** — Create events manually with title, date, times, category, and notes
- **Event Details** — View, edit, or delete any event with full field editing
- **Local Storage** — All data stored on-device with no account or sign-up required
- **Categories** — Color-coded categories: work, personal, medical, school, and other

## Tech Stack

- [Expo](https://expo.dev) 54
- [React Native](https://reactnative.dev) 0.81
- [React](https://react.dev) 19
- [Expo Router](https://docs.expo.dev/router/introduction/) (file-based routing)
- [react-native-calendars](https://github.com/wix/react-native-calendars)
- [date-fns](https://date-fns.org)
- [OCR.space](https://ocr.space) (text extraction from schedule images)

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)

### Setup

```bash
# Install dependencies
npm install

# Create a .env file with your OCR.space API key
echo "EXPO_PUBLIC_OCR_API_KEY=your_key_here" > .env
```

You can get a free OCR.space API key at [ocr.space/ocrapi](https://ocr.space/ocrapi).

### Run

```bash
# Start the Expo dev server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android
```

## Privacy

SnapShift does not collect, store, or transmit any personal information. Schedule data is stored exclusively on your device and deleted when you uninstall the app. The only external service used is OCR.space for text extraction from schedule images.

Full privacy policy: [rydertetreault.dev/projects/snapshift/privacy-policy](https://rydertetreault.dev/projects/snapshift/privacy-policy)
