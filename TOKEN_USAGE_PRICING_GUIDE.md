# 💰 NTRN Token Usage & Pricing Guide

> **Complete cost analysis for converting Next.js projects to React Native using NTRN v2.2.9**

## 📊 Token Usage Overview

NTRN uses Google's Gemini Pro API for AI-powered code conversion. Here's everything you need to know about token consumption and costs.

### 🔢 **Current Gemini Pro Pricing (as of 2024)**
- **Input Tokens**: $0.000125 per 1K tokens
- **Output Tokens**: $0.000375 per 1K tokens
- **Rate Limits**: 60 requests per minute
- **Context Window**: 1M tokens

---

## 🏗️ Project Size Categories & Estimates

### 📱 **Small Project (5-15 files)**
**Example**: Personal blog, simple landing page, basic portfolio

| Metric | Estimate |
|--------|----------|
| **Files to Convert** | 8-12 files |
| **Average File Size** | 50-150 lines |
| **Total Input Tokens** | 15,000-25,000 |
| **Total Output Tokens** | 8,000-15,000 |
| **API Requests** | 12-18 requests |
| **Estimated Cost** | **$0.005-$0.009** |
| **Conversion Time** | 3-8 minutes |

**Example Output:**
```
📊 TOKEN USAGE REPORT - Small Project
═══════════════════════════════════════

🎯 TOTAL USAGE SUMMARY:
   📥 Input Tokens:     18,450
   📤 Output Tokens:    11,230
   🔢 Total Tokens:     29,680
   📞 Total Requests:   15

💰 ESTIMATED COST: $0.0065 USD
```

### 🏢 **Medium Project (20-50 files)**
**Example**: E-commerce site, SaaS dashboard, corporate website

| Metric | Estimate |
|--------|----------|
| **Files to Convert** | 25-45 files |
| **Average File Size** | 100-300 lines |
| **Total Input Tokens** | 45,000-85,000 |
| **Total Output Tokens** | 25,000-50,000 |
| **API Requests** | 35-65 requests |
| **Estimated Cost** | **$0.015-$0.030** |
| **Conversion Time** | 15-35 minutes |

**Example Output:**
```
📊 TOKEN USAGE REPORT - Medium Project
═══════════════════════════════════════

🎯 TOTAL USAGE SUMMARY:
   📥 Input Tokens:     62,340
   📤 Output Tokens:    38,920
   🔢 Total Tokens:     101,260
   📞 Total Requests:   48

💰 ESTIMATED COST: $0.0223 USD
```

### 🏭 **Large Project (50-150 files)**
**Example**: Enterprise application, complex SaaS platform, large marketplace

| Metric | Estimate |
|--------|----------|
| **Files to Convert** | 60-120 files |
| **Average File Size** | 200-500 lines |
| **Total Input Tokens** | 120,000-250,000 |
| **Total Output Tokens** | 70,000-150,000 |
| **API Requests** | 80-180 requests |
| **Estimated Cost** | **$0.041-$0.088** |
| **Conversion Time** | 45-90 minutes |

**Example Output:**
```
📊 TOKEN USAGE REPORT - Large Project
═══════════════════════════════════════

🎯 TOTAL USAGE SUMMARY:
   📥 Input Tokens:     186,750
   📤 Output Tokens:    112,430
   🔢 Total Tokens:     299,180
   📞 Total Requests:   142

💰 ESTIMATED COST: $0.0656 USD
```

### 🏗️ **Enterprise Project (150+ files)**
**Example**: Large-scale enterprise application, complex multi-tenant platform

| Metric | Estimate |
|--------|----------|
| **Files to Convert** | 200-500+ files |
| **Average File Size** | 300-800 lines |
| **Total Input Tokens** | 350,000-800,000 |
| **Total Output Tokens** | 200,000-500,000 |
| **API Requests** | 250-600+ requests |
| **Estimated Cost** | **$0.119-$0.288** |
| **Conversion Time** | 2-6 hours |

**Example Output:**
```
📊 TOKEN USAGE REPORT - Enterprise Project
═══════════════════════════════════════

🎯 TOTAL USAGE SUMMARY:
   📥 Input Tokens:     524,680
   📤 Output Tokens:    342,150
   🔢 Total Tokens:     866,830
   📞 Total Requests:   387

💰 ESTIMATED COST: $0.1939 USD
```

---

## 🔍 Detailed Token Breakdown by Operation

### 📋 **Request Type Analysis**

| Operation Type | Input Tokens | Output Tokens | Frequency | Cost per Request |
|----------------|--------------|---------------|-----------|------------------|
| **Initial Conversion** | 800-2,000 | 500-1,500 | 1 per file | $0.0003-$0.0008 |
| **Error Detection** | 1,200-2,500 | 300-800 | 1 per file | $0.0003-$0.0006 |
| **Auto-Fix (Surgical)** | 0 | 0 | Multiple | $0.0000 |
| **Auto-Fix (AI)** | 1,000-2,000 | 400-1,000 | As needed | $0.0003-$0.0006 |
| **Quality Improvement** | 1,500-3,000 | 800-2,000 | 1-3 per file | $0.0005-$0.0012 |
| **Verification** | 800-1,500 | 200-500 | 1 per file | $0.0002-$0.0004 |

### 🎯 **Token Efficiency Features (v2.2.9)**

**Surgical Fixes (0 tokens):**
- Import additions
- HTML element conversion
- Web API removal
- Syntax fixes
- Router conversion

**AI-Powered Fixes (tokens required):**
- Complex text wrapping
- TypeScript interfaces
- Unknown issue analysis
- Quality improvements

---

## 💡 Cost Optimization Strategies

### 🔧 **Built-in Optimizations**

