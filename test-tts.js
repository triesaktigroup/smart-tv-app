const { EdgeTTS } = require('node-edge-tts');
const path = require('path');
const os = require('os');
const fs = require('fs');

async function test() {
    try {
        const tts = new EdgeTTS({
            voice: 'id-ID-ArdiNeural', // Indonesian male
            lang: 'id-ID',
            outputFormat: 'audio-24khz-48kbitrate-mono-mp3'
        });
        
        const tempPath = path.join(os.tmpdir(), `tts-${Date.now()}.mp3`);
        await tts.ttsPromise('Halo, ini adalah percobaan suara Edge TTS.', tempPath);
        console.log('Success, saved to', tempPath);
        
        const stats = fs.statSync(tempPath);
        console.log('File size:', stats.size);
        
        // cleanup
        fs.unlinkSync(tempPath);
    } catch (err) {
        console.error(err);
    }
}

test();
