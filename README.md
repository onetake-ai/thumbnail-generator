# Social Media Variation Tool

Internal tool for the OneTake AI social media team to generate title variations, thumbnails, and descriptions for video content across multiple platforms.

## Features

- **3 title variations** per generation (curiosity, benefit, and bold angles)
- **AI-generated thumbnails** in the correct aspect ratio for each platform, incorporating uploaded presenter screenshots
- **Platform-specific descriptions** with hashtags and call to action
- **Multi-platform support**: YouTube, YT Shorts, Instagram, IG Reels, LinkedIn, X/Twitter, TikTok
- **Multi-language support**: French, English, Spanish, Portuguese, German, Italian, Dutch, Japanese, Chinese, Korean, Arabic
- **Editable color palette** defaulting to OneTake brand colors
- **Copy to clipboard** for titles and descriptions
- **Download** for generated thumbnails
- **Progress indicators** for each thumbnail being generated

## Setup

1. Open `index.html` in a browser — no build step required
2. Enter your OpenAI API key (optionally save it to local storage)
3. Fill in the video title, optional transcript, upload screenshots, select platforms and language
4. Click **Generate Variations**

## Tech Stack

- Vanilla HTML / CSS / JavaScript (no frameworks, no build tools)
- [Montserrat](https://fonts.bunny.net/family/montserrat) font via Bunny Fonts
- OpenAI API:
  - `gpt-5-mini` for text generation (titles, thumbnail prompts, descriptions)
  - `gpt-image-1.5` for thumbnail generation

## Project Structure

```
├── index.html                        # Main application page
├── styles.css                        # All styles (brand colors, responsive layout)
├── app.js                            # Application logic and API calls
└── prompts/
    ├── text-generation.json          # System + user prompt for title/description generation
    └── image-generation.json         # Prompt template + size map for thumbnail generation
```

## Customizing Prompts

The prompts sent to OpenAI are stored in `prompts/` as JSON files so they can be reviewed and edited without touching application code:

- **`text-generation.json`** — Contains the system prompt that instructs the LLM on how to generate titles, thumbnail concepts, and descriptions. Also contains the user prompt template with `{{placeholders}}` for dynamic values.
- **`image-generation.json`** — Contains the image generation prompt template, quality setting, and the size map that maps each platform to its correct thumbnail dimensions.

## Platform Thumbnail Sizes

| Platform       | Aspect Ratio | Generation Size |
|----------------|:------------:|:---------------:|
| YouTube        | 16:9         | 1536 × 1024    |
| YT Shorts      | 9:16         | 1024 × 1536    |
| Instagram      | 1:1          | 1024 × 1024    |
| IG Reels       | 9:16         | 1024 × 1536    |
| LinkedIn       | ~1.91:1      | 1536 × 1024    |
| X / Twitter    | 16:9         | 1536 × 1024    |
| TikTok         | 9:16         | 1024 × 1536    |
