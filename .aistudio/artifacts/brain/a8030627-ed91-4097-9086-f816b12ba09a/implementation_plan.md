# AI UGC Video Producer for Informal African Merchants on Floate

An AI-powered 9:16 vertical video creation studio built into the Floate Operating Suite, empowering informal market sellers (Balogun clothing vendors, Computer Village phone dealers, Aba footwear makers, Kano electronics sellers) to generate high-converting, authentic UGC video ads with automated marketing scripts, realistic face animation & lip-sync, depth-of-field market stall backgrounds, multi-dialect audio (Pidgin, Yoruba, Hausa, Igbo, English), and one-click WhatsApp CTAs.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> **Zero-Cost Initial Launch Model Strategy**: To ensure 100% free usage before user monetization kicks in, the system uses Google AI Studio's generous free tier models (`gemini-3.8-flash`, `gemini-3.8-flash-lite-tts`, `gemini-3.1-flash-lite-image`) combined with browser-native HTML5 Canvas 60fps face lip-sync motion capture. It also generates ready-to-run prompts for external video generators like WAN 2.1/2.2 and `gemini-omni-1.1-flash` when scaling!

- **Confirmed Market & Dialect Coverage**: Default presets for Nigerian commercial hubs (Balogun Market fashion, Computer Village Ikeja phones, Aba footwear, Kano Kurmi market electronics) supporting Pidgin, English, Yoruba, Hausa, and Igbo speech cadences.
- **Confirmed Cost-Free Model Stack**:
  1. **Scriptwriting & Hook Engine**: `gemini-3.8-flash` (Free Tier - ultra-fast high-converting African street sales scripts).
  2. **Voice & Dialect Audio**: `gemini-3.8-flash-lite-tts` (Free Tier - energetic market seller voiceovers with speech metadata style controls).
  3. **Visual Composite & Bokeh Background**: `gemini-3.1-flash-lite-image` (Free Tier - realistic shop background depth-of-field + merchant cutout).
  4. **Motion, Lip-Sync & Video Rendering**: Real-time browser HTML5 Canvas 30fps lip-sync + MediaRecorder MP4 exporter (0 server cost) paired with WAN 2.1/2.2 / Omni Flash prompt generator.
- **Confirmed UI Integration**: Primary top-level Floate navigation tab **"🎬 UGC Video Producer"** + quick-launch modal from Storefront product listings and Base Kit studio.

---

## 1. Overview & Core Concept

### What It Does
1. **Multimodal Input Asset Ingestion**: Accepts 3 key merchant assets (`faceImage` of vendor, `productImage` of listed item, `shopImage` of market stall/shop).
2. **AI Street Script Generator**: Automatically crafts 15-second high-urgency vertical video scripts with a 2-second hook, product highlights, price callout, and WhatsApp ordering CTA.
3. **Voice & Dialect Audio Engine**: Synthesizes energetic, authentic voiceover in African market dialects (Pidgin, English, Yoruba, Hausa, Igbo) with natural speech cadences and vocal bursts (`<laugh>`, `<gasp>`, `<breath>`).
4. **9:16 Vertical Video & Lip-Sync Renderer**: Animates vendor facial gestures, synchronizes lip movement to audio track, applies background depth-of-field (bokeh effect) behind vendor, and overlays product callout stickers & WhatsApp order badge.
5. **Real-time Player & Export Studio**: Preview video clips directly in a realistic smartphone viewport (WhatsApp Status / Reels mode) with 1-click WebM/MP4 video generation and instant WhatsApp sharing.

### Target Audience & Persona
- **Informal African Market Merchants**: Clothing sellers in Balogun/Tejuosho, phone repair & sales dealers in Computer Village, shoemakers in Aba, electronics sellers in Kano/Onitsha.
- **Consumer Audience**: Buyers scrolling WhatsApp Status, Instagram Reels, TikTok, and Floate Web Storefronts looking for verified quality, real vendor identity, and fast WhatsApp order response.

---

## 2. User Experience & Visual Design

### Key User Flows
1. **Preset & Identity Selection**:
   - Merchant selects business type (e.g. "Balogun Lagos Fashion Vendor" or "Computer Village Tech Dealer") and target dialect (Pidgin, English, Yoruba, Hausa, Igbo).
   - Merchant uploads/selects vendor face photo, product image, and market shop photo (or chooses from Floate default market sample kits).
2. **AI Script & Voice Generation**:
   - One-click script prompt generates 3 high-converting script variants (Street Hustle Hook, Quality Guarantee Pitch, Flash Promo Deal).
   - Voice preview generates realistic audio with natural speech cadence and market seller energy.
