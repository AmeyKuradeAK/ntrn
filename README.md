# NTRN — Next.js/React → Flutter Converter (v0.7.0)

<p align="center">
  <img src="https://img.shields.io/badge/Version-v0.7.0-0070f3?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Flutter-02569B?style=for-the-badge&logo=flutter&logoColor=white" />
  <img src="https://img.shields.io/badge/Dart-0175C2?style=for-the-badge&logo=dart&logoColor=white" />
</p>

NTRN is a CLI tool that converts **Next.js and React projects** into **Flutter (Dart) projects**. Build cross-platform mobile apps from your web codebase.

**v0.7.0** provides comprehensive React component and state analysis, styling and configuration analysis, and **basic JSX to Flutter widget conversion**. Convert simple React components to Flutter widgets with HTML element mapping, attribute conversion, and basic nesting support.

---

## ✨ Features (v0.7.0)

* 📊 **Comprehensive Project Analysis** - Deep analysis of Next.js/React project structure
* 🔍 **Code Structure Parsing** - Uses Babel to parse JSX/TSX and extract detailed component information
* 🎣 **Deep Hook Analysis** - Analyzes useState, useEffect, useContext, useRef, useMemo, useCallback, useReducer with dependencies and side effects
* 📦 **Component Props Analysis** - Extracts prop names, types (TypeScript/PropTypes), default values, and required vs optional
* 🔄 **State Variable Tracking** - Tracks state variables, their initial values, read/update locations, and props flow
* 🎯 **Event Handler Analysis** - Analyzes event handlers, their state usage, actions, and call chains
* 🌲 **Component Composition Mapping** - Maps parent-child component relationships and props flow
* 🔗 **Dependency Mapping** - Builds dependency graphs showing file relationships and imports
* ⚠️ **Circular Dependency Detection** - Identifies circular dependencies in your codebase
* 📦 **Library Mapping** - Maps React/Next.js libraries to Flutter equivalents (30+ libraries)
* 🎯 **Component Usage Tracking** - Tracks which components are used where
* 🔄 **Lifecycle Method Detection** - Analyzes class component lifecycle methods
* 🎨 **Styling Analysis** - Detects styling methods (Tailwind, CSS Modules, styled-components, inline styles)
* 🎯 **Tailwind Class Analysis** - Analyzes Tailwind classes (colors, spacing, typography, layout, breakpoints)
* 🎨 **Design Token Extraction** - Extracts color schemes, fonts, spacing patterns, and breakpoints
* 📄 **CSS File Analysis** - Analyzes CSS/CSS module files and extracts class selectors
* ⚙️ **Configuration Analysis** - Analyzes next.config.js, tsconfig.json, tailwind.config.js
* 🛣️ **Routing Pattern Detection** - Detects Pages Router vs App Router, dynamic routes, route groups
* 🔌 **API Route Identification** - Identifies and analyzes API routes with HTTP methods
* 🌍 **Environment File Analysis** - Analyzes .env files and extracts variables
* 📱 **Flutter Project Creation** - Generates complete Flutter project scaffold
* 🗂️ **Structure Mapping** - Maps pages → screens, components → widgets, utils → utils
* 🔄 **JSX to Flutter Conversion** - Converts basic JSX elements to Flutter widgets (v0.7)
* 🎯 **HTML Element Mapping** - Maps div, button, input, img, text elements to Flutter widgets
* 🔧 **Attribute Conversion** - Converts onClick→onPressed, onChange→onChanged, value, disabled
* 📦 **Component Structure** - Converts functional components to StatelessWidget classes
* 🌳 **Nested Structures** - Handles parent-child widget relationships and JSX fragments
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
> 🎨 Styling Analysis:
>    Methods: Tailwind CSS
>    Tailwind Classes: 109 total
>      Colors: 15, Spacing: 28, Typography: 12, Layout: 18
>      Breakpoints: sm, md, lg
>      Most used: flex, p-4, bg-blue-500, text-white, rounded
>    Colors: blue, red, green, slate, gray
>    Fonts: sans, serif
>    Spacing scale: 0, 1, 2, 4, 8, 12, 16, 24, 32
>    CSS Files: 0
>    Inline Styles: 0 usage(s)
> 
> ⚙️  Configuration Analysis:
>    Next.js Config: found
>      Image Optimization: enabled
>    Routing: App Router
>      App Router: 1 route(s)
>        Layouts: 1
>    API Routes: (none found)
>    TypeScript Config: found
>      Path aliases: @/*
>    Tailwind Config: found
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

## 🎯 Current Scope (v0.7.0)

**What v0.7.0 does:**
* ✅ Analyzes Next.js/React project structure with enhanced file detection
* ✅ Parses JSX/TSX code using Babel to extract detailed component information
* ✅ Detects component types (functional, class, arrow functions)
* ✅ Extracts JSX elements, props, className values, and text content
* ✅ Identifies React hooks (useState, useEffect, etc.) and event handlers
* ✅ Maps external libraries to Flutter equivalents (30+ libraries)
* ✅ Categorizes libraries by type (animation, icons, routing, state, etc.)
* ✅ Shows library conversion complexity and notes
* ✅ Builds dependency graphs showing file relationships
* ✅ Detects circular dependencies
* ✅ Tracks component usage across files
* ✅ Resolves path aliases (@/, ~/) from tsconfig.json/jsconfig.json
* ✅ Deep React hooks analysis (useState, useEffect, useContext, etc.) with dependencies
* ✅ Component props analysis with TypeScript types and default values
* ✅ State variable tracking (names, initial values, read/update locations)
* ✅ Event handler analysis (what state they use, what actions they perform)
* ✅ Component composition mapping (parent-child relationships, props flow)
* ✅ Custom hooks detection and tracking
* ✅ Lifecycle method detection for class components
* ✅ Styling method detection (Tailwind, CSS Modules, styled-components, inline styles)
* ✅ Tailwind CSS class analysis and categorization
* ✅ Design token extraction (colors, fonts, spacing, breakpoints)
* ✅ CSS file analysis (modules and global CSS)
* ✅ Next.js configuration analysis (next.config.js)
* ✅ TypeScript configuration analysis (tsconfig.json, path aliases)
* ✅ Tailwind configuration analysis
* ✅ Routing pattern detection (Pages Router, App Router, dynamic routes)
* ✅ API route identification and HTTP method extraction
* ✅ Environment file analysis (.env files)
* ✅ Creates Flutter project with proper structure
* ✅ Maps file organization (pages→screens, components→widgets)
* ✅ Converts basic JSX elements to Flutter widgets (v0.7)
* ✅ Maps HTML elements (div, button, input, img, etc.) to Flutter widgets
* ✅ Converts JSX attributes (onClick, onChange, value, disabled)
* ✅ Handles JSX fragments and nested structures
* ✅ Generates StatelessWidget classes from functional components
* ✅ Provides verbose mode for detailed analysis logs

**What v0.7.0 does NOT do:**
* ❌ State management conversion (useState, useEffect → StatefulWidget) - v0.8
* ❌ Styling conversion (CSS/Tailwind → Flutter styling) - v0.9
* ❌ Complex expressions (array.map, conditional rendering) - v0.8
* ❌ Routing and navigation conversion - v0.10
* ❌ API and authentication conversion - v0.10

**Future versions will add:**
* v0.8: Props, State & Event Handlers conversion (useState, useEffect → StatefulWidget)
* v0.9: Styling conversion (CSS/Tailwind → Flutter styling)
* v0.10: SSR→CSR conversion, Auth, Database & API integration

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

4. Review converted Flutter widgets and complete TODOs (state, styling, complex expressions)

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
* **v0.4.0** ✅ - Dependency & import mapping
  * Build dependency graphs (which files import which)
  * Track component usage relationships
  * Detect circular dependencies
  * Map relative vs absolute imports
  * Path alias resolution (@/, ~/)
  * Import statistics and categorization
* **v0.5.0** ✅ - Component & state analysis
  * Deep React hooks analysis (useState, useEffect, useContext, useRef, useMemo, useCallback, useReducer)
  * Component props and types detection (TypeScript, PropTypes)
  * State variable usage tracking (read/update locations, props flow)
  * Event handler analysis (state usage, actions, call chains)
  * Component composition mapping (parent-child relationships, props flow)
  * Custom hooks detection and tracking
  * Lifecycle method detection for class components
* **v0.6.0** ✅ - Styling & configuration analysis
  * Styling method detection (Tailwind, CSS Modules, styled-components, Emotion, inline styles)
  * Tailwind CSS class analysis (colors, spacing, typography, layout, breakpoints)
  * Design token extraction (colors, fonts, spacing scale, breakpoints)
  * CSS file analysis (CSS modules and global CSS files)
  * Next.js configuration analysis (next.config.js with redirects, rewrites, headers)
  * TypeScript configuration analysis (tsconfig.json, path aliases)
  * Tailwind configuration detection
  * Routing pattern detection (Pages Router vs App Router, dynamic routes, route groups)
  * API route identification (Pages Router and App Router API routes with HTTP methods)
  * Environment file analysis (.env files and variables)
* **v0.7.0** ✅ - Basic JSX to Flutter Widget Conversion
  * HTML element mapping (div→Container, button→ElevatedButton, input→TextField, img→Image, etc.)
  * JSX attribute conversion (onClick→onPressed, onChange→onChanged, value, disabled)
  * Component structure conversion (functional components → StatelessWidget)
  * JSX fragment handling (<>...</> → Column/Row)
  * Nested structure conversion (parent-child widget relationships)
  * Custom component references (with placeholder imports)
  * Basic event handler mapping (function stubs)

### Upcoming Versions

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

GPL-3.0 License — free for personal & commercial use.

---

<p align="center">Maintained by <b>Ammey Kuraaday</b></p>
