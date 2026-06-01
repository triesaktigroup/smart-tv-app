"use client";

import Link from "next/link";
import { Tv, Settings } from "lucide-react";

export default function Home() {
  return (
    <div className="relative min-h-screen w-full bg-slate-900 overflow-hidden">
      {/* Background Image - The user's uploaded image will fill the screen */}
      <div className="absolute inset-0 z-0">
        <img src="/bg-portal.jpg" alt="Portal Background" className="absolute inset-0 w-full h-full object-cover" />
        {/* Subtle gradient at the bottom so buttons are always readable */}
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/80 to-transparent"></div>
      </div>

      {/* Floating Action Buttons at the bottom right */}
      <div className="absolute bottom-8 right-8 z-10 flex gap-4">
        <Link 
          href="/admin" 
          className="flex items-center gap-2 bg-black/50 hover:bg-black/80 backdrop-blur-md text-white px-5 py-3 rounded-full font-medium transition-all border border-white/20 hover:scale-105"
        >
          <Settings className="w-5 h-5" />
          <span>Admin</span>
        </Link>
        <Link 
          href="/tv" 
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full font-bold shadow-lg shadow-blue-600/30 transition-all hover:scale-105"
        >
          <Tv className="w-5 h-5" />
          <span>Buka TV Layar Penuh</span>
        </Link>
      </div>
    </div>
  );
}
