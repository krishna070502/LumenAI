# LumenAI 💡

### *Enlighten Yourself*

---

LumenAI is a **research-grade AI assistant** powered by cutting-edge multi-model architecture, delivering ChatGPT-level user experience with advanced reasoning, real-time research capabilities, and intelligent conversation flow.

<br>

## 🚀 **What's New - Research-Grade AI Engine**

### 🧪 **Advanced AI Architecture**
- **Two-Pass Intelligence System** - PASS 1 (tool reasoning with 70B model) → PASS 1.5 (verification) → PASS 2 (streaming synthesis with 405B model)
- **Multi-Model Orchestration** - 8B for classification, 70B for tool reasoning, 405B for final answers
- **Tool Verification** - Validates tool outputs before synthesis to ensure accuracy
- **Dynamic Tool Filtering** - Classifier-driven tool selection prevents hallucination

### ⚡ **ChatGPT-Style Streaming**
- **Smart Batching** - 30ms intervals with 15-character flush threshold for smooth, lag-free streaming
- **Real-Time Updates** - Instant title updates without page refresh
- **Optimized Performance** - No jitter or stuttering during text generation

### 🎯 **Enhanced AI Intelligence**
- **Clarification-Seeking** - AI asks for details when questions are ambiguous
- **Deep Reasoning** - Multi-angle consideration and step-by-step problem solving
- **Anticipatory Thinking** - Provides comprehensive answers with proactive context
- **Auto-Generated Follow-ups** - 3 related questions suggested after each response

### 🔬 **Research-Grade Features**
- **Semantic Search Re-ranking** - LLM selects 3-5 most relevant sources from results
- **Citation Integrity** - Advanced prompt injection defense with structured XML guards
- **Memory System** - Intelligent extraction and recall of conversation context
- **Quality Modes** - Speed, Balanced, and Quality optimization modes

<br>

## ✨ Core Features

### 🔍 **Dual Mode Intelligence**
- **Chat Mode** - Direct LLM conversation with streaming responses
- **Research Mode** - Comprehensive analysis with web search, citations, and widgets

### 🧠 **Smart AI Conversations**
- Natural, context-aware AI with clarification capabilities
- Deep reasoning with step-by-step explanations
- Multi-turn conversation with intelligent memory
- Personalized greetings and adaptive responses

### 📚 **Research & Discovery**
- AI-powered web search with semantic re-ranking
- Academic and discussion-based research options
- Source verification and citation system
- Related topics and intelligent follow-up suggestions

### 📰 **Content Discovery**
- Trending news and article recommendations
- Full article reader with AI summaries
- Bookmark and save articles for later
- NewsAPI integration for real-time content

### 🌤️ **Live Widgets**
- Real-time weather information
- Stock market data and interactive charts
- Calculator and unit conversions
- Parallel execution alongside research

### 📄 **File Intelligence**
- Upload and analyze PDFs, documents, and images
- Semantic search over uploaded files
- Extract insights and answer questions
- Vector-based similarity search

### 🎨 **Premium Experience**
- Beautiful, modern UI with smooth animations
- Dark and light mode support
- Responsive design for all devices
- Micro-interactions and polished UX

### 💾 **Personal Library**
- Persistent chat history with real-time sync
- Saved articles collection
- Organized conversation management
- Session state preservation

<br>

## 🏗️ **Technical Architecture**

### **AI Pipeline**
```
User Query → Classification (8B) → 
  ├─ PASS 1: Tool Reasoning (70B)
  ├─ PASS 1.5: Tool Verification
  ├─ Parallel: Research + Widgets
  ├─ Semantic Re-ranking
  └─ PASS 2: Streaming Synthesis (405B)
```

### **Key Technologies**
- Next.js 16.0.7 with TypeScript
- Drizzle ORM for data persistence
- Multi-model LLM orchestration (8B/70B/405B)
- Real-time streaming with smart batching
- Semantic search with embeddings
- SearxNG meta-search backend

### **Production Optimizations**
- 47 server-rendered routes
- Singleton pattern for model registry
- Conditional tool execution
- Size guards and injection defense
- Memory extraction triggers

---

<p align="center">
  <b>LumenAI - Enlighten Yourself</b>
  <br>
  <sub>© 2024 LumenAI. All rights reserved.</sub>
</p>
