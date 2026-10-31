"""
Neural Voice Synthesizer using edge-tts
Supports authentic regional Indian voices:
- Hindi (Swara)
- Telugu (Shruti)
- Tamil (Pallavi)
- Kannada (Sapna)
- Malayalam (Sobhana)
- Bengali (Tanishaa)
- Marathi (Aarohi)
- Gujarati (Dhwani)
- Punjabi (Ojas)
- English (Neerja)
"""
import sys
import os
import argparse
import asyncio
import hashlib
import json
import base64
import re
import edge_tts

VOICE_MAP = {
    'hindi': 'hi-IN-SwaraNeural',
    'telugu': 'te-IN-ShrutiNeural',
    'tamil': 'ta-IN-PallaviNeural',
    'kannada': 'kn-IN-SapnaNeural',
    'malayalam': 'ml-IN-SobhanaNeural',
    'bengali': 'bn-IN-TanishaaNeural',
    'marathi': 'mr-IN-AarohiNeural',
    'gujarati': 'gu-IN-DhwaniNeural',
    'punjabi': 'pa-IN-OjasNeural',
    'urdu': 'ur-IN-GulNeural',
    'english': 'en-IN-NeerjaNeural',
    'hi': 'hi-IN-SwaraNeural',
    'te': 'te-IN-ShrutiNeural',
    'ta': 'ta-IN-PallaviNeural',
    'kn': 'kn-IN-SapnaNeural',
    'ml': 'ml-IN-SobhanaNeural',
    'bn': 'bn-IN-TanishaaNeural',
    'mr': 'mr-IN-AarohiNeural',
    'gu': 'gu-IN-DhwaniNeural',
    'pa': 'pa-IN-OjasNeural',
    'ur': 'ur-IN-GulNeural',
    'en': 'en-IN-NeerjaNeural',
    'hi-in': 'hi-IN-SwaraNeural',
    'te-in': 'te-IN-ShrutiNeural',
    'ta-in': 'ta-IN-PallaviNeural',
    'kn-in': 'kn-IN-SapnaNeural',
    'ml-in': 'ml-IN-SobhanaNeural',
    'bn-in': 'bn-IN-TanishaaNeural',
    'mr-in': 'mr-IN-AarohiNeural',
    'gu-in': 'gu-IN-DhwaniNeural',
    'en-in': 'en-IN-NeerjaNeural',
}

def resolve_voice(lang: str) -> str:
    if not lang:
        return 'en-IN-NeerjaNeural'
    clean_lang = lang.strip().lower()
    for key, voice in VOICE_MAP.items():
        if key in clean_lang or clean_lang in key:
            return voice
    return 'en-IN-NeerjaNeural'

async def synthesize(text: str, language: str) -> str:
    voice = resolve_voice(language)
    # Clean text to remove markdown, excessive URLs or brackets
    cleaned = re.sub(r'[*_#`~\[\]]', '', text)
    cleaned = re.sub(r'http\S+', '', cleaned)
    cleaned = cleaned.strip()
    if not cleaned:
        cleaned = "No explanation text provided."
    if len(cleaned) > 1000:
        cleaned = cleaned[:1000]

    communicate = edge_tts.Communicate(cleaned, voice)
    audio_bytes = bytearray()
    async for chunk in communicate.stream():
        if chunk['type'] == 'audio':
            audio_bytes.extend(chunk['data'])

    b64 = base64.b64encode(audio_bytes).decode('utf-8')
    return f"data:audio/mp3;base64,{b64}"

def main():
    parser = argparse.ArgumentParser(description="Synthesize text to neural voice base64")
    parser.add_argument("--text", type=str, required=False, help="Text to speak")
    parser.add_argument("--lang", type=str, default="English", help="Regional language")
    parser.add_argument("--json", action="store_true", help="Read input from stdin as JSON")
    args = parser.parse_args()

    text = args.text
    lang = args.lang

    if args.json or not text:
        try:
            stdin_data = sys.stdin.read()
            if stdin_data.strip():
                data = json.loads(stdin_data)
                text = data.get("text", "")
                lang = data.get("lang", data.get("language", data.get("preferredLanguage", data.get("selectedLang", "English"))))
        except Exception as e:
            sys.stderr.write(f"Error reading JSON from stdin: {e}\n")

    if not text:
        sys.stderr.write("No text provided for voice synthesis.\n")
        sys.exit(1)

    try:
        data_uri = asyncio.run(synthesize(text, lang))
        sys.stdout.write(json.dumps({"success": True, "audioUrl": data_uri, "language": lang, "voice": resolve_voice(lang)}))
    except Exception as e:
        sys.stderr.write(f"Synthesis failed: {e}\n")
        sys.stdout.write(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
