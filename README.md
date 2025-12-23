# NTRN — Next.js/React → Flutter Converter (v0.1.0)

<p align="center">
  <img src="https://img.shields.io/badge/Version-v0.1.0-0070f3?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Flutter-02569B?style=for-the-badge&logo=flutter&logoColor=white" />
  <img src="https://img.shields.io/badge/Dart-0175C2?style=for-the-badge&logo=dart&logoColor=white" />
</p>

NTRN is a CLI tool that converts **Next.js and React projects** into **Flutter (Dart) projects**. Build cross-platform mobile apps from your web codebase.

**v0.1.0** focuses on project structure conversion - creating Flutter project scaffolding with mapped file structure. Code conversion will be added in future versions.

---

## ✨ Features (v0.1.0)

* 📊 **Project Analysis** - Analyzes Next.js/React project structure
* 📱 **Flutter Project Creation** - Generates complete Flutter project scaffold
* 🗂️ **Structure Mapping** - Maps pages → screens, components → widgets, utils → utils
* 📝 **Placeholder Files** - Creates empty Dart files ready for future code conversion
* 🚫 **Non-destructive** - Asks before overwriting existing directories

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
>    Pages: 5
>    Components: 12
>    Utils: 3
>    Total files: 20
> 
> Enter name for your Flutter project: my-flutter-app
> Enter output directory path: ./my-flutter-app
> Creating Flutter project...
> ✅ Flutter project created successfully!
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

---

## 🎯 Current Scope (v0.1.0)

**What v0.1.0 does:**
* ✅ Analyzes Next.js/React project structure
* ✅ Creates Flutter project with proper structure
* ✅ Maps file organization (pages→screens, components→widgets)
* ✅ Generates placeholder Dart files

**What v0.1.0 does NOT do:**
* ❌ Code conversion (React/JSX → Dart/Flutter)
* ❌ Component logic translation
* ❌ State management conversion
* ❌ Styling conversion (CSS → Flutter styling)

**Future versions will add:**
* Code conversion from React/JSX to Dart/Flutter widgets
* Component logic translation
* State management mapping
* Styling system conversion

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

* **v0.2.0** - Basic React component → Flutter widget conversion
* **v0.3.0** - State management conversion (useState → setState/Provider)
* **v0.4.0** - Styling conversion (CSS → Flutter styling)
* **v0.5.0** - Navigation conversion (Next.js routing → Flutter navigation)
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
