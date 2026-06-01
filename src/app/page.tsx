"use client";

import Link from "next/link";
import { Tv, Settings, Building2, Megaphone, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header / Navbar */}
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
            <Building2 className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Smart TV Institutional</h1>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Portal Utama</p>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col">
        
        {/* Advertisement / Hero Banner Section */}
        <div className="relative bg-slate-900 overflow-hidden">
          {/* Decorative Background */}
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1562774053-701939374585?q=80&w=2866&auto=format&fit=crop')] bg-cover bg-center opacity-40 mix-blend-overlay"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-900 via-indigo-900/90 to-transparent"></div>
          </div>

          <div className="relative max-w-7xl mx-auto px-8 py-24 flex flex-col md:flex-row items-center justify-between gap-12">
            <div className="max-w-2xl text-white space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-indigo-100 font-medium text-sm">
                <Megaphone className="w-4 h-4" />
                Ruang Iklan / Pengumuman Lembaga
              </div>
              <h2 className="text-5xl md:text-6xl font-black tracking-tight leading-tight">
                Tingkatkan <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">Kedisiplinan</span> & <br />
                Kualitas Informasi
              </h2>
              <p className="text-xl text-indigo-100 leading-relaxed max-w-xl">
                Sistem Informasi Smart TV terpadu untuk menampilkan jadwal presisi, pemutaran otomatis lagu kebangsaan, dan manajemen pengumuman digital.
              </p>
            </div>
          </div>
        </div>

        {/* Portal Navigation Cards */}
        <div className="max-w-7xl mx-auto px-8 py-16 w-full -mt-16 relative z-10">
          <div className="grid md:grid-cols-2 gap-8">
            
            {/* TV Display Card */}
            <Link href="/tv" className="group flex flex-col bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-blue-900/10 border border-slate-100 transition-all duration-300 hover:-translate-y-2">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-600 transition-colors duration-300">
                <Tv className="w-8 h-8 text-blue-600 group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 className="text-3xl font-bold text-slate-900 mb-3">Layar Smart TV</h3>
              <p className="text-slate-500 text-lg mb-8 flex-1">
                Buka mode layar penuh untuk ditampilkan di TV kampus/kantor. Menampilkan jadwal real-time, jam, dan video otomatis.
              </p>
              <div className="inline-flex items-center gap-2 font-bold text-blue-600 group-hover:text-blue-700">
                Buka Layar TV <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            {/* Admin Card */}
            <Link href="/admin" className="group flex flex-col bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-indigo-900/10 border border-slate-100 transition-all duration-300 hover:-translate-y-2">
              <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-indigo-600 transition-colors duration-300">
                <Settings className="w-8 h-8 text-indigo-600 group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 className="text-3xl font-bold text-slate-900 mb-3">Panel Admin</h3>
              <p className="text-slate-500 text-lg mb-8 flex-1">
                Kelola jadwal, upload video & audio, atur timer otomatis, dan siarkan pesan suara manual ke Layar TV.
              </p>
              <div className="inline-flex items-center gap-2 font-bold text-indigo-600 group-hover:text-indigo-700">
                Masuk ke Admin <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

          </div>
        </div>

      </main>
      
      {/* Footer */}
      <footer className="bg-slate-900 py-8 px-8 text-center text-slate-400 text-sm">
        <p>&copy; {new Date().getFullYear()} Hak Cipta Dilindungi. Sistem Layar Informasi Digital.</p>
      </footer>
    </div>
  );
}
