# 🎭 Timing Coach

**Master natural speech timing and prosody in 15 languages.**

An AI-powered language coach that helps you sound natural when speaking a new language. Practice phrases with native-level rhythm, intonation, and timing using real-time audio coaching.

**🌐 Live Demo:** [tc.sound.fan](https://tc.sound.fan)

## ✨ Features

### 🌍 15 Languages
English, Spanish, French, German, Italian, Portuguese, Japanese, Mandarin Chinese, Korean, Arabic, Hindi, Russian, Dutch, Swedish, Turkish

### � 8 Real-World Situations
- � **Introductions** — Meeting someone for the first time
- � **Small Talk** — Casual, light conversation
- 💼 **Work Meetings** — Professional workplace discussions
- 🤝 **Networking** — Building professional connections
- ✈️ **Travel** — Navigating travel and tourism
- 🧊 **Icebreakers** — Breaking the ice in social settings
- ☕ **Catch-ups** — Reconnecting with acquaintances
- ✨ **First Impressions** — Making a memorable first impression

### 🎭 6 Delivery Styles
- 😊 **Friendly** — Warm and approachable
- 🤔 **Curious** — Genuinely interested and inquisitive
- 😐 **Dry** — Subtle, understated wit
- � **Playful** — Light-hearted and fun
- 🙏 **Humble** — Modest and self-aware
- 🧠 **Clever** — Sharp and quick-witted

### 🎙️ Real-Time Audio Coaching
- **Two-way conversation** with an AI coach via Gemini Live API
- Coach **demonstrates** the phrase first, then **listens** to your attempt
- Get **feedback in English** on timing, rhythm, and pronunciation

### 📊 Prosody Visualization
- See the **coach's speech waveform** as a reference pattern
- See **your speech waveform** overlaid in real-time
- **Drag to align** your waveform with the coach's
- **Scroll to stretch** for granularity matching

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Create .env file
echo "VITE_GEMINI_API_KEY=your_api_key_here" > .env

# Run locally
npm run dev

# Deploy to Firebase Hosting
npm run deploy
```

Get your API key from [Google AI Studio](https://aistudio.google.com/)

## 📦 Tech Stack

| Component | Technology |
|-----------|------------|
| Build | Vite |
| AI (Text) | Gemini 2.5 Flash |
| AI (Audio) | Gemini 2.5 Flash Native Audio |
| Audio I/O | Web Audio API |
| Hosting | Firebase Hosting |

## 📄 License

MIT

---
*Built with ❤️ using Google Gemini*
