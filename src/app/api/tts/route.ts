import { NextResponse } from 'next/server';
import { EdgeTTS } from 'node-edge-tts';
import path from 'path';
import os from 'os';
import fs from 'fs';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { text } = body;

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    // Initialize EdgeTTS with an Indonesian male voice
    const tts = new EdgeTTS({
      voice: 'id-ID-ArdiNeural', 
      lang: 'id-ID',
      outputFormat: 'audio-24khz-48kbitrate-mono-mp3'
    });

    const tempPath = path.join(os.tmpdir(), `tts-${Date.now()}-${Math.random().toString(36).substring(7)}.mp3`);
    
    // Generate the audio file
    await tts.ttsPromise(text, tempPath);
    
    // Read the file into a buffer
    const audioBuffer = fs.readFileSync(tempPath);
    
    // Clean up the temporary file
    try {
      fs.unlinkSync(tempPath);
    } catch (e) {
      console.error('Failed to delete temp file:', e);
    }

    // Return the audio file in the response
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
        'Cache-Control': 'no-store, max-age=0',
      },
    });

  } catch (error: any) {
    console.error('TTS API Error:', error);
    return NextResponse.json({ error: 'Failed to generate audio', details: error.message }, { status: 500 });
  }
}
