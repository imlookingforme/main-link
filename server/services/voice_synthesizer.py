"""
Neural Voice Synthesizer using edge-tts
Supports authentic regional Indian voices:
- Hindi (Swara)
- Telugu (Shruti)
- Tamil (Pallavi)
- Kannada (Sapna)
- Bengali (Tanishaa)
- Marathi (Aarohi)
- Gujarati (Dhwani)
- English (Neerja)
"""
import sys
import os
import argparse
import asyncio
import hashlib
import json
import base64
import edge_tts

VOICE_MAP = {
    'Hindi': 'hi-IN-SwaraNeural',
    'Telugu': 'te-IN-ShrutiNeural',
    'Tamil': 'ta-IN-PallaviNeural',
    'Kannada': 'kn-IN-SapnaNeural',
    'Bengali': 'bn-IN-TanishaaNeural',
    'Marathi': 'mr-IN-AarohiNeural',
    'Gujarati': 'gu-IN-DhwaniNeural',
    'English': 'en-IN-NeerjaNeural',
    'hi': 'hi-IN-SwaraNeural',
    'te': 'te-IN-ShrutiNeural',
    'ta': 'ta-IN-PallaviNeural',
    'kn': 'kn-IN-SapnaNeural',
    'bn': 'bn-IN-TanishaaNeural',
    'mr': 'mr-IN-AarohiNeural',
    'gu': 'gu-IN-DhwaniNeural',
    'en': 'en-IN-NeerjaNeural'
}

async def synthesize(text: str, language: str) -> str:
    voice = VOICE_MAP.get(language, 'en-IN-NeerjaNeural')
    # Clean text to remove markdown, excessive URLs or brackets
    import re
    cleaned = re.sub(r'[*_#`~]', '', text)
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
                lang = data.get("lang", data.get("language", "English"))
        except Exception as e:
            sys.stderr.write(f"Error reading JSON from stdin: {e}\n")

    if not text:
        sys.stderr.write("No text provided for voice synthesis.\n")
        sys.exit(1)

    try:
        data_uri = asyncio.run(synthesize(text, lang))
        sys.stdout.write(json.dumps({"success": True, "audioUrl": data_uri, "language": lang}))
    except Exception as e:
        sys.stderr.write(f"Synthesis failed: {e}\n")
        sys.stdout.write(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