3. **Interactive 9:16 Video Preview & Fine-Tuning**:
   - Real-time 9:16 vertical smartphone preview frame showing animated vendor face, background bokeh effect, handheld camera subtle pan/zoom motion, product showcase overlay, and WhatsApp CTA button.
4. **One-Click Export & Direct Share**:
   - Generates production-ready vertical video clip with embedded audio and Floate Verified Merchant seal.
   - 1-Click "Post to WhatsApp Status" or "Download MP4" action.

### Visual Identity & Theme
- **Color Palette**: Dark slate background canvas (`#020617`), vibrant Floate Emerald (`#10b981`), Amber Hustle Gold (`#f59e0b`), and clean white typography (`#f8fafc`).
- **Typography**: Display headlines in `Plus Jakarta Sans`, data metrics in `tabular-nums` `JetBrains Mono`, clean, unboxed text separators for video metadata.
- **Smartphone Viewport Frame**: Sleek 9:16 iPhone/Android device mockup with realistic WhatsApp Status indicator bars, audio visualizer wave, and CTA overlay.

---

## 3. Model Architecture & Free-Tier Strategy

| Capability | Chosen Model | Why & Free Tier Advantage |
| :--- | :--- | :--- |
| **Sales Script Generator** | `gemini-3.8-flash` | Ultra-fast responses, zero API cost on AI Studio free tier. |
| **Street Voiceover TTS** | `gemini-3.8-flash-lite-tts` | Free tier, high-throughput, authentic African accent intonations. |
| **Shop Background Bokeh** | `gemini-3.1-flash-lite-image` | Free tier image editing & depth-of-field composite. |
| **Video Motion & Lip-Sync** | HTML5 Canvas + WAN 2.1/2.2 Prompter | Zero server compute cost for client rendering + WAN video prompt export. |

---

## 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       FLOATE OPERATING SUITE FRONTEND                        │
│                                                                             │
│  [Top Header: 🎬 UGC Video Producer Tab]                                   │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ UgcVideoProducerStudio.tsx                                             │  │
│  │ ┌──────────────────────────┐  ┌─────────────────────────────────────┐ │  │
│  │ │ 1. Asset Input Panel     │  │ 2. 9:16 Vertical Smartphone Viewport│ │  │
│  │ │ - Face, Product, Shop    │  │ - 30fps HTML5 Canvas Render Loop   │ │  │
│  │ │ - Presets & Dialects     │  │ - Lip-Sync Facial Mesh Animator     │ │  │
│  │ │ - Script Generator UI    │  │ - Audio Waveform & WhatsApp CTA Bar │ │  │
│  │ └──────────────────────────┘  └─────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTP API Requests
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            EXPRESS BACKEND (server.ts)                      │
│                                                                             │
│  POST /api/ugc-video/generate-script  ──>  Gemini 3.8 Flash (Free Tier)     │
│  POST /api/ugc-video/synthesize-audio  ──>  Gemini 3.8 Flash Lite TTS       │
│  POST /api/ugc-video/composite-frame   ──>  Gemini 3.1 Flash Lite Image      │
│  POST /api/ugc-video/export-wan-prompt ──>  WAN 2.1/2.2 Video Generator     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Implementation Steps

1. **Backend Integration (`server.ts`)**:
   - `/api/ugc-video/generate-script`: Uses `gemini-3.8-flash` for Street Sales Hooks & Dialects.
   - `/api/ugc-video/synthesize-audio`: Uses `gemini-3.8-flash-lite-tts` for 24kHz WAV audio generation.
   - `/api/ugc-video/composite-frame`: Uses `gemini-3.1-flash-lite-image` + Sharp for bokeh background & merchant layer.
   - `/api/ugc-video/export-wan-prompt`: Constructs WAN 2.1/2.2 & Omni video prompts for advanced motion rendering.

2. **Frontend Studio Component (`src/components/UgcVideoProducerStudio.tsx`)**:
   - 2-column studio layout (Controls & Script Generator on left, 9:16 Smartphone Video Player on right).
   - Real-time mouth animation synced to audio playback frequency & elapsed time.
   - Handheld camera subtle pan/zoom physics effect.
   - WebM/MP4 Canvas Recorder for instant video export.

3. **Navigation Integration (`src/App.tsx`)**:
   - Add `"video"` tab (`🎬 UGC Video Producer`) in header navigation.
   - Add quick launch buttons in `VendorStorefront.tsx` and `FloateBaseKitStudio.tsx`.

4. **Verification & Compilation (`compile_applet`)**:
   - Ensure clean build without syntax or lint errors.
