# NTRN — Next.js/React → Flutter Converter (v0.3.0)

<p align="center">
  <img src="https://img.shields.io/badge/Version-v0.3.0-0070f3?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Flutter-02569B?style=for-the-badge&logo=flutter&logoColor=white" />
  <img src="https://img.shields.io/badge/Dart-0175C2?style=for-the-badge&logo=dart&logoColor=white" />
</p>

NTRN is a CLI tool that converts **Next.js and React projects** into **Flutter (Dart) projects**. Build cross-platform mobile apps from your web codebase.

**v0.3.0** provides comprehensive project analysis with detailed code structure parsing, library mapping, and enhanced file detection. Foundation is being built for future code conversion.

---

## ✨ Features (v0.3.0)

* 📊 **Comprehensive Project Analysis** - Deep analysis of Next.js/React project structure
* 🔍 **Code Structure Parsing** - Uses Babel to parse JSX/TSX and extract detailed component information
* 📦 **Library Mapping** - Maps React/Next.js libraries to Flutter equivalents (30+ libraries)
* 📱 **Flutter Project Creation** - Generates complete Flutter project scaffold
* 🗂️ **Structure Mapping** - Maps pages → screens, components → widgets, utils → utils
* 📝 **Placeholder Files** - Creates empty Dart files ready for future code conversion
* 🎯 **Enhanced File Detection** - Searches multiple locations for pages, components, and utils
* 📈 **Detailed Analysis Output** - Shows component types, props, className values, imports, text content
* 🚫 **Non-destructive** - Asks before overwriting existing directories
* 🔧 **Verbose Mode** - Use `--verbose` flag for detailed analysis logs

---

## 🚀 Installation

```bash
npm install -g ntrn@latest
```

Or clone and install locally:

```bash
git clone https://github.com/AmeyKuradeAK/ntrn.git
cd ntrn
npm install
npm link
```

**Requirements:**
* Node.js 18+
* Flutter SDK (for running generated projects)

---

## ⚡ Usage

### Basic Conversion

```bash
ntrn
```

The tool will:
1. Prompt for your Next.js/React project path
2. Analyze the project structure
3. Prompt for Flutter project name and output path
4. Generate Flutter project with mapped structure

### Example Flow

```bash
$ ntrn
> Enter the path to your Next.js/React project: ./my-nextjs-app
> Analyzing project...
> ✅ Project analyzed:
>    Framework: Next.js
> 
> 📄 Pages (1 found):
>    - app/page.tsx (4.6 KB)
>      Component: Home, functional, default export
>      Elements: div(15), section(2), main(1)
>      Props: className(33), onComplete(1)
>      Classes: container, section, intro-section, ...
>      Imports: libs: react, next/link, ./components/IntroSequence
>      Text: "Welcome", "Get Started", ...
>      Custom components: IntroSequence, ArrowRight
>      Complexity: complex
>      Has: useState, 1 event handlers
> 
> 🧩 Components (2 found):
>    - components/intro/IntroSequence.tsx (4.2 KB)
>      Component: IntroSequence (arrow)
>      Elements: div(2), AnimatePresence(1), PopUpWindow(1)
> 
> 📦 External Libraries (2 found):
>    Animation:
>      ✅ framer-motion → flutter_animate (automatic, medium)
>         Used in: components/intro/IntroSequence.tsx
>    Icons:
>      ✅ lucide-react → lucide_icons_flutter (automatic, low)
>         Used in: app/page.tsx
> 
> 📊 Summary:
>    Total files: 3
> 
> Enter name for your Flutter project: my-flutter-app
> Enter output directory path: ./my-flutter-app
> Creating Flutter project...
> ✅ Flutter project created successfully!
```

### Verbose Mode

For detailed analysis logs, use the `--verbose` flag:

```bash
ntrn --verbose
```

---

## 📦 Generated Structure

The converter maps your Next.js/React structure to Flutter:

```
Next.js/React          →  Flutter
─────────────────────────────────
pages/                →  lib/screens/
components/           →  lib/widgets/
lib/ or utils/        →  lib/utils/
                      →  lib/models/ (for future use)
```

### Generated Files

* `pubspec.yaml` - Flutter project configuration
* `lib/main.dart` - Entry point with basic MaterialApp
* `lib/screens/*.dart` - Screen widgets (from pages)
* `lib/widgets/*.dart` - Reusable widgets (from components)
* `lib/utils/*.dart` - Utility functions (from utils/lib)
* `android/` - Android project structure
* `ios/` - iOS project structure
* `README.md` - Project documentation