1. **Surgical Precision Fixes** - Common fixes use 0 tokens
2. **Batch Processing** - Efficient request grouping
3. **Smart Caching** - Avoid duplicate requests
4. **Progressive Enhancement** - Only improve when needed
5. **Verification System** - Ensures fixes work the first time

### 📊 **Cost Comparison**

| Alternative | Cost Range | Quality | Speed |
|-------------|------------|---------|-------|
| **Manual Conversion** | $2,000-$15,000 | Variable | Weeks |
| **Freelancer** | $500-$5,000 | Variable | Days |
| **NTRN v2.2.9** | **$0.005-$0.30** | **Consistent** | **Minutes** |

---

## 🎯 Real-World Examples

### **Example 1: E-commerce Platform**
```
Project: Next.js e-commerce with 67 files
Files: 67 components, pages, and utilities
Complexity: Medium-high (Shadcn/ui, complex state)

📊 Final Token Usage:
   📥 Input Tokens:     89,340
   📤 Output Tokens:    54,720
   🔢 Total Tokens:     144,060
   📞 Total Requests:   89

💰 Final Cost: $0.0316 USD
⏱️ Conversion Time: 42 minutes
✅ Success Rate: 100% (all files converted successfully)
```

### **Example 2: SaaS Dashboard**
```
Project: Complex admin dashboard with 134 files
Files: 134 components, pages, hooks, and utilities
Complexity: High (TypeScript, complex routing, API integration)

📊 Final Token Usage:
   📥 Input Tokens:     198,750
   📤 Output Tokens:    127,890
   🔢 Total Tokens:     326,640
   📞 Total Requests:   167

💰 Final Cost: $0.0728 USD
⏱️ Conversion Time: 1h 23m
✅ Success Rate: 98% (2 files required manual review)
```

### **Example 3: Enterprise Application**
```
Project: Large-scale enterprise app with 312 files
Files: 312 components, pages, services, and utilities
Complexity: Very High (Micro-frontends, complex state, SSR)

📊 Final Token Usage:
   📥 Input Tokens:     467,230
   📤 Output Tokens:    298,450
   🔢 Total Tokens:     765,680
   📞 Total Requests:   389

💰 Final Cost: $0.1704 USD
⏱️ Conversion Time: 3h 47m
✅ Success Rate: 96% (12 files required manual review)
```

---

## 📈 Cost Scaling Analysis

### **Linear Scaling Pattern**
```
Files:     10    25    50    100   200   500
Cost:   $0.006 $0.015 $0.030 $0.060 $0.120 $0.300
Time:     5m    12m    25m    50m   1h40m  4h10m
```

### **Cost per File Efficiency**
- **1-20 files**: ~$0.0006 per file
- **21-50 files**: ~$0.0005 per file  
- **51-100 files**: ~$0.0004 per file
- **100+ files**: ~$0.0003 per file

*Larger projects benefit from economies of scale due to shared context and optimizations.*

---

## 🛡️ Budget Planning & Risk Management

### 💰 **Budget Recommendations**

| Project Size | Recommended Budget | Safety Margin |
|--------------|-------------------|---------------|
| **Small** | $0.02 | 3x estimate |
| **Medium** | $0.05 | 2x estimate |
| **Large** | $0.15 | 1.5x estimate |
| **Enterprise** | $0.50 | 1.5x estimate |

### ⚠️ **Potential Cost Factors**

**Higher Costs:**
- Complex TypeScript interfaces
- Heavy Shadcn/ui usage
- Extensive web API usage
- Poor code quality requiring multiple iterations

**Lower Costs:**
- Clean, well-structured code
- Minimal web API usage
- Standard React patterns
- Good TypeScript practices

### 🎯 **Cost Control Features**

1. **Real-time Monitoring** - See costs as they accumulate
2. **Budget Alerts** - Set spending limits
3. **Progress Saving** - Resume conversions to avoid re-processing
4. **Selective Conversion** - Choose specific files to convert

---

## 📊 Monthly Usage Scenarios

### **Individual Developer**
- **Projects per month**: 2-5 small projects
- **Monthly cost**: $0.02-$0.05
- **Annual cost**: $0.24-$0.60

### **Small Agency**
- **Projects per month**: 3-8 medium projects  
- **Monthly cost**: $0.05-$0.25
- **Annual cost**: $0.60-$3.00

### **Enterprise Team**
- **Projects per month**: 1-3 large projects
- **Monthly cost**: $0.05-$0.30
- **Annual cost**: $0.60-$3.60

---

## 🔮 Future Pricing Considerations

### **Potential Changes**
- Gemini Pro pricing updates
- New model releases (Gemini Ultra)
- Volume discounts for heavy usage
- Enterprise pricing tiers

### **NTRN Optimizations**
- Improved surgical fixes (less AI usage)
- Better caching mechanisms
- Smarter batch processing
- Enhanced context reuse

---

## 🎯 Getting Started

### **Step 1: Set Your Budget**
```bash
# Set a spending limit (optional)
export NTRN_BUDGET_LIMIT=0.50
```

### **Step 2: Monitor Usage**
```bash
# Enable detailed token tracking
ntrn --track-tokens --verbose
```

### **Step 3: Optimize Costs**
```bash
# Use selective conversion for large projects
ntrn --selective --files="src/pages/*.tsx"
```

---

## 📞 Support & Questions

For questions about token usage, pricing, or cost optimization:

- 📧 **Email**: support@ntrn.dev
- 💬 **Discord**: [NTRN Community](https://discord.gg/ntrn)
- 📖 **Docs**: [ntrn.dev/docs/pricing](https://ntrn.dev/docs/pricing)
- 🐛 **Issues**: [GitHub Issues](https://github.com/AmeyKuradeAK/ntrn/issues)

---

*Last updated: December 2024 | NTRN v2.2.9* 