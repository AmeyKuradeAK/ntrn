# 🚀 NTRN Enhanced - Next.js to React Native Converter

```bash
  _   _ _____ ____  _   _ 
 | \ | |_   _|  _ \| \ | |
 |  \| | | | | |_) |  \| |
 | |\  | | | |  _ <| |\  |
 |_| \_| |_| |_| \_\_| \_|
``` 

> **The most powerful AI-driven CLI tool** to convert your **Next.js App Router** projects into **production-ready React Native Expo apps** with comprehensive project analysis and intelligent code transformation.

![version](https://img.shields.io/badge/version-v2.2.9-blue) 
![license](https://img.shields.io/github/license/AmeyKuradeAK/ntrn)
[![npm version](https://img.shields.io/npm/v/ntrn.svg)](https://www.npmjs.com/package/ntrn)
![stars](https://img.shields.io/github/stars/AmeyKuradeAK)

---

## 🆕 What's New in v2.2.9

🔍 **Enhanced Fix Verification System** - Every fix is verified to ensure it was actually applied correctly  
🔄 **Iterative Fix Application** - Fixes are retried up to 3 times until verification passes  
🧠 **Intelligent Unknown Issue Analysis** - AI-powered analysis for new/unknown issues not covered by surgical fixes  
✅ **Comprehensive Code Integrity Verification** - Final validation ensures syntactic correctness and React Native compatibility  
📊 **Detailed Verification Reporting** - Complete transparency on what was fixed, verified, and any failures  
💰 **Token Usage Tracking** - Real-time token monitoring with cost estimation and performance metrics  
🎯 **Surgical Precision Auto-Fixing** - Direct code manipulation for common issues without AI overhead  
🔧 **Production-Ready Output** - Guaranteed error-free code with mandatory validation before completion  

---

## ✨ Features

### 🔄 **Intelligent Conversion**
- 🧠 **Advanced AI Analysis** - Comprehensive project understanding before conversion
- 🌐 **Web API Intelligence** - Converts localStorage, geolocation, clipboard, etc. to React Native equivalents
- 📁 **Complete File Structure** - Converts entire project hierarchy, not just pages
- 🔗 **Dependency Resolution** - Smart handling of imports and cross-file dependencies
- 🎯 **Route Mapping** - Intelligent conversion of Next.js routes to React Navigation

### 🎨 **Styling & UI**
- 🌊 **NativeWind Integration** - Seamless Tailwind CSS to React Native conversion
- 💅 **Styled Components** - Optional styled-components setup with theming
- 🎨 **Native StyleSheet** - Traditional React Native styling support
- 🌙 **Dark Mode Ready** - Optional dark mode configuration

### 🧭 **Navigation & Structure** 
- 📱 **React Navigation Setup** - Automatic stack, tab, or drawer navigation
- 🔗 **Deep Linking** - Optional deep linking configuration
- 🗂 **Component Organization** - Proper screens, components, hooks, and lib structure
- 📄 **TypeScript Support** - Full TypeScript conversion and type safety

### 🛠 **Developer Experience**
- ⚙️ **Interactive Configuration** - Customize conversion settings via CLI prompts
- 📊 **Detailed Reports** - Comprehensive conversion documentation
- 🔧 **Post-Processing** - Automatic import fixing and optimization
- 🎯 **Error Handling** - Graceful error handling with detailed feedback

### ✨ **Features**

🔍 **NEW: Enhanced Fix Verification System** - Every fix is verified to ensure it was actually applied correctly  
🔄 **Iterative Fix Application** - Fixes are retried up to 3 times until verification passes  
🧠 **Intelligent Unknown Issue Analysis** - AI-powered analysis for new/unknown issues not covered by surgical fixes  
✅ **Comprehensive Code Integrity Verification** - Final validation ensures syntactic correctness and React Native compatibility  
💰 **Real-time Token Usage Tracking** - Monitor costs with detailed breakdown and estimation  
🎯 **Surgical Precision Auto-Fixing** - Direct code manipulation for common issues without AI overhead  
🔧 **Production-Ready Output** - Guaranteed error-free code with mandatory validation before completion  
📦 **Smart Dependency Management** - Auto-installs React Navigation and detects required packages based on code  
🔥 **Shadcn/ui Intelligence** - Automatically detects and converts Shadcn components to React Native equivalents  
🌐 **Web API Intelligence** - Converts browser APIs to React Native equivalents instead of removing them  
⚡ **Large Project Support** - Handles real-world codebases with progress saving and resumption  

### 🎨 **Shadcn/ui Components** *(NEW!)*

**Before (Next.js):**
```tsx
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

export function LoginForm() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Sign In</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input type="email" placeholder="Enter email" />
        <Button className="w-full" onClick={handleLogin}>
          Sign In
        </Button>
      </CardContent>
    </Card>
  )
}
```

**After (React Native):**
```tsx
import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

export function LoginForm() {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Sign In</Text>
      </View>
      <View style={styles.cardContent}>
        <TextInput
          style={styles.input}
          placeholder="Enter email"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TouchableOpacity 
          style={styles.button}
          onPress={handleLogin}
          activeOpacity={0.7}
        >
          <Text style={styles.buttonText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
// + Comprehensive styles automatically generated
```

### 🌐 **Web API Intelligence**

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

![Demo](./Public/NTRN.png)

---

## 💰 Token Usage & Pricing

NTRN uses Google's Gemini Pro API with transparent token tracking and cost estimation:

- **Small Projects (5-15 files)**: $0.005-$0.009
- **Medium Projects (20-50 files)**: $0.015-$0.030  
- **Large Projects (50-150 files)**: $0.041-$0.088
- **Enterprise Projects (150+ files)**: $0.119-$0.288

📊 **Real-time Token Tracking** - See exactly what you're spending  
🎯 **Surgical Fixes** - Common fixes use 0 tokens  
💡 **Cost Optimization** - Built-in efficiency features  

👉 **[Complete Pricing Guide](./TOKEN_USAGE_PRICING_GUIDE.md)** - Detailed cost analysis for all project sizes

---

## 📚 Documentation

- 🎯 **[Quality Improvement Demo](./QUALITY_IMPROVEMENT_DEMO.md)** - Enhanced fix verification system in action
- 🏆 **[Perfect Conversion Demo](./PERFECT_CONVERSION_DEMO.md)** - 100% working React Native code examples  
- 🌐 **[Web API Conversion Guide](./WEB_API_CONVERSION_GUIDE.md)** - Complete web API to React Native conversion reference
- 🎨 **[Shadcn/ui Conversion Guide](./SHADCN_CONVERSION_GUIDE.md)** - Automatic Shadcn component conversion
- 💰 **[Token Usage & Pricing Guide](./TOKEN_USAGE_PRICING_GUIDE.md)** - Comprehensive cost analysis and optimization
- 📊 **[Enhancement Summary](./ENHANCEMENT_SUMMARY.md)** - Complete feature evolution from v2.0 to v2.2.9

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

This project is licensed under the **APACHE 2.0 License**.  
Do whatever you want, just give credit.

---

## Made with 💙 by [Ammey Kuraaday](https://www.github.com/AmeyKuradeAK)
                        
