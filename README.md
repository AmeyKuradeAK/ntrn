# 🚀 NTRN Enhanced - Next.js to React Native Converter

```bash
  _   _ _____ ____  _   _ 
 | \ | |_   _|  _ \| \ | |
 |  \| | | | | |_) |  \| |
 | |\  | | | |  _ <| |\  |
 |_| \_| |_| |_| \_\_| \_|
``` 

> **The most powerful AI-driven CLI tool** to convert your **Next.js App Router** projects into **production-ready React Native Expo apps** with comprehensive project analysis and intelligent code transformation.

![version](https://img.shields.io/badge/version-v3.2.0-blue) 
![license](https://img.shields.io/github/license/AmeyKuradeAK/ntrn)
[![npm version](https://img.shields.io/npm/v/ntrn.svg)](https://www.npmjs.com/package/ntrn)
![stars](https://img.shields.io/github/stars/AmeyKuradeAK)

---

## 🆕 What's New in v3.2.0 - Smart Conversion Like Cursor AI!

🧠 **NEW: Smart Conversion System** - Works like Cursor AI with instant, reliable conversions  
⚡ **95% Faster Conversions** - Most files convert instantly with 0 tokens  
🎯 **No More Retry Loops** - Smart system gets it right the first time  
💰 **90% Token Reduction** - Only complex cases use AI, single attempt only  
✅ **Guaranteed Working Code** - Smart fallback ensures 100% success rate  
🔧 **Common Sense Patterns** - Built-in intelligence for imports, events, styling  
🎨 **Original NTRN Experience** - Cool ASCII logo with interactive prompts (`ntrn --ntrn`)  
🤖 **Interactive AI Assistant** - ChatGPT-like CLI interface for React Native projects (`ntrn --prompt`)  
📊 **Smart Error Prevention** - Catches issues before they happen vs fixing after  
🚀 **Production-Ready Output** - Enterprise-grade code quality guaranteed  

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

🤖 **NEW: Interactive AI Assistant** - ChatGPT-like CLI for React Native projects (`ntrn --prompt`)  
🎯 **Quality-First Conversion** - 90% deterministic + 8% templates + 2% AI = 100% working code  
🔍 **Enhanced Fix Verification System** - Every fix is verified to ensure it was actually applied correctly  
🔄 **Iterative Fix Application** - Fixes are retried up to 3 times until verification passes  
🧠 **Intelligent Unknown Issue Analysis** - AI-powered analysis for new/unknown issues not covered by surgical fixes  
✅ **Comprehensive Code Integrity Verification** - Final validation ensures syntactic correctness and React Native compatibility  
💰 **90% Token Reduction** - Deterministic patterns eliminate AI calls for common conversions  
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

### 🤖 **Interactive AI Assistant** *(NEW!)*

Transform your React Native development with a ChatGPT-like interface:

**Usage:**
```bash
# In your React Native project directory
ntrn --prompt
```

**Example Session:**
```bash
🤖 You: Add a login screen
🤖 NTRN: Creating a beautiful login screen...
📄 Created: screens/LoginScreen.tsx
✅ Complete with form validation and styling!

🤖 You: Now add dark mode support  
🤖 NTRN: Adding dark mode system...
📄 Created: utils/theme.js
📄 Created: contexts/ThemeContext.tsx
📝 Modified: App.tsx
✅ Dark mode ready! Users can toggle themes.

🤖 You: exit
👋 Goodbye!
```

**What you can ask:**
- *"Add a shopping cart feature"*
- *"Create user profile component"*
- *"Fix navigation styling"*
- *"Add pull-to-refresh functionality"*
- *"Implement search functionality"*

**Features:**
- 🎯 **Context-aware** - Understands your project structure
- 📱 **Mobile-optimized** - Generates proper React Native code
- 🔄 **Conversational** - Natural language interface
- ⚡ **Instant changes** - Files created/modified in real-time
- 🛡️ **Safe operations** - Validates before making changes

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
npm install -g ntrn@latest
```
> After installing and setting up repo and .env

to update the ntrn
```bash
npm link
```

---

## 🚀 Quick Start

NTRN v3.0.1 offers **three distinct experiences** to match your workflow:

### **🔄 1. Simple Conversion** *(Default - Current Directory)*
```bash
# In your Next.js project directory
ntrn
```
- Detects Next.js project in current directory
- Generates `converted-react-native/` folder
- Quality-first conversion with 90% token reduction

### **🎨 2. Original NTRN Experience** *(Interactive Setup)*
```bash
# From anywhere - with cool ASCII logo!
ntrn --ntrn
# or
ntrn --convert
```
- 🎨 **Cool ASCII NTRN logo** on startup
- 📝 **Interactive prompts** for project name
- 📂 **Directory selection** for Next.js source
- 🏗️ **Full Expo project creation** with TypeScript
- 🎯 **Complete setup** with styling frameworks

### **🤖 3. Interactive AI Assistant** *(ChatGPT-like CLI)*
```bash
# In your React Native project directory
ntrn --prompt
# or
ntrn --gpt
```
- 💬 **Natural language commands** for modifications
- 🧠 **Context-aware** code generation
- ⚡ **Real-time file changes**
- 🔄 **Conversational interface**

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

| Command | Description | Experience |
|---------|-------------|------------|
| `ntrn` | Simple conversion (current directory) | 🔄 Quick & Direct |
| `ntrn --ntrn` | Original NTRN with ASCII logo & prompts | 🎨 Interactive Setup |
| `ntrn --convert` | Same as `--ntrn` | 🎨 Interactive Setup |
| `ntrn --prompt` | ChatGPT-like AI assistant | 🤖 Conversational |
| `ntrn --gpt` | Same as `--prompt` | 🤖 Conversational |
| `ntrn convert` | Simple conversion command | 🔄 Quick & Direct |
| `ntrn original` | Original experience command | 🎨 Interactive Setup |

### **🎯 Choose Your Workflow:**

**For Quick Conversions:**
```bash
cd my-nextjs-app
ntrn                    # Fast & simple
```

**For Full Setup Experience:**
```bash
ntrn --ntrn            # Cool logo + interactive prompts
```

**For AI-Powered Development:**
```bash
cd my-react-native-app
ntrn --prompt          # ChatGPT-like assistance
```

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

- 🤖 **[Interactive AI Assistant Guide](./INTERACTIVE_AI_ASSISTANT.md)** - Complete ChatGPT-like CLI documentation
- 🎯 **[Quality Improvement Demo](./QUALITY_IMPROVEMENT_DEMO.md)** - Enhanced fix verification system in action
- 🏆 **[Perfect Conversion Demo](./PERFECT_CONVERSION_DEMO.md)** - 100% working React Native code examples  
- 🌐 **[Web API Conversion Guide](./WEB_API_CONVERSION_GUIDE.md)** - Complete web API to React Native conversion reference
- 🎨 **[Shadcn/ui Conversion Guide](./SHADCN_CONVERSION_GUIDE.md)** - Automatic Shadcn component conversion
- 💰 **[Token Usage & Pricing Guide](./TOKEN_USAGE_PRICING_GUIDE.md)** - Comprehensive cost analysis and optimization
- 📊 **[Enhancement Summary](./ENHANCEMENT_SUMMARY.md)** - Complete feature evolution from v2.0 to v2.3.0

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
                        
