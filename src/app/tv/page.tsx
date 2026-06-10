"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { format, parse, isAfter, isBefore, addMinutes, subMinutes, getDay } from "date-fns";
import { id } from "date-fns/locale";
import { Clock, Calendar, MapPin, User, BookOpen, Volume2, Tv } from "lucide-react";

type Schedule = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  courses: { name: string; code: string };
  lecturers: { name: string; photo_url?: string };
  rooms: { name: string };
};

export default function TVDashboard() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const schedulesRef = useRef<Schedule[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [mounted, setMounted] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  // ongoing/upcoming/ending are derived directly from getOngoingAndUpcoming() below

  // Special Settings
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [settings, setSettings] = useState<any>({});
  const settingsRef = useRef<any>({});

  // Audio queue states
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [currentAnnouncement, setCurrentAnnouncement] = useState<string | null>(null);
  
  // Refs to manage queues and prevent duplicates
  const announcedRef = useRef<Set<string>>(new Set());
  const announcementQueueRef = useRef<{text?: string, audioUrl?: string, onFinish?: () => void}[]>([]);
  const isProcessingQueueRef = useRef(false);

  const formatTime = (timeStr: string) => {
    return timeStr ? timeStr.substring(0, 5) : '';
  };

  useEffect(() => {
    // Initial fetch
    fetchSchedules();

    // Realtime subscription
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'schedules' },
        (payload) => {
          console.log('Schedules change received!', payload);
          fetchSchedules();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'settings' },
        (payload) => {
          console.log('Settings change received!', payload);
          // Clear memory for testing so changes apply immediately
          const currentDayStr = format(new Date(), 'yyyy-MM-dd');
          announcedRef.current.delete(`indonesia-raya-warn-${currentDayStr}`);
          announcedRef.current.delete(`indonesia-raya-play-${currentDayStr}`);
          fetchSchedules();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'courses' },
        () => fetchSchedules()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lecturers' },
        () => fetchSchedules()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms' },
        () => fetchSchedules()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Separate useEffect for Broadcast to avoid closure issues
  useEffect(() => {
    const broadcastChannel = supabase
      .channel('announcements')
      .on('broadcast', { event: 'manual-announce' }, (payload) => {
        console.log('Manual announcement received!', payload);
        queueAnnouncement({ text: payload.payload.text });
      })
      .on('broadcast', { event: 'settings-updated' }, () => {
        console.log('Settings updated broadcast received!');
        // Clear memory for testing so changes apply immediately
        const currentDayStr = format(new Date(), 'yyyy-MM-dd');
        announcedRef.current.delete(`indonesia-raya-warn-${currentDayStr}`);
        announcedRef.current.delete(`indonesia-raya-play-${currentDayStr}`);
        fetchSchedules();
      })
      .on('broadcast', { event: 'schedule-updated' }, () => {
        console.log('Schedule updated broadcast received! Refreshing...');
        fetchSchedules();
      })
      .subscribe((status) => {
        console.log('TV Broadcast Status:', status);
      });

    return () => {
      supabase.removeChannel(broadcastChannel);
    };
  }, [audioEnabled]); // Re-bind when audio is enabled

  useEffect(() => {
    fetchSchedules();
    // Polling fallback every 30 seconds in case realtime is disconnected
    const pollInterval = setInterval(() => {
      fetchSchedules();
    }, 30000);
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      const currentHHMM = format(now, 'HH:mm');
      const currentSeconds = now.getSeconds();
      const settings = settingsRef.current;
      // Robust time checking using format Date to prevent missing seconds or repeating across days
      const currentDateStr = format(now, 'yyyy-MM-dd');
      
      // Indonesia Raya Logic
      if (settings['indonesia_raya_time']) {
        const indoTimeStr = settings['indonesia_raya_time'].substring(0, 5);
        const targetTime = parse(indoTimeStr, 'HH:mm', now);
        
        if (!isNaN(targetTime.getTime())) {
          const warningTime = new Date(targetTime.getTime() - 15 * 1000); // 15 seconds before
          
          if (now.getTime() >= warningTime.getTime() && now.getTime() < targetTime.getTime()) {
            const key = `indonesia-raya-warn-${currentDateStr}`;
            if (!announcedRef.current.has(key)) {
              announcedRef.current.add(key);
              queueAnnouncement({
                text: settings['indonesia_raya_audio_url'] ? undefined : "PERHATIAN.PERHATIAN. Dalam beberapa saat, mari kita sejenak berdiri, sambil menyanyikan lagu, kebangsaan Indonesia Raya",
                audioUrl: settings['indonesia_raya_audio_url'] || undefined
              });
            }
          }
        }
        
        if (currentHHMM === indoTimeStr) {
          const key = `indonesia-raya-play-${currentDateStr}`;
          if (!announcedRef.current.has(key)) {
            announcedRef.current.add(key);
            if (settings['indonesia_raya_video_url']) {
              setIsPlayingVideo(true);
            }
          }
        }
      }

      // Prayer Times Logic
      if (settings['dhuhur_time']) {
        const dhuhurTimeStr = settings['dhuhur_time'].substring(0, 5);
        if (currentHHMM === dhuhurTimeStr) {
          const key = `dhuhur-${currentDateStr}`;
          if (!announcedRef.current.has(key)) {
            announcedRef.current.add(key);
            queueAnnouncement({
              text: settings['dhuhur_audio_url'] ? undefined : "Perhatian, waktu sholat Dhuhur telah tiba. Bagi yang beragama Islam, dipersilakan untuk menunaikan ibadah sholat.",
              audioUrl: settings['dhuhur_audio_url'] || undefined
            });
          }
        }
      }
      
      if (settings['ashar_time']) {
        const asharTimeStr = settings['ashar_time'].substring(0, 5);
        if (currentHHMM === asharTimeStr) {
          const key = `ashar-${currentDateStr}`;
          if (!announcedRef.current.has(key)) {
            announcedRef.current.add(key);
            queueAnnouncement({
              text: settings['ashar_audio_url'] ? undefined : "Perhatian, waktu sholat Ashar telah tiba. Bagi yang beragama Islam, dipersilakan untuk menunaikan ibadah sholat.",
              audioUrl: settings['ashar_audio_url'] || undefined
            });
          }
        }
      }
      
      checkAnnouncements(now);
    }, 1000);
    return () => { clearInterval(interval); clearInterval(pollInterval); };
  }, []);

  const fetchSchedules = async () => {
    const today = getDay(new Date());
    const { data, error } = await supabase
      .from('schedules')
      .select(`*, courses(*), lecturers(*), rooms(*)`)
      .eq('day_of_week', today)
      .eq('is_active', true);
      
    const { data: setRes } = await supabase.from('settings').select('*');
    if (setRes) {
      const map: any = {};
      setRes.forEach(s => map[s.key] = s.value);
      settingsRef.current = map;
      setSettings(map);
      if (map['indonesia_raya_video_url']) {
        setVideoUrl(map['indonesia_raya_video_url']);
      }
    }

    if (error) {
      console.error("Error fetching schedules:", error);
    } else {
      setSchedules(data as Schedule[]);
      schedulesRef.current = data as Schedule[];
    }
  };

  const queueAnnouncement = (payload: {text?: string, audioUrl?: string, onFinish?: () => void}) => {
    announcementQueueRef.current.push(payload);
    processQueue();
  };

  const playCustomAudio = (url: string): Promise<void> => {
    return new Promise((resolve) => {
      const audio = new Audio(url);
      audio.onended = () => resolve();
      audio.onerror = (e) => {
        console.error("Custom audio playback error", e);
        resolve();
      };
      audio.play().catch(e => {
        console.error("Custom audio play error (Autoplay blocked?)", e);
        resolve();
      });
    });
  };

  const processQueue = async () => {
    if (isProcessingQueueRef.current) return;
    if (announcementQueueRef.current.length === 0) return;

    isProcessingQueueRef.current = true;

    while (announcementQueueRef.current.length > 0) {
      const item = announcementQueueRef.current.shift()!;
      
      // Mainkan nada bandara dulu
      await playChime();
      
      // Baru baca teksnya atau mainkan audio kustom
      if (item.audioUrl) {
        await playCustomAudio(item.audioUrl);
      } else if (item.text) {
        await playAnnouncement(item.text);
      }
      
      if (item.onFinish) {
        item.onFinish();
      }
      
      // Pause 1 second before playing the next announcement
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    isProcessingQueueRef.current = false;
  };

  const playChime = (): Promise<void> => {
    return new Promise((resolve) => {
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContext();
        
        const playTone = (freq: number, startTime: number, duration: number) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);
          
          gain.gain.setValueAtTime(0, ctx.currentTime + startTime);
          gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + startTime + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + startTime + duration);
          
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.start(ctx.currentTime + startTime);
          osc.stop(ctx.currentTime + startTime + duration);
        };

        // Nada khas bandara (Ting.. Ting.. Ting.. Ting..)
        playTone(392.00, 0, 1.5);
        playTone(523.25, 0.4, 1.5);
        playTone(659.25, 0.8, 1.5);
        playTone(783.99, 1.2, 2.0);
        
        // Tunggu nada selesai sebelum lanjut
        setTimeout(() => {
          resolve();
        }, 2500); 
      } catch (e) {
        console.error("Web Audio API error", e);
        resolve();
      }
    });
  };

  const playAnnouncement = (text: string): Promise<void> => {
    return new Promise(async (resolve) => {
      setCurrentAnnouncement(text);
      setIsSpeaking(true);
      try {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text })
        });
        
        if (!res.ok) throw new Error('TTS failed');
        
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        
        audio.onended = () => {
          setIsSpeaking(false);
          setCurrentAnnouncement(null);
          URL.revokeObjectURL(url);
          resolve();
        };

        audio.onerror = (e) => {
          console.error("Audio playback error", e);
          setIsSpeaking(false);
          setCurrentAnnouncement(null);
          resolve();
        };
        
        await audio.play().catch(e => {
          console.error("Audio play error (Autoplay blocked?)", e);
          setIsSpeaking(false);
          setCurrentAnnouncement(null);
          resolve();
        });
      } catch (e) {
        console.error("Audio generation error", e);
        setIsSpeaking(false);
        setCurrentAnnouncement(null);
        resolve();
      }
    });
  };

  const checkAnnouncements = (now: Date) => {
    if (isSpeaking) return; // Wait until current announcement is done

    const currentDay = getDay(now);
    const currentDateStr = format(now, 'yyyy-MM-dd');
    const schedules = schedulesRef.current;
    
    // We want to announce 10 minutes before start
    schedules.forEach(schedule => {
      if (schedule.day_of_week !== currentDay) return;
      
      const startTimeDate = parse(schedule.start_time, 'HH:mm:ss', now);
      const announceTime = subMinutes(startTimeDate, 10);
      
      // If right now is exactly 10 mins before start
      if (format(announceTime, 'HH:mm') === format(now, 'HH:mm')) {
        const announceKey = `${schedule.id}-start-10-${currentDateStr}`;
        if (!announcedRef.current.has(announceKey)) {
          announcedRef.current.add(announceKey);
          const text = `Pemberitahuan. Mata kuliah ${schedule.courses.name} oleh ${schedule.lecturers.name} di ${schedule.rooms.name}, akan segera dimulai dalam 10 menit.`;
          queueAnnouncement({ text });
        }
      }

      // If right now is EXACTLY the start time
      if (format(startTimeDate, 'HH:mm') === format(now, 'HH:mm')) {
        const announceKey = `${schedule.id}-start-now-${currentDateStr}`;
        if (!announcedRef.current.has(announceKey)) {
          announcedRef.current.add(announceKey);
          const text = `Perhatian. Waktu menunjukkan pukul ${format(now, 'HH:mm')}. Mata kuliah ${schedule.courses.name} di ${schedule.rooms.name} telah dimulai.`;
          queueAnnouncement({ text });
        }
      }
    });
  };

  const getOngoingAndUpcoming = () => {
    const currentDay = getDay(currentTime);
    
    let ongoing: Schedule[] = [];
    let upcoming: Schedule[] = [];

    schedules.forEach(schedule => {
      if (schedule.day_of_week !== currentDay) return;

      const startStr = schedule.start_time.substring(0, 5);
      const endStr = schedule.end_time.substring(0, 5);
      const start = parse(startStr, 'HH:mm', currentTime);
      const end = parse(endStr, 'HH:mm', currentTime);

      const currentMs = currentTime.getTime();
      const startMs = start.getTime();
      let endMs = end.getTime();
      
      // Fallback untuk data testing jika user menset start_time == end_time
      if (endMs <= startMs) {
        endMs = startMs + 60 * 60 * 1000; // Asumsikan 1 jam
      }

      if (currentMs >= startMs && currentMs < endMs) {
        // Class is currently ongoing
        ongoing.push(schedule);
      } else if (currentMs < startMs) {
        // Class is in the future today
        upcoming.push(schedule);
      }
    });

    // Sort upcoming by start time
    upcoming.sort((a, b) => a.start_time.localeCompare(b.start_time));
    
    return { ongoing, upcoming };
  };

  const { ongoing, upcoming } = getOngoingAndUpcoming();
  const displayedOngoing = ongoing.slice(0, 4);
  const displayedUpcoming = upcoming.slice(0, 6);

  // Helper to format HH:mm:ss to HH:mm
  if (!mounted) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500">Memuat sistem...</div>;

  if (!hasStarted) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center space-y-6">
        <div className="text-slate-400 max-w-md">
          <Tv className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-6 opacity-50" />
          <h2 className="text-xl md:text-2xl font-bold text-white mb-2">Sistem Smart TV Siap</h2>
          <p className="text-sm md:text-base">Klik tombol di bawah ini untuk memulai tampilan informasi dalam mode layar penuh (Fullscreen).</p>
        </div>
        <button 
          onClick={() => {
            document.documentElement.requestFullscreen().catch(e => console.log(e));
            setHasStarted(true);
          }} 
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg md:text-2xl py-4 px-8 md:py-6 md:px-12 rounded-full shadow-2xl shadow-blue-900/50 hover:scale-105 transition-all animate-pulse w-full max-w-sm"
        >
          Mulai Tampilan Smart TV
        </button>
      </div>
    );
  }

  if (isPlayingVideo) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center text-white">
        {videoUrl ? (
          <video 
            src={videoUrl}
            autoPlay
            controls
            className="w-full h-full object-contain"
            onEnded={() => {
              setTimeout(() => {
                setIsPlayingVideo(false);
              }, 2000);
            }}
            onError={(e) => {
              console.error("Video error:", e);
              setIsPlayingVideo(false);
            }}
          />
        ) : (
          <div className="text-xl text-red-500">Error: Video URL Kosong</div>
        )}
      </div>
    );
  }

  return (
    <>
      {!audioEnabled && (
        <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center">
          <div className="w-24 h-24 bg-blue-500/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
            <Volume2 className="w-12 h-12 text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">Sistem Smart TV Siap</h1>
          <p className="text-slate-400 mb-8 max-w-md text-center">Browser memerlukan izin interaksi awal untuk dapat memutar pengumuman suara secara otomatis.</p>
          <button 
            onClick={() => setAudioEnabled(true)}
            className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl text-xl shadow-lg shadow-blue-600/30 transition-transform active:scale-95"
          >
            Mulai Layar TV & Aktifkan Suara
          </button>
        </div>
      )}

      <div className={`min-h-screen bg-slate-950 text-white overflow-hidden flex flex-col font-sans ${!audioEnabled ? 'opacity-0' : 'opacity-100 transition-opacity duration-1000'}`}>
        {/* Header */}
        <header className="min-h-[6rem] h-auto bg-slate-900/50 backdrop-blur-md border-b border-slate-800 flex flex-col sm:flex-row items-center sm:justify-between p-4 md:px-10 md:py-0 shadow-2xl z-10 relative gap-4 sm:gap-0 text-center sm:text-left">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10 pointer-events-none" />
        <div className="flex flex-col sm:flex-row items-center gap-3 md:gap-4 z-10">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
            <MapPin className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl md:text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-300">
              Aplikasi Monitoring Perkuliahan
            </h1>
            <p className="text-xs md:text-sm lg:text-base text-slate-400 font-medium tracking-wide">Smart TV Signage & Announcer</p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-2 md:gap-8 z-10">
          {isSpeaking && (
            <div className="flex items-center gap-2 md:gap-3 px-3 py-1 md:px-4 md:py-2 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 animate-pulse text-xs md:text-sm">
              <Volume2 className="w-4 h-4 md:w-5 md:h-5" />
              <span className="font-semibold tracking-wide">AI Announcer</span>
            </div>
          )}
          <div className="text-center sm:text-right">
            <div className="text-2xl md:text-4xl font-extrabold tracking-tighter text-white tabular-nums drop-shadow-md">
              {format(currentTime, 'HH:mm:ss')}
            </div>
            <div className="text-xs md:text-sm text-slate-400 font-medium">
              {format(currentTime, 'EEEE, dd MMMM yyyy', { locale: id })}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 flex flex-col xl:grid xl:grid-cols-12 gap-4 md:gap-8 relative overflow-hidden overflow-y-auto xl:overflow-hidden">
        {/* Decorative background blobs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

        {/* CURRENT ANNOUNCEMENT OVERLAY */}
        {currentAnnouncement && (
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-slate-900/90 border-2 border-blue-500/50 p-6 rounded-3xl shadow-2xl z-50 flex items-center gap-6 max-w-4xl backdrop-blur-xl animate-in slide-in-from-bottom-10 fade-in duration-300">
            <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center shrink-0 animate-pulse">
              <Volume2 className="w-8 h-8 text-blue-400" />
            </div>
            <div>
              <h3 className="text-blue-400 font-bold mb-1 uppercase tracking-widest text-sm">Sedang Disiarkan</h3>
              <p className="text-white text-xl font-medium leading-relaxed">"{currentAnnouncement}"</p>
            </div>
          </div>
        )}

        {/* ONGOING (Left Column - 8 spans) */}
        <div className="col-span-8 flex flex-col gap-6 z-10">
          <h2 className="text-2xl font-bold flex items-center gap-3 text-slate-200">
            <Clock className="w-6 h-6 text-emerald-400" />
            Sedang Berlangsung
          </h2>
          
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 auto-rows-max">
            {/* Ongoing Cards */}
            {displayedOngoing.map(schedule => (
              <div key={schedule.id} className="rounded-3xl bg-slate-800/40 border border-slate-700/50 p-6 shadow-xl backdrop-blur-sm hover:bg-slate-800/60 transition-colors flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-sm font-bold tracking-wider uppercase">
                      Berlangsung
                    </span>
                    <span className="text-2xl font-black tabular-nums text-slate-300">
                      {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4 leading-tight line-clamp-2 min-h-[3.5rem]">{schedule.courses.name}</h3>
                  <div className="flex items-center gap-5 text-slate-300 mb-5">
                    {schedule.lecturers.photo_url ? (
                      <img src={schedule.lecturers.photo_url} alt={schedule.lecturers.name} className="w-20 h-20 rounded-2xl object-cover border-4 border-blue-500/50 shadow-xl shadow-blue-500/10" />
                    ) : (
                      <div className="w-20 h-20 rounded-2xl bg-blue-500/10 flex items-center justify-center border-4 border-blue-500/30 shadow-xl shadow-blue-500/10">
                        <User className="w-10 h-10 opacity-70 text-blue-400" />
                      </div>
                    )}
                    <span className="text-2xl font-bold line-clamp-2 leading-snug">{schedule.lecturers.name}</span>
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white">
                    <MapPin className="w-5 h-5 text-blue-400" />
                    <span className="text-lg font-semibold">{schedule.rooms.name}</span>
                  </div>
                </div>
              </div>
            ))}
            
            {displayedOngoing.length === 0 && (
              <div className="col-span-2 h-64 border-2 border-dashed border-slate-800 rounded-3xl flex flex-col items-center justify-center text-slate-500">
                <BookOpen className="w-16 h-16 mb-4 opacity-20" />
                <p className="text-xl font-medium">Tidak ada kelas yang sedang berlangsung</p>
              </div>
            )}
          </div>
        </div>

        {/* UPCOMING (Right Column - 4 spans) */}
        <div className="xl:col-span-4 flex flex-col gap-6 z-10 border-t xl:border-t-0 xl:border-l border-slate-800/50 pt-8 xl:pt-0 xl:pl-8">
          <h2 className="text-2xl font-bold flex items-center gap-3 text-slate-200">
            <Calendar className="w-6 h-6 text-blue-400" />
            Akan Datang
          </h2>
          
          <div className="flex flex-col gap-4 overflow-y-auto pr-2 pb-10" style={{ maxHeight: 'calc(100vh - 12rem)' }}>
            {displayedUpcoming.length > 0 ? displayedUpcoming.map(schedule => (
              <div key={schedule.id} className="rounded-2xl bg-slate-800/20 border border-slate-800 p-4 backdrop-blur-sm relative overflow-hidden group">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500/50 group-hover:bg-blue-400 transition-colors" />
                <div className="flex justify-between items-center mb-2">
                  <span className="text-lg font-black tabular-nums text-white bg-slate-900/50 px-2.5 py-0.5 rounded-lg">
                    {formatTime(schedule.start_time)}
                  </span>
                  <div className="flex items-center gap-1 text-slate-400 bg-slate-800/50 px-2 py-0.5 rounded-md text-xs font-semibold">
                    <MapPin className="w-3.5 h-3.5" />
                    {schedule.rooms.name}
                  </div>
                </div>
                <h4 className="text-base font-bold text-slate-200 leading-snug mb-1">{schedule.courses.name}</h4>
                <div className="text-slate-400 font-medium flex items-center gap-3 mt-2">
                  {schedule.lecturers.photo_url ? (
                    <img src={schedule.lecturers.photo_url} alt={schedule.lecturers.name} className="w-12 h-12 rounded-lg object-cover border border-slate-700 shadow-md" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center border border-slate-700 shadow-md">
                      <User className="w-5 h-5 opacity-60 text-slate-500" />
                    </div>
                  )}
                  <span className="text-base font-bold">{schedule.lecturers.name}</span>
                </div>
              </div>
            )) : (
              <div className="h-48 border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center text-slate-500">
                <p className="font-medium">Tidak ada jadwal selanjutnya hari ini</p>
              </div>
            )}
          </div>
        </div>
      </main>
      </div>
    </>
  );
}
