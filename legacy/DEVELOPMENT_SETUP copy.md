# Install Xcode Command Line Tools
xcode-select --install
```

### 2. Install CocoaPods
```bash
sudo gem install cocoapods
```

### 3. Install project dependencies
```bash
# In the mobile directory
npm install
cd ios
pod install
cd ..
```

## Running the App

### Using iOS Simulator
1. Open Xcode
2. Open the `ios/Verdict.xcworkspace` file (NOT .xcodeproj)
3. Select a simulator (e.g., iPhone 14)
4. Click the "Run" button (play icon) or press Cmd + R

### Testing on Your iPhone
1. Connect your iPhone via USB to your Mac
2. In Xcode:
   - Select your iPhone from the device dropdown at the top
   - Click on "Verdict" in the project navigator
   - In the "Signing & Capabilities" tab:
     - Check "Automatically manage signing"
     - Select your personal team
     - Bundle Identifier: Update to something unique (e.g., "com.yourname.verdict")
3. On your iPhone:
   - Go to Settings > General > Device Management
   - Trust your developer certificate
4. Click "Run" in Xcode

## Quick Start
We've provided a setup script to help you get started quickly:

```bash
# Make the script executable
chmod +x scripts/run-ios.sh

# Run the setup script
./scripts/run-ios.sh
```

## Common Issues and Solutions

### Build Fails
1. Clean the build:
   ```bash
   cd ios
   xcodebuild clean
   pod deintegrate
   pod install
   ```
2. In Xcode:
   - Product > Clean Build Folder
   - Try building again

### "Could not find simulator" Error
1. Open Xcode
2. Window > Devices and Simulators
3. Create a new simulator if needed

### App Won't Install on iPhone
1. Check that your Apple ID is added in Xcode > Preferences > Accounts
2. Ensure your device is trusted in System Settings
3. Verify your provisioning profile is set up correctly in Xcode

### Metro Bundler Issues
If the Metro bundler isn't starting:
```bash
cd mobile
npm start -- --reset-cache
```

### Pod Install Fails
```bash
cd ios
pod deintegrate
pod install