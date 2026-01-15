# Gradia-AIEngine 🔍

Gradia-AIEngine is a **privacy-focused AI answering engine** that runs entirely on your own hardware. It combines knowledge from the vast internet with support for **local LLMs** (Ollama) and cloud providers (OpenAI, Claude, Groq), delivering accurate answers with **cited sources** while keeping your searches completely private.

## ✨ Features

- 🔐 **Complete privacy** - All conversations stay on your infrastructure
- 🧠 **AI-powered search** - Intelligent web search with cited sources
- 📄 **File uploads** - Upload and query PDFs, text files, images
- 🌐 **Multiple LLM support** - OpenAI, Claude, Groq, and local Ollama
- 💾 **Persistent chat history** - Powered by Neon PostgreSQL
- 🔒 **User authentication** - Secure access with Neon Auth

## 🚀 Quick Start

### Using Docker

```bash
docker run -d \
  -p 3000:3000 \
  -v gradia-data:/home/gradia-aiengine/data \
  -v gradia-uploads:/home/gradia-aiengine/uploads \
  ghcr.io/your-org/gradia-aiengine
```

### Without Docker

1. Clone the repository:
```bash
git clone https://github.com/your-org/gradia-aiengine.git
cd gradia-aiengine
```

2. Install dependencies:
```bash
yarn install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
# Edit .env.local with your configuration
```

4. Run the development server:
```bash
yarn dev
```

5. Open http://localhost:3000 in your browser.

## ⚙️ Configuration

Configure your API keys and settings in the setup wizard that appears on first run, or edit `.env.local`:

```env
DATABASE_URL=postgresql://user:password@ep-xxx.neon.tech/dbname?sslmode=require
NEON_AUTH_BASE_URL=https://ep-xxx.neonauth.us-east-1.aws.neon.tech/dbname/auth
```

## 📚 Documentation

- [Architecture](./docs/architecture/README.md)
- [Installation Guide](./docs/installation/README.md)
- [API Documentation](./docs/API/README.md)

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.
