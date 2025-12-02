# Zayna - Privacy-First Meeting Intelligence

Zayna is an intelligent meeting assistant built with a **Zero-Retention Architecture**. It records, transcribes, and analyzes meetings entirely within the browser, ensuring your data never leaves your device permanently.

## Features

*   **🔒 Local Vault**: Data is stored encrypted in `localStorage`, not on a cloud database.
*   **⚡ Ephemeral Processing**: Audio is sent to Gemini AI for processing and immediately discarded.
*   **📊 Behavioral Analytics**: Sentiment analysis, speaker dominance, and EQ coaching.
*   **💬 Ask Zayna**: A local RAG (Retrieval Augmented Generation) agent to query your meeting history.
*   **📝 Zayna Notes**: Real-time dictation, translation (15+ languages), and rich text notes.
*   **📹 Universal Capture**: Records Microphone or System Audio (Zoom/Teams/Meet) via screen capture.

## Setup & Usage

1.  **API Key**: This project requires a Google Gemini API Key.
    *   Set your API key in the environment configuration (or `.env` file if running locally with a bundler).
    *   The app expects the key at `process.env.API_KEY`.

2.  **Privacy**: Zayna is designed to be GDPR, HIPAA, and SOC2 compatible by minimizing data processing scope. No recordings are stored on servers.

## Deployment

### Vercel Deployment

1. Fork this repository to your GitHub account
2. Create a new project on Vercel
3. Connect your forked repository to Vercel
4. Add your `GEMINI_API_KEY` as an environment variable in your Vercel project settings
5. Deploy!

Note: Never commit your API key to the repository. The `.env` and `.env.local` files are gitignored for security.

## Tech Stack

*   React 19
*   TypeScript
*   Tailwind CSS
*   Google Gemini API (Multimodal Live & Flash models)