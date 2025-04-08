# 🚀 next-to-react-native

```bash
  _   _ _____ ____  _   _ 
 | \ | |_   _|  _ \| \ | |
 |  \| | | | | |_) |  \| |
 | |\  | | | |  _ <| |\  |
 |_| \_| |_| |_| \_\_| \_|
``` 

> Effortlessly convert your **Next.js App Router** project into a **fully functional React Native Expo app** using this zero-config CLI tool.

![version](https://img.shields.io/github/package-json/v/AmeyKuradeAK/ntrn?filename=package.json?color=blue) 
![license](https://img.shields.io/github/license/AmeyKuradeAK/ntrn)
![stars](https://img.shields.io/github/stars/AmeyKuradeAK)

---

## ✨ Features

- ⚡️ Instantly converts your Next.js `app/` directory to React Native screens
- 📦 Transforms `layout.tsx` into `App.tsx`
- 🎯 Handles `page.tsx` and routes into Expo-compatible screens
- 🧠 Powered by Gemini API for JSX → React Native conversion
- 🎨 Tailwind CSS support via NativeWind
- 🗂 Creates React Native standard structure (screens, assets, etc.)
- 📋 Outputs required dependencies in `requirements.txt`

---

## 📦 Installation

You will require:
  1. Node JS
  2. Gemini API
  3. clone repo from GitHub.

> Process to work on.
>   1. Update .env file from project
>   2. ```npm link``` 

```bash
npm install -g ntrn
```
> After installing and setting up repo and .env

to update the ntrn
```bash
npm link
```

---

## 🚀 Quick Start

```bash
ntrn
```

Run this command inside the root of your **Next.js App Router** project.  
It will generate a complete **Expo React Native app** inside `converted-react-native/`.

---

## 📂 File & Folder Mapping

| From (Next.js)        | To (React Native)           |
|-----------------------|-----------------------------|
| `app/layout.tsx`      | `App.tsx`                   |
| `app/page.tsx`        | `screens/HomeScreen.tsx`    |
| `public/`             | `assets/`                   |
| `@/components/*`      | Preserved and reused        |

---

## ⚙️ CLI Options

```bash
ntrn --help
```

| Option       | Description                                 |
|--------------|---------------------------------------------|
| `--version`  | Show CLI version                            |
| `--convert`  | Convert `app/` directory to React Native     |
| `--tailwind` | Enable Tailwind detection (NativeWind auto) |

---

## 📸 Terminal Demo

![demo](./demo.gif)

---

## 🧠 Powered By

- [Gemini API](https://ai.google.dev/)
- [Expo](https://expo.dev/)
- [NativeWind](https://www.nativewind.dev/)
- [React Native](https://reactnative.dev/)
- Built with ❤️ for developers

---

## 🧪 Roadmap

- [ ] Automatic dependency installation (optional)
- [ ] Tailwind class converter (full support)
- [ ] CLI config file support
- [ ] Auto-detect `pages/` routing fallback
- [ ] Dark mode README and Docs

---

## 🤝 Contributing

We love contributions!  
Please check out our [CONTRIBUTING.md](CONTRIBUTING.md) before submitting a pull request.

You can:
- Open issues 🐛
- Suggest new features 🌟
- Improve the CLI or documentation 🛠

---

## 🌍 Community

Join discussions, ask questions, and share ideas:

- [GitHub Discussions](https://github.com/your-org/next-to-react-native/)
- [Twitter (Formarly known as X)](https://x.com/KuradeAmey/) (mention us!)
- [Reddit](https://www.reddit.com/user/Live_Ratio_4906/)

---

## 📫 Stay in Touch

If you like this project, show some ❤️

- ⭐ Star the repo  
- 🐦 Tweet about it  
- 📢 Share with your team  

---

## 📄 License

This project is licensed under the **MIT License**.  
Do whatever you want, just give credit.

---

## Made with 💙 by [Ammey Kuraaday](https://www.github.com/AmeyKuradeAK)
                        
