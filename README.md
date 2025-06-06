# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Building and Running

1. Install dependencies: `npm install`
2. For iOS, run `cd ios && pod install` then open `ios/teletipapp.xcworkspace` in Xcode.
3. For Android, ensure Android SDK 35 and run `npx react-native run-android`.
