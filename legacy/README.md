# Verdict iOS App

## Getting Started

1. **Download the Project**
   - In Replit, click the "Files" tab on the left sidebar
   - Click the three dots (...) next to the root folder
   - Select "Download as zip"
   - Extract the zip file on your Mac

2. **Setup Your Development Environment**
   ```bash
   # Navigate to the mobile folder
   cd mobile
   
   # Make the setup script executable
   chmod +x scripts/setup-ios.sh
   
   # Run the setup script
   ./scripts/setup-ios.sh
   ```

3. **Open in Xcode**
   - Open Xcode
   - Go to File > Open
   - Navigate to the `ios` folder in the project
   - Select `Verdict.xcworkspace` (it will be generated after running the setup script)
   - DO NOT open the .xcodeproj file

4. **Run on Your iPhone**
   - Connect your iPhone to your Mac via USB
   - In Xcode:
     - Select your iPhone from the device dropdown at the top
     - Click on "Verdict" in the project navigator
     - In "Signing & Capabilities":
       - Check "Automatically manage signing"
       - Select your personal team
       - Update Bundle ID (e.g., com.yourname.verdict)
   - Click the Play button or press Cmd + R to build and run

## Troubleshooting

If you encounter any issues:
1. Run the troubleshooting script:
   ```bash
   ./scripts/troubleshoot.sh
   ```
2. Make sure you have:
   - Latest version of Xcode installed
   - CocoaPods installed (`sudo gem install cocoapods`)
   - iPhone connected and trusted on your Mac

Need more help? Check the `DEVELOPMENT_SETUP.md` file for detailed instructions.
