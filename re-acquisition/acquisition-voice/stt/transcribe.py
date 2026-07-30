#!/usr/bin/env python3
"""Transcribe seller call audio with faster-whisper. Outputs plain text to stdout."""

import argparse
import sys

def main():
    parser = argparse.ArgumentParser(description='Transcribe audio for acquisition-voice pipeline')
    parser.add_argument('audio_path', help='Path to .m4a or .wav file')
    parser.add_argument('--model', default='base', help='Whisper model size (tiny, base, small, medium)')
    parser.add_argument('--language', default='en', help='Language code')
    args = parser.parse_args()

    try:
        from faster_whisper import WhisperModel
    except ImportError:
        print(
            'faster-whisper not installed. Run: pip install faster-whisper',
            file=sys.stderr,
        )
        sys.exit(1)

    model = WhisperModel(args.model, device='cpu', compute_type='int8')
    segments, info = model.transcribe(args.audio_path, language=args.language)

    lines = []
    for segment in segments:
        lines.append(segment.text.strip())

    transcript = '\n'.join(line for line in lines if line)
    print(transcript)

if __name__ == '__main__':
    main()
