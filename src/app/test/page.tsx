"use client";
import { useState } from "react";

export default function TestPage() {
  const [text, setText] = useState("Ini adalah tes suara langsung dari browser.");
  const [status, setStatus] = useState("Ready");

  const playSound = async () => {
    setStatus("Generating audio...");
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      if (!res.ok) throw new Error('TTS API returned ' + res.status);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      
      setStatus("Playing audio...");
      audio.onended = () => setStatus("Finished playing");
      await audio.play();
    } catch (e: any) {
      console.error(e);
      setStatus("Error: " + e.message);
    }
  };

  return (
    <div className="p-10 text-black">
      <h1 className="text-2xl mb-4 font-bold">Audio Test Page</h1>
      <input 
        className="border p-2 w-full mb-4" 
        value={text} 
        onChange={e => setText(e.target.value)} 
      />
      <button 
        className="bg-blue-600 text-white px-4 py-2 rounded" 
        onClick={playSound}
      >
        Play Sound
      </button>
      <div className="mt-4 text-red-500 font-bold">{status}</div>
    </div>
  );
}
