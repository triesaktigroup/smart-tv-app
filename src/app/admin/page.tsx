"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Mic, Plus, Trash2, LayoutDashboard, User, Pencil, X, Settings, Lock } from "lucide-react";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("schedules");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  
  // Data States
  const [courses, setCourses] = useState<any[]>([]);
  const [lecturers, setLecturers] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);

  // Form States
  const [courseName, setCourseName] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [lecturerName, setLecturerName] = useState("");
  const [lecturerPhoto, setLecturerPhoto] = useState<File | null>(null);
  const [roomName, setRoomName] = useState("");
  const [broadcastChannel, setBroadcastChannel] = useState<any>(null);
  
  const [schedCourse, setSchedCourse] = useState("");
  const [schedLecturer, setSchedLecturer] = useState("");
  const [schedRoom, setSchedRoom] = useState("");
  const [schedDay, setSchedDay] = useState("1");
  const [schedStart, setSchedStart] = useState("");
  const [schedEnd, setSchedEnd] = useState("");

  const [editCourseId, setEditCourseId] = useState<string | null>(null);
  const [editLecturerId, setEditLecturerId] = useState<string | null>(null);
  const [editRoomId, setEditRoomId] = useState<string | null>(null);
  const [editScheduleId, setEditScheduleId] = useState<string | null>(null);

  const [manualText, setManualText] = useState("");

  // Settings States
  const [indonesiaRayaTime, setIndonesiaRayaTime] = useState("");
  const [dhuhurTime, setDhuhurTime] = useState("");
  const [asharTime, setAsharTime] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState("");

  const [indonesiaRayaAudioFile, setIndonesiaRayaAudioFile] = useState<File | null>(null);
  const [indonesiaRayaAudioUrl, setIndonesiaRayaAudioUrl] = useState("");

  const [dhuhurAudioFile, setDhuhurAudioFile] = useState<File | null>(null);
  const [dhuhurAudioUrl, setDhuhurAudioUrl] = useState("");

  const [asharAudioFile, setAsharAudioFile] = useState<File | null>(null);
  const [asharAudioUrl, setAsharAudioUrl] = useState("");

  const [uploadStatus, setUploadStatus] = useState({ isUploading: false, text: "", progress: 0 });

  useEffect(() => {
    fetchData();
    
    const channel = supabase.channel('announcements');
    channel.subscribe((status, err) => {
      console.log("Admin broadcast channel status:", status, err);
    });
    setBroadcastChannel(channel);

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async () => {
    const [cRes, lRes, rRes, sRes, setRes] = await Promise.all([
      supabase.from("courses").select("*"),
      supabase.from("lecturers").select("*"),
      supabase.from("rooms").select("*"),
      supabase.from("schedules").select("*, courses(*), lecturers(*), rooms(*)"),
      supabase.from("settings").select("*")
    ]);
    
    if (cRes.data) setCourses(cRes.data);
    if (lRes.data) setLecturers(lRes.data);
    if (rRes.data) setRooms(rRes.data);
    if (sRes.data) setSchedules(sRes.data);
    if (setRes.data) {
      const settingsMap: any = {};
      setRes.data.forEach(s => settingsMap[s.key] = s.value);
      setIndonesiaRayaTime(settingsMap['indonesia_raya_time'] || "");
      setDhuhurTime(settingsMap['dhuhur_time'] || "");
      setAsharTime(settingsMap['ashar_time'] || "");
      setVideoUrl(settingsMap['indonesia_raya_video_url'] || "");
      setIndonesiaRayaAudioUrl(settingsMap['indonesia_raya_audio_url'] || "");
      setDhuhurAudioUrl(settingsMap['dhuhur_audio_url'] || "");
      setAsharAudioUrl(settingsMap['ashar_audio_url'] || "");
    }
  };

  // Add & Update Handlers
  const addCourse = async () => {
    if (!courseName) return;
    if (editCourseId) {
      await supabase.from("courses").update({ name: courseName, code: courseCode }).eq("id", editCourseId);
      setEditCourseId(null);
    } else {
      await supabase.from("courses").insert({ name: courseName, code: courseCode });
    }
    setCourseName(""); setCourseCode(""); fetchData();
  };

  const handleEditCourse = (course: any) => {
    setEditCourseId(course.id);
    setCourseName(course.name);
    setCourseCode(course.code || "");
  };

  const addLecturer = async () => {
    if (!lecturerName) return;
    
    let photo_url = null;
    
    if (lecturerPhoto) {
      const fileExt = lecturerPhoto.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { data, error: uploadError } = await supabase.storage
        .from('lecturer-photos')
        .upload(fileName, lecturerPhoto);
        
      if (uploadError) {
        console.error("Upload error:", uploadError);
        alert("Gagal mengupload foto: " + uploadError.message);
        return;
      }
      
      const { data: publicUrlData } = supabase.storage
        .from('lecturer-photos')
        .getPublicUrl(fileName);
        
      photo_url = publicUrlData.publicUrl;
    }

    if (editLecturerId) {
      const { error } = await supabase.from('lecturers').update({
        name: lecturerName,
        ...(photo_url ? { photo_url: photo_url } : {})
      }).eq("id", editLecturerId);
      if (error) console.error(error);
      setEditLecturerId(null);
    } else {
      const { error } = await supabase.from('lecturers').insert({
        name: lecturerName,
        photo_url: photo_url
      });
      if (error) console.error(error);
    }
    
    setLecturerName("");
    setLecturerPhoto(null);
    const fileInput = document.getElementById('photo-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
    fetchData();
  };

  const handleEditLecturer = (lecturer: any) => {
    setEditLecturerId(lecturer.id);
    setLecturerName(lecturer.name);
    // Note: We can't easily prepopulate file inputs, so photo stays null unless changed
  };

  const addRoom = async () => {
    if (!roomName) return;
    if (editRoomId) {
      await supabase.from("rooms").update({ name: roomName }).eq("id", editRoomId);
      setEditRoomId(null);
    } else {
      await supabase.from("rooms").insert({ name: roomName });
    }
    setRoomName(""); fetchData();
  };

  const handleEditRoom = (room: any) => {
    setEditRoomId(room.id);
    setRoomName(room.name);
  };

  const addSchedule = async () => {
    if (!schedCourse || !schedLecturer || !schedRoom || !schedStart || !schedEnd) return alert("Fill all fields");
    
    const payload = {
      course_id: schedCourse,
      lecturer_id: schedLecturer,
      room_id: schedRoom,
      day_of_week: parseInt(schedDay),
      start_time: schedStart,
      end_time: schedEnd,
      is_active: true
    };

    if (editScheduleId) {
      await supabase.from("schedules").update(payload).eq("id", editScheduleId);
      setEditScheduleId(null);
    } else {
      await supabase.from("schedules").insert(payload);
    }
    
    // Broadcast ke TV agar langsung refresh
    if (broadcastChannel) {
      await broadcastChannel.send({
        type: 'broadcast',
        event: 'schedule-updated',
        payload: { updatedAt: new Date().toISOString() },
      });
    }
    
    setSchedCourse(""); setSchedLecturer(""); setSchedRoom(""); setSchedStart(""); setSchedEnd("");
    fetchData();
  };

  const handleEditSchedule = (s: any) => {
    setEditScheduleId(s.id);
    setSchedCourse(s.course_id);
    setSchedLecturer(s.lecturer_id);
    setSchedRoom(s.room_id);
    setSchedDay(s.day_of_week.toString());
    setSchedStart(s.start_time);
    setSchedEnd(s.end_time);
  };

  const deleteRecord = async (table: string, id: string) => {
    await supabase.from(table).delete().eq("id", id);
    // Broadcast ke TV jika jadwal dihapus
    if (table === 'schedules' && broadcastChannel) {
      await broadcastChannel.send({
        type: 'broadcast',
        event: 'schedule-updated',
        payload: { updatedAt: new Date().toISOString() },
      });
    }
    fetchData();
  };

  const sendManualAnnouncement = async () => {
    if (!manualText) return;
    if (!broadcastChannel) {
      alert("Koneksi siaran belum siap. Silakan refresh halaman.");
      return;
    }
    
    const resp = await broadcastChannel.send({
      type: 'broadcast',
      event: 'manual-announce',
      payload: { text: manualText },
    });
    
    console.log("Broadcast send response:", resp);
    setManualText("");
    alert("Announcement sent to TV!");
  };

  const saveSettings = async () => {
    setUploadStatus({ isUploading: true, text: "Menyiapkan file untuk diunggah...", progress: 10 });

    const uploadMedia = async (file: File | null, existingUrl: string, pathPrefix: string) => {
      if (!file) return existingUrl;
      const fileExt = file.name.split('.').pop();
      const fileName = `${pathPrefix}-${Date.now()}.${fileExt}`;
      const { data, error } = await supabase.storage.from('videos').upload(fileName, file);
      if (error) {
        console.error(`Error uploading ${pathPrefix}:`, error);
        return existingUrl;
      }
      const { data: publicUrlData } = supabase.storage.from('videos').getPublicUrl(fileName);
      return publicUrlData.publicUrl;
    };

    setUploadStatus({ isUploading: true, text: "Mengunggah Video Indonesia Raya...", progress: 25 });
    const finalVideoUrl = await uploadMedia(videoFile, videoUrl, 'indonesia-raya-video');
    
    setUploadStatus({ isUploading: true, text: "Mengunggah Audio Indonesia Raya...", progress: 45 });
    const finalIndoAudioUrl = await uploadMedia(indonesiaRayaAudioFile, indonesiaRayaAudioUrl, 'indonesia-raya-audio');
    
    setUploadStatus({ isUploading: true, text: "Mengunggah Audio Sholat Dhuhur...", progress: 65 });
    const finalDhuhurAudioUrl = await uploadMedia(dhuhurAudioFile, dhuhurAudioUrl, 'dhuhur-audio');
    
    setUploadStatus({ isUploading: true, text: "Mengunggah Audio Sholat Ashar...", progress: 85 });
    const finalAsharAudioUrl = await uploadMedia(asharAudioFile, asharAudioUrl, 'ashar-audio');

    setUploadStatus({ isUploading: true, text: "Menyimpan pengaturan ke Database...", progress: 95 });

    await Promise.all([
      supabase.from("settings").upsert({ key: 'indonesia_raya_time', value: indonesiaRayaTime }, { onConflict: 'key' }),
      supabase.from("settings").upsert({ key: 'indonesia_raya_video_url', value: finalVideoUrl }, { onConflict: 'key' }),
      supabase.from("settings").upsert({ key: 'indonesia_raya_audio_url', value: finalIndoAudioUrl }, { onConflict: 'key' }),
      supabase.from("settings").upsert({ key: 'dhuhur_time', value: dhuhurTime }, { onConflict: 'key' }),
      supabase.from("settings").upsert({ key: 'dhuhur_audio_url', value: finalDhuhurAudioUrl }, { onConflict: 'key' }),
      supabase.from("settings").upsert({ key: 'ashar_time', value: asharTime }, { onConflict: 'key' }),
      supabase.from("settings").upsert({ key: 'ashar_audio_url', value: finalAsharAudioUrl }, { onConflict: 'key' })
    ]);
    
    // Beritahu TV bahwa ada update settingan!
    supabase.channel('announcements').send({
      type: 'broadcast',
      event: 'settings-updated',
      payload: {}
    });

    setUploadStatus({ isUploading: true, text: "Selesai!", progress: 100 });
    setTimeout(() => {
      setUploadStatus({ isUploading: false, text: "", progress: 0 });
      alert("Pengaturan Khusus berhasil disimpan!");
    }, 500);
  };

  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full animate-in zoom-in-95 duration-300">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">Akses Terkunci</h2>
          <p className="text-center text-slate-500 text-sm mb-8">Masukkan PIN Keamanan untuk mengakses Panel Admin.</p>
          
          <form onSubmit={(e) => {
            e.preventDefault();
            if (pinInput === "101010") {
              setIsAuthenticated(true);
            } else {
              setPinError(true);
              setTimeout(() => setPinError(false), 2000);
            }
          }} className="space-y-6">
            <div>
              <input 
                type="password" 
                value={pinInput}
                onChange={e => setPinInput(e.target.value)}
                placeholder="• • • • • •"
                className={`w-full text-center tracking-[0.5em] text-2xl px-4 py-4 rounded-xl border ${pinError ? 'border-red-500 bg-red-50 text-red-600' : 'border-slate-300 bg-slate-50 text-slate-900'} focus:ring-2 focus:ring-blue-500 transition-colors`}
                autoFocus
              />
              {pinError && <p className="text-red-500 text-xs font-semibold text-center mt-2 animate-bounce">PIN tidak valid!</p>}
            </div>
            <button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-blue-600/30 transition-all active:scale-95"
            >
              Buka Kunci
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
        {/* Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 text-white flex flex-col shrink-0 z-20 shadow-xl">
        <div className="p-4 md:p-6 text-xl md:text-2xl font-bold tracking-tight border-b border-slate-800 flex items-center gap-2">
          <LayoutDashboard className="w-6 h-6 text-blue-400 shrink-0" />
          <span className="truncate">Admin Panel</span>
        </div>
        <nav className="flex-1 p-4 flex flex-row overflow-x-auto md:flex-col gap-2 no-scrollbar border-b md:border-b-0 border-slate-800">
          <button onClick={() => setActiveTab("schedules")} className={`p-3 text-left rounded-lg transition-colors whitespace-nowrap ${activeTab === 'schedules' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-300'}`}>
            Kelola Jadwal
          </button>
          <button onClick={() => setActiveTab("master")} className={`p-3 text-left rounded-lg transition-colors whitespace-nowrap ${activeTab === 'master' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-300'}`}>
            Data Master
          </button>
          <button onClick={() => setActiveTab("announce")} className={`p-3 text-left rounded-lg transition-colors whitespace-nowrap ${activeTab === 'announce' ? 'bg-orange-600 text-white' : 'hover:bg-slate-800 text-slate-300'}`}>
            Pengumuman Darurat
          </button>
          <button onClick={() => setActiveTab("settings")} className={`p-3 text-left rounded-lg transition-colors whitespace-nowrap ${activeTab === 'settings' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800 text-slate-300'}`}>
            Pengaturan Khusus
          </button>
        </nav>
      </aside>

      {/* Main Area */}
      <main className="flex-1 p-4 md:p-10 overflow-y-auto text-slate-800 w-full overflow-x-hidden">
        <h1 className="text-2xl md:text-3xl font-black mb-6 md:mb-8">
          {activeTab === 'schedules' && 'Manajemen Jadwal Kuliah'}
          {activeTab === 'master' && 'Manajemen Data Master'}
          {activeTab === 'announce' && 'Pengumuman Manual (Darurat)'}
          {activeTab === 'settings' && 'Pengaturan Waktu Khusus & Video'}
        </h1>

        {activeTab === 'schedules' && (
          <div className="space-y-8">
            <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-xl font-bold mb-4">Tambah Jadwal Baru</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                <select className="border p-2 rounded-lg" value={schedCourse} onChange={e => setSchedCourse(e.target.value)}>
                  <option value="">Pilih Mata Kuliah</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select className="border p-2 rounded-lg" value={schedLecturer} onChange={e => setSchedLecturer(e.target.value)}>
                  <option value="">Pilih Dosen</option>
                  {lecturers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
                <select className="border p-2 rounded-lg" value={schedRoom} onChange={e => setSchedRoom(e.target.value)}>
                  <option value="">Pilih Ruangan</option>
                  {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                <select className="border p-2 rounded-lg" value={schedDay} onChange={e => setSchedDay(e.target.value)}>
                  {days.map((d, i) => <option key={i} value={i}>{d}</option>)}
                </select>
                <input type="time" className="border p-2 rounded-lg" value={schedStart} onChange={e => setSchedStart(e.target.value)} />
                <input type="time" className="border p-2 rounded-lg" value={schedEnd} onChange={e => setSchedEnd(e.target.value)} />
              </div>
              <button onClick={addSchedule} className={`px-6 py-2 rounded-lg font-medium flex items-center gap-2 text-white ${editScheduleId ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-blue-600 hover:bg-blue-700'}`}>
                {editScheduleId ? 'Update Jadwal' : <><Plus className="w-5 h-5" /> Simpan Jadwal</>}
              </button>
              {editScheduleId && (
                <button onClick={() => { setEditScheduleId(null); setSchedCourse(""); setSchedLecturer(""); setSchedRoom(""); setSchedStart(""); setSchedEnd(""); }} className="bg-slate-400 text-white px-6 py-2 rounded-lg font-medium hover:bg-slate-500 ml-2">
                  Batal
                </button>
              )}
            </div>

            <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <h2 className="text-xl font-bold mb-4">Daftar Jadwal</h2>
              <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[800px]">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="p-3">Hari</th>
                    <th className="p-3">Waktu</th>
                    <th className="p-3">Mata Kuliah</th>
                    <th className="p-3">Dosen</th>
                    <th className="p-3">Ruangan</th>
                    <th className="p-3">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {schedules.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="p-3">{days[s.day_of_week]}</td>
                      <td className="p-3">{s.start_time.substring(0,5)} - {s.end_time.substring(0,5)}</td>
                      <td className="p-3 font-medium">{s.courses?.name}</td>
                      <td className="p-3">{s.lecturers?.name}</td>
                      <td className="p-3">{s.rooms?.name}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <button onClick={() => handleEditSchedule(s)} className="text-blue-500 hover:text-blue-700">
                            <Pencil className="w-5 h-5" />
                          </button>
                          <button onClick={() => deleteRecord('schedules', s.id)} className="text-red-500 hover:text-red-700">
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'master' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Courses */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-xl font-bold mb-4">Mata Kuliah</h2>
              <div className="flex gap-2 mb-4">
                <input className="border p-2 rounded-lg flex-1" placeholder="Nama Mata Kuliah" value={courseName} onChange={e => setCourseName(e.target.value)} />
                {editCourseId ? (
                  <>
                    <button onClick={addCourse} className="bg-emerald-500 text-white px-4 py-2 rounded-lg hover:bg-emerald-600 font-bold">Update</button>
                    <button onClick={() => { setEditCourseId(null); setCourseName(""); setCourseCode(""); }} className="bg-slate-400 text-white p-2 rounded-lg hover:bg-slate-500"><X className="w-5 h-5" /></button>
                  </>
                ) : (
                  <button onClick={addCourse} className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700"><Plus className="w-5 h-5" /></button>
                )}
              </div>
              <ul className="divide-y max-h-96 overflow-y-auto">
                {courses.map(c => (
                  <li key={c.id} className="py-2 flex justify-between items-center group">
                    {c.name}
                    <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEditCourse(c)} className="text-blue-500 hover:text-blue-600"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => deleteRecord('courses', c.id)} className="text-red-500 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Lecturers */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><User className="w-5 h-5"/> Tambah Dosen</h2>
              <input 
                type="text" 
                placeholder="Nama Dosen Lengkap" 
                className="w-full border border-slate-300 rounded-xl px-4 py-3 mb-3 focus:outline-none focus:border-blue-500"
                value={lecturerName}
                onChange={(e) => setLecturerName(e.target.value)}
              />
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-600 mb-2">Foto Dosen (Opsional)</label>
                <input 
                  id="photo-upload"
                  type="file" 
                  accept="image/*"
                  className="w-full border border-slate-300 rounded-xl px-4 py-2 text-sm focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 transition-all cursor-pointer text-slate-600"
                  onChange={(e) => setLecturerPhoto(e.target.files?.[0] || null)}
                />
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={addLecturer}
                  className={`flex-1 text-white font-bold py-3 rounded-xl transition-colors ${editLecturerId ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-blue-600 hover:bg-blue-500'}`}
                >
                  {editLecturerId ? 'Update Dosen' : 'Simpan Dosen'}
                </button>
                {editLecturerId && (
                  <button onClick={() => { setEditLecturerId(null); setLecturerName(""); }} className="bg-slate-400 text-white px-4 py-3 rounded-xl hover:bg-slate-500">
                    Batal
                  </button>
                )}
              </div>
              <ul className="divide-y mt-6 max-h-60 overflow-y-auto">
                {lecturers.map(l => (
                  <li key={l.id} className="py-2 flex justify-between items-center group">
                    <div className="flex items-center gap-3">
                      {l.photo_url ? (
                        <img src={l.photo_url} alt={l.name} className="w-8 h-8 rounded-full object-cover border border-slate-300" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold border border-slate-200">
                          {l.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="font-medium text-slate-700">{l.name}</span>
                    </div>
                    <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEditLecturer(l)} className="text-blue-500 hover:text-blue-600"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => deleteRecord('lecturers', l.id)} className="text-red-500 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Rooms */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-xl font-bold mb-4">Ruangan</h2>
              <div className="flex gap-2 mb-4">
                <input className="border p-2 rounded-lg flex-1" placeholder="Nama Ruangan" value={roomName} onChange={e => setRoomName(e.target.value)} />
                {editRoomId ? (
                  <>
                    <button onClick={addRoom} className="bg-emerald-500 text-white px-4 py-2 rounded-lg hover:bg-emerald-600 font-bold">Update</button>
                    <button onClick={() => { setEditRoomId(null); setRoomName(""); }} className="bg-slate-400 text-white p-2 rounded-lg hover:bg-slate-500"><X className="w-5 h-5" /></button>
                  </>
                ) : (
                  <button onClick={addRoom} className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700"><Plus className="w-5 h-5" /></button>
                )}
              </div>
              <ul className="divide-y max-h-96 overflow-y-auto">
                {rooms.map(r => (
                  <li key={r.id} className="py-2 flex justify-between items-center group">
                    {r.name}
                    <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEditRoom(r)} className="text-blue-500 hover:text-blue-600"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => deleteRecord('rooms', r.id)} className="text-red-500 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'announce' && (
          <div className="max-w-2xl bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
            <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mb-6">
              <Mic className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Siaran Langsung ke TV</h2>
            <p className="text-slate-500 mb-6">Tuliskan pesan apapun di bawah ini, dan sistem TV akan langsung membacakannya dengan suara AI saat itu juga. Berguna untuk panggilan mahasiswa, pindah kelas mendadak, atau pengumuman darurat.</p>
            
            <textarea 
              className="w-full border-2 border-slate-200 p-4 rounded-xl mb-4 min-h-32 focus:border-orange-500 focus:ring-0 transition-colors"
              placeholder="Contoh: Perhatian kepada mahasiswa kelas Sistem Basis Data, mohon segera menuju ke Ruang 301 karena kelas akan segera dimulai."
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
            />
            
            <button 
              onClick={sendManualAnnouncement}
              className="w-full bg-orange-500 text-white py-4 rounded-xl font-bold text-lg hover:bg-orange-600 shadow-lg shadow-orange-500/30 transition-transform active:scale-[0.98]"
            >
              Kirim & Putar Suara Sekarang
            </button>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="max-w-3xl bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center">
                <Settings className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Waktu & Pemutar Otomatis</h2>
                <p className="text-slate-500">Konfigurasi waktu untuk Lagu Kebangsaan dan pengumuman Sholat.</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <h3 className="text-xl font-bold text-blue-700 mb-6 border-b border-blue-100 pb-2">1. Lagu Kebangsaan Indonesia Raya</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-2">Jam Pemutaran</label>
                    <input 
                      type="time" 
                      value={indonesiaRayaTime}
                      onChange={e => setIndonesiaRayaTime(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 text-lg text-slate-900 bg-white"
                    />
                    <p className="text-xs text-slate-500 mt-2">Peringatan otomatis berbunyi 15 detik sebelum jam ini.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-2">Audio Pengumuman (Upload)</label>
                    <input 
                      type="file" 
                      accept="audio/*"
                      onChange={e => e.target.files && setIndonesiaRayaAudioFile(e.target.files[0])}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {indonesiaRayaAudioUrl && <p className="text-xs text-emerald-600 font-medium mt-2">✓ Audio kustom terpasang.</p>}
                    {!indonesiaRayaAudioUrl && <p className="text-xs text-slate-500 mt-2">Jika kosong, AI akan menjadi narator.</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-2">Video MP4 (Upload)</label>
                    <input 
                      type="file" 
                      accept="video/mp4"
                      onChange={e => e.target.files && setVideoFile(e.target.files[0])}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {videoUrl && <p className="text-xs text-emerald-600 font-medium mt-2">✓ Video saat ini sudah terpasang.</p>}
                  </div>
                </div>
              </div>

              {/* Prayer Times Settings */}
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <h3 className="text-xl font-bold text-emerald-700 mb-6 border-b border-emerald-100 pb-2">2. Waktu Sholat</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-2">Jam Sholat Dhuhur</label>
                      <input 
                        type="time" 
                        value={dhuhurTime}
                        onChange={e => setDhuhurTime(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-lg text-slate-900 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-2">Audio Pengumuman Dhuhur</label>
                      <input 
                        type="file" 
                        accept="audio/*"
                        onChange={e => e.target.files && setDhuhurAudioFile(e.target.files[0])}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                      />
                      {dhuhurAudioUrl && <p className="text-xs text-emerald-600 font-medium mt-2">✓ Audio kustom terpasang.</p>}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-2">Jam Sholat Ashar</label>
                      <input 
                        type="time" 
                        value={asharTime}
                        onChange={e => setAsharTime(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-lg text-slate-900 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-2">Audio Pengumuman Ashar</label>
                      <input 
                        type="file" 
                        accept="audio/*"
                        onChange={e => e.target.files && setAsharAudioFile(e.target.files[0])}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                      />
                      {asharAudioUrl && <p className="text-xs text-emerald-600 font-medium mt-2">✓ Audio kustom terpasang.</p>}
                    </div>
                  </div>
                </div>
              </div>

              <button 
                onClick={saveSettings}
                disabled={uploadStatus.isUploading}
                className={`w-full py-4 text-white font-bold rounded-xl text-lg shadow-lg transition-all active:scale-95 ${uploadStatus.isUploading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30'}`}
              >
                {uploadStatus.isUploading ? 'Sedang Menyimpan...' : 'Simpan Pengaturan Khusus'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>

    {uploadStatus.isUploading && (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in duration-200">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full mx-4 transform animate-in zoom-in-95 duration-200">
          <h3 className="text-xl font-bold text-slate-800 mb-2">Proses Penyimpanan</h3>
          <p className="text-sm text-slate-500 mb-6 font-medium">{uploadStatus.text}</p>
          
          <div className="w-full bg-slate-100 rounded-full h-4 mb-2 overflow-hidden shadow-inner">
            <div 
              className="bg-indigo-600 h-4 rounded-full transition-all duration-500 ease-out relative"
              style={{ width: `${uploadStatus.progress}%` }}
            >
              <div className="absolute inset-0 bg-white/20 animate-[shimmer_1s_infinite_linear] bg-gradient-to-r from-transparent via-white/40 to-transparent"></div>
            </div>
          </div>
          
          <div className="flex justify-between items-center text-sm font-bold text-indigo-700">
            <span>{uploadStatus.progress}%</span>
            <span>Mohon Tunggu...</span>
          </div>
        </div>
      </div>
    )}
  </>
);
}
