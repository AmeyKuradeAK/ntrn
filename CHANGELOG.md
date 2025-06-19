# 📜 NTRN Changelog

All notable changes to the NTRN (Next.js to React Native) converter project.

---

## [4.1.3] - 2025-01-03

### 🧠 **Intelligent Screen Creation & Asset Handling Revolution**

#### ✅ Critical User Feedback Addressed
- **Fixed Issue**: "Why layout.tsx and page.tsx saved in RN project" - NTRN now does intelligent screen creation instead of naive file conversion
- **Proper Terminology**: React Native uses "screens" not "pages" - fixed throughout
- **Asset Handling**: Automatic copying and optimization from public/ folder to assets/

#### 🚀 Major Breakthroughs
- **Intelligent AI Analysis**: AI now understands website purpose and functionality instead of just converting files
- **Screen Mapping**: `app/layout.tsx` → Tab Navigator setup, `app/page.tsx` → HomeScreen.tsx, etc.
- **Mobile-First Design**: Creates mobile-optimized screens with native patterns
- **Automatic Assets**: Smart copying from public/ folder with filtering and indexing

#### 🔄 Enhanced Conversion Process
- **Website Analysis**: AI analyzes entire Next.js project to understand purpose
- **Mobile App Design**: Creates appropriate navigation (Tab/Stack/Drawer) based on analysis  
- **Screen Creation**: Generates proper React Native screens with mobile enhancements
- **Asset Processing**: Copies assets with mobile optimization and auto-generated imports

#### 📱 Mobile Enhancements
- **Native Navigation**: Proper Tab/Stack/Drawer patterns instead of web routing
- **Mobile Components**: TouchableOpacity, pull-to-refresh, haptic feedback
- **Asset Organization**: assets/images/, assets/fonts/, assets/icons/ with index.ts
- **Performance**: Optimized for React Native 0.79 + New Architecture

## [4.1.2] - 2025-01-03

### 🚀 **Expo SDK 53 Compatibility Update**

#### ✅ Critical Fix
- **Expo Go Compatibility**: Updated to Expo SDK 53 for immediate compatibility with current Expo Go app
- **New Architecture**: Enabled by default in all generated projects for future-proof development
- **React 19 & RN 0.79**: Latest stable versions with performance improvements

#### 🔄 Major Updates
- **Expo SDK**: 51.0.0 → **53.0.0**
- **React**: 18.2.0 → **19.0.0**
- **React Native**: 0.74.5 → **0.79.0**
- **React Navigation**: v6 → **v7**
- **TypeScript**: 5.1.3 → **5.8.3**

#### 🛠️ Enhanced Platform Support
- **iOS**: Minimum deployment target 15.1 (from 13.4)
- **Android**: Target/Compile SDK 35, Min SDK 24 (from 23)
- **Edge-to-edge**: Ready for Android 16 requirements
- **All Dependencies**: Updated to latest stable versions

---

## [4.1.1] - 2024-12-21

### 🚀 **Critical Fix: Official Expo React Native Structure**

#### ✅ Fixed
- **Expo Router Plugin Error**: Removed `expo-router` plugin from app.json that was causing startup failures
- **Project Structure**: Now generates official Expo React Native projects with proper dependencies
- **Configuration Files**: Added essential files (babel.config.js, metro.config.js, expo-env.d.ts, .gitignore)
- **Immediate Compatibility**: Projects now work with `npx expo start --tunnel` out of the box

#### 🏗️ Enhanced
- **Official Expo 51.0**: Complete Expo React Native 0.74.5 project structure
- **TypeScript-First**: Full TypeScript configuration with path aliases
- **React Navigation 6**: Proper navigation setup with TypeScript support
- **Asset Management**: Created assets folder with comprehensive documentation
- **Production Ready**: Immediate deployment readiness for iOS/Android

#### 🧹 Project Cleanup
- **Removed 13 outdated files**: Cleaned up v3.x documentation and demo files
- **Updated package.json**: Proper version, description, and dependency management
- **Streamlined README**: Updated to reflect v4.1.1 capabilities and commands

---

## [4.0.0] - 2024-12-20

### 🧠 **Revolutionary AI-Powered Conversion**

#### ✨ New Features
- **Dual AI System**: Choose between Mistral AI (primary) and Gemini 2.0 Flash (fallback)
- **Intelligent Analysis**: Deep project structure understanding before conversion
- **Professional Converter**: 6-phase conversion process with auto-fixing
- **API Key Management**: One-time setup with secure .env storage
- **Interactive AI Assistant**: Enhanced `--prompt` mode with project awareness

#### 🔧 Technical Improvements
- **Smart Failover**: Automatic switching between AI providers on rate limits
- **Auto-Fixing System**: Intelligent error resolution with user consent
- **Pages→Screens Conversion**: Automatic Next.js pages to React Native screens
- **API Routes→Services**: Convert Next.js API routes to React Native services
- **Context Providers**: Complete app architecture with Theme/Auth contexts

---

## [3.2.4] - 2024-11-15

### 🎨 **Diverse Contextual Animations**

#### 🔄 Fixed
- **Repetitive GIF Usage**: Added 25+ unique, contextually relevant animations
- **Visual Experience**: Eliminated boring repetition with thematic coherence
- **Professional Polish**: Enterprise-grade README presentation

---

## [3.1.0] - 2024-10-20

### ⚡ **Performance & Token Optimization**

#### 🚀 Enhanced
- **90% Token Reduction**: Surgical fixes for common conversion patterns
- **Smart Conversion**: AI only for complex cases, deterministic for simple ones
- **Faster Processing**: Significant speed improvements in conversion time

---

## [3.0.0] - 2024-09-15

### 🤖 **AI Assistant Integration**

#### ✨ New Features
- **Interactive Mode**: `ntrn --prompt` for conversational development
- **Context Awareness**: AI understands project structure and requirements
- **Real-time Modifications**: Live file updates based on user requests

---

## [2.2.9] - 2024-08-10

### 🎨 **Shadcn/ui Conversion**

#### 🔄 Enhanced
- **Automatic Detection**: Intelligent Shadcn/ui component recognition
- **Mobile Conversion**: Transform web UI to React Native equivalents
- **Style Preservation**: Maintain visual design in mobile format

---

## [2.0.0] - 2024-07-01

### 🏗️ **Complete Architecture Overhaul**

#### ✨ Major Features
- **Expo Integration**: Full Expo React Native project generation
- **Navigation Setup**: React Navigation configuration
- **Component Conversion**: Advanced HTML to React Native component mapping
- **TypeScript Support**: Complete TypeScript project setup

---

## [1.0.0] - 2024-06-01

### 🌟 **Initial Release**

#### ✨ Core Features
- **Basic Conversion**: Next.js to React Native file conversion
- **CLI Interface**: Simple command-line tool
- **File Processing**: Component and page conversion
- **Dependency Management**: Package.json generation

---

## 🔮 **Upcoming Features**

- **v4.2.0**: Enhanced error detection and fixing
- **v4.3.0**: Advanced component optimization
- **v4.4.0**: Integrated testing suite generation
- **v5.0.0**: Visual conversion interface

---

**Legend:**
- 🚀 Major Release
- ✨ New Feature
- 🔧 Enhancement
- 🐛 Bug Fix
- 🧹 Cleanup
- 📝 Documentation 