## 📚 Library Mappings

NTRN includes a comprehensive library mapping database that maps React/Next.js libraries to Flutter equivalents:

**Animation:**
* `framer-motion` → `flutter_animate`

**Icons:**
* `lucide-react` → `lucide_icons_flutter`
* `react-icons` → `flutter_icons`

**Routing:**
* `next/link` → `go_router`
* `react-router` → `go_router`

**Media:**
* `next/image` → `cached_network_image`

**State Management:**
* `zustand` → `riverpod`
* `redux` → `flutter_redux`
* `mobx` → `mobx`

**Forms:**
* `react-hook-form` → `flutter_form_builder`

**HTTP:**
* `axios` → `dio`

**Utilities:**
* `date-fns` → `intl`
* `uuid` → `uuid`

And many more! The library mapper shows conversion complexity (low/medium/high) and provides conversion notes for each library.

---

## 🎯 Current Scope (v0.3.0)

**What v0.3.0 does:**
* ✅ Analyzes Next.js/React project structure with enhanced file detection
* ✅ Parses JSX/TSX code using Babel to extract detailed component information
* ✅ Detects component types (functional, class, arrow functions)
* ✅ Extracts JSX elements, props, className values, and text content
* ✅ Identifies React hooks (useState, useEffect, etc.) and event handlers
* ✅ Maps external libraries to Flutter equivalents (30+ libraries)
* ✅ Categorizes libraries by type (animation, icons, routing, state, etc.)
* ✅ Shows library conversion complexity and notes
* ✅ Creates Flutter project with proper structure
* ✅ Maps file organization (pages→screens, components→widgets)
* ✅ Generates placeholder Dart files
* ✅ Provides verbose mode for detailed analysis logs

**What v0.3.0 does NOT do:**
* ❌ Code conversion (React/JSX → Dart/Flutter)
* ❌ Component logic translation
* ❌ State management conversion
* ❌ Styling conversion (CSS → Flutter styling)
* ❌ Dependency graph building (coming in v0.4)

**Future versions will add:**
* v0.4: Dependency & import mapping, dependency graphs
* v0.5: Component & state analysis, props and hooks mapping
* v0.6: Styling & configuration analysis
* v0.7+: Code conversion from React/JSX to Dart/Flutter widgets

---

## 📋 Next Steps After Conversion

1. Navigate to generated project:
   ```bash
   cd your-flutter-project
   ```

2. Get Flutter dependencies:
   ```bash
   flutter pub get
   ```

3. Run the app:
   ```bash
   flutter run
   ```

4. Start converting code manually or wait for future versions with automatic code conversion.

---

## 🛣 Roadmap

### Completed Versions

* **v0.1.0** ✅ - Project structure conversion and Flutter project scaffolding
* **v0.2.0** ✅ - Enhanced project analysis with improved file detection
* **v0.3.0** ✅ - Code structure analysis using Babel parser
  * Detailed component analysis (types, props, elements, hooks)
  * Library mapping database (30+ React/Next.js → Flutter mappings)
  * Enhanced analysis output with className values, text content, imports
  * Custom component vs HTML element detection

### Upcoming Versions

* **v0.4.0** - Dependency & import mapping
  * Build dependency graphs (which files import which)
  * Track component usage relationships
  * Detect circular dependencies
  * Map relative vs absolute imports

* **v0.5.0** - Component & state analysis
  * Deep React hooks analysis (useState, useEffect, useContext, etc.)
  * Component props and types detection
  * State variable usage tracking
  * Component composition mapping

* **v0.6.0** - Styling & configuration analysis
  * Detect styling methods (CSS modules, Tailwind, styled-components)
  * Extract and analyze CSS classes
  * Analyze Tailwind classes for Flutter conversion
  * Configuration file analysis (next.config.js, etc.)

* **v0.7.0+** - Code conversion
  * React/JSX → Dart/Flutter widget conversion
  * Component logic translation
  * State management mapping
  * Styling system conversion

* **v1.0.0** - Full-featured conversion with comprehensive support

---

## 🤝 Contributing

We welcome contributions! Check `CONTRIBUTING.md` before submitting PRs.

---

## ⭐ Support

If NTRN helps you:
* ⭐ Star the repo
* 🧑‍💻 Contribute
* 🔗 Share with your team

---

## 📄 License

MIT License — free for personal & commercial use.

---

<p align="center">Maintained by <b>Amey Kurade</b></p>
