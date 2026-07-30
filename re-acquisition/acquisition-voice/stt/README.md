# faster-whisper STT

Offline speech-to-text for seller calls and site memos.

## Setup

```bash
cd re-acquisition/acquisition-voice/stt
pip install -r requirements.txt
```

## Usage

```bash
python transcribe.py /path/to/seller-call.m4a > transcript.txt

# Pipe into extraction runner
python transcribe.py call.m4a | tee transcript.txt
cd ../runner && node index.js --transcript transcript.txt --call-id call-001
```

## Docker (optional)

```bash
docker run --rm -v $(pwd):/work ghcr.io/ahmetoner/whisper-asr-webservice:latest \
  --model base --output_format txt /work/call.m4a
```

The n8n voice-extraction workflow can shell out to `transcribe.py` when `audioPath` is provided instead of `transcript`.
