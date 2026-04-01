import React, { useState, useEffect, useRef } from 'react';

import { initializeApp } from 'firebase/app';

import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken, signInWithEmailAndPassword, signOut } from 'firebase/auth';

import { getFirestore, collection, addDoc, onSnapshot, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

import { Camera, MapPin, Calendar, Clock, LogIn, LayoutDashboard, FileSpreadsheet, User, Send, CheckCircle2, AlertCircle, Loader2, ShieldCheck, Lock, LogOut, X, Store, Settings, Phone, Save } from 'lucide-react';



// --- Firebase Configuration ---

const firebaseConfig = JSON.parse(process.env.REACT_APP_FIREBASE_CONFIG);

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);

const appId = typeof __app_id !== 'undefined' ? __app_id : 'absen-2-legenda';



const CABANG_OPTIONS = [

  "Depot 2 Legenda",

  "Pengyu Kopitiam",

  "Warkop Tarkam",

  "Warehouse Dua Legenda"

];



const App = () => {

  const [user, setUser] = useState(null);

  // Default set to true & dashboard for preview purposes as requested by Tuan Rex

  const [isAdmin, setIsAdmin] = useState(true);

  const [view, setView] = useState('dashboard');

 

  const [loading, setLoading] = useState(true);

  const [submitting, setSubmitting] = useState(false);

  const [showAdminLogin, setShowAdminLogin] = useState(false);

 

  // Admin & Settings State

  const [adminEmail, setAdminEmail] = useState('');

  const [adminPassword, setAdminPassword] = useState('');

  const [authError, setAuthError] = useState('');

  const [whatsappConfigs, setWhatsappConfigs] = useState({}); // { branchName: "numbers" }

  const [isSavingSettings, setIsSavingSettings] = useState(false);



  // Form State

  const [employeeName, setEmployeeName] = useState('');

  const [selectedBranch, setSelectedBranch] = useState('');

  const [location, setLocation] = useState(null);

  const [photo, setPhoto] = useState(null);

  const [attendanceData, setAttendanceData] = useState([]);

 

  // Camera Refs

  const videoRef = useRef(null);

  const canvasRef = useRef(null);

  const [isCameraActive, setIsCameraActive] = useState(false);



  const ADMIN_EMAIL = "admin@dualegenda.com";



  // --- Auth & Settings Load ---

  useEffect(() => {

    const initAuth = async () => {

      try {

        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {

          await signInWithCustomToken(auth, __initial_auth_token);

        } else {

          await signInAnonymously(auth);

        }

      } catch (error) {

        console.error("Auth error:", error);

      }

    };

    initAuth();



    // Load WA Settings from Firestore

    const settingsRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'whatsapp');

    const unsubSettings = onSnapshot(settingsRef, (docSnap) => {

      if (docSnap.exists()) {

        setWhatsappConfigs(docSnap.data());

      } else {

        // Initialize defaults

        const defaults = {};

        CABANG_OPTIONS.forEach(c => defaults[c] = "6281234567890");

        setWhatsappConfigs(defaults);

      }

    });



    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {

      setUser(u);

      // Only set to user email if not forced for preview

      if (u?.email) setIsAdmin(u.email === ADMIN_EMAIL);

      setLoading(false);

    });



    return () => {

      unsubscribeAuth();

      unsubSettings();

    };

  }, []);



  // --- Fetch Attendance Data ---

  useEffect(() => {

    if (!user || !isAdmin) return;

    const q = collection(db, 'artifacts', appId, 'public', 'data', 'absensi');

    const unsubscribe = onSnapshot(q, (snapshot) => {

      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const sorted = data.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));

      setAttendanceData(sorted);

    }, (err) => console.error("Firestore error:", err));



    return () => unsubscribe();

  }, [user, isAdmin]);



  // --- Actions ---

  const handleAdminLogin = async (e) => {

    e.preventDefault();

    setAuthError('');

    setLoading(true);

    try {

      await signInWithEmailAndPassword(auth, adminEmail, adminPassword);

      setShowAdminLogin(false);

      setView('dashboard');

    } catch (error) {

      setAuthError('Email atau Password salah, Tuan.');

    } finally {

      setLoading(false);

    }

  };



  const handleSaveWASettings = async () => {

    setIsSavingSettings(true);

    try {

      const settingsRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'whatsapp');

      await setDoc(settingsRef, whatsappConfigs);

    } catch (error) {

      alert("Gagal menyimpan pengaturan.");

    } finally {

      setIsSavingSettings(false);

    }

  };



  const handleLogout = async () => {

    await signOut(auth);

    await signInAnonymously(auth);

    setView('login');

    setIsAdmin(false);

  };



  const getGeoLocation = () => {

    if (navigator.geolocation) {

      navigator.geolocation.getCurrentPosition(

        (position) => setLocation({ lat: position.coords.latitude, lng: position.coords.longitude }),

        (error) => console.error("Location error:", error)

      );

    }

  };



  const startCamera = async () => {

    setIsCameraActive(true);

    try {

      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });

      if (videoRef.current) videoRef.current.srcObject = stream;

    } catch (err) {

      setIsCameraActive(false);

    }

  };



  const capturePhoto = () => {

    const context = canvasRef.current.getContext('2d');

    canvasRef.current.width = videoRef.current.videoWidth;

    canvasRef.current.height = videoRef.current.videoHeight;

    context.drawImage(videoRef.current, 0, 0);

    setPhoto(canvasRef.current.toDataURL('image/jpeg'));

    const stream = videoRef.current.srcObject;

    stream.getTracks().forEach(track => track.stop());

    setIsCameraActive(false);

  };



  const handleSubmitAttendance = async () => {

    if (!employeeName || !selectedBranch || !photo || !location) return;

    setSubmitting(true);

    const now = new Date();

    const payload = {

      employeeName, selectedBranch, photo, latitude: location.lat, longitude: location.lng,

      timestamp: serverTimestamp(),

      formattedTime: now.toLocaleTimeString('id-ID'),

      formattedDate: now.toLocaleDateString('id-ID'),

    };

    try {

      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'absensi'), payload);

      const targetNumbersStr = whatsappConfigs[selectedBranch] || "";

      const targetNumbers = targetNumbersStr.split(',').map(n => n.trim()).filter(n => n);

      const waMessage = `*Notifikasi Absensi Absen2Legenda*\n\nNama: ${employeeName}\nCabang: ${selectedBranch}\nWaktu: ${payload.formattedTime}\nTanggal: ${payload.formattedDate}\nLokasi: https://www.google.com/maps?q=${location.lat},${location.lng}`;

      if (targetNumbers.length > 0) {

        window.open(`https://wa.me/${targetNumbers[0]}?text=${encodeURIComponent(waMessage)}`, '_blank');

      }

      setView('success');

    } catch (error) {

      console.error("Submit error:", error);

    } finally {

      setSubmitting(false);

    }

  };



  const exportToCSV = () => {

    if (attendanceData.length === 0) return;

    const headers = ["Nama", "Cabang", "Tanggal", "Jam", "Latitude", "Longitude"];

    const rows = attendanceData.map(row => [row.employeeName, row.selectedBranch, row.formattedDate, row.formattedTime, row.latitude, row.longitude]);

    let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");

    const link = document.createElement("a");

    link.setAttribute("href", encodeURI(csvContent));

    link.setAttribute("download", `Laporan_Absen2Legenda.csv`);

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

  };



  const bgPatternStyle = {

    backgroundImage: `url("data:image/svg+xml,%3Csvg width='120' height='120' viewBox='0 0 120 120' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M9 66.828c.477-.123.955-.246 1.433-.369 1.404-.36 2.808-.72 4.212-1.08 1.428-.364 2.856-.728 4.284-1.092 1.424-.363 2.848-.726 4.272-1.089 1.436-.366 2.872-.732 4.308-1.098 1.416-.361 2.832-.722 4.248-1.083 1.432-.365 2.864-.73 4.296-1.095 1.412-.36 2.824-.72 4.236-1.08 1.436-.366 2.872-.732 4.308-1.098 1.412-.36 2.824-.72 4.236-1.08 1.432-.365 2.864-.73 4.296-1.095 1.412-.36 2.824-.72 4.236-1.08 1.432-.365 2.864-.73 4.296-1.095 1.412-.36 2.824-.72 4.236-1.08 1.432-.365 2.864-.73 4.296-1.095 1.412-.36 2.824-.72 4.236-1.08 1.436-.366 2.872-.732 4.308-1.098 1.412-.36 2.824-.72 4.236-1.08 1.432-.365 2.864-.73 4.296-1.095 1.412-.36 2.824-.72 4.236-1.08 1.432-.365 2.864-.73 4.296-1.095 1.412-.36 2.824-.72 4.236-1.08 1.432-.365 2.864-.73 4.296-1.095 1.412-.36 2.824-.72 4.236-1.08 1.432-.365 2.864-.73 4.296-1.095 1.412-.36 2.824-.72 4.236-1.08 1.432-.365 2.864-.73 4.296-1.095 1.412-.36 2.824-.72 4.236-1.08 1.432-.365 2.864-.73 4.296-1.095 1.412-.36 2.824-.72 4.236-1.08 1.432-.365 2.864-.73 4.296-1.095' fill='none' stroke='%23ffffff' stroke-opacity='0.03' stroke-width='1.5'/%3E%3Cpath d='M0 120a20 20 0 1 1 40 0a20 20 0 1 1 40 0a20 20 0 1 1 40 0' fill='none' stroke='%23ffffff' stroke-opacity='0.02' stroke-width='1'/%3E%3Ccircle cx='60' cy='60' r='10' fill='none' stroke='%23ffffff' stroke-opacity='0.02' stroke-width='1'/%3E%3C/svg%3E")`,

    backgroundAttachment: 'fixed',

  };



  if (loading && !submitting) {

    return (

      <div className="min-h-screen flex flex-col items-center justify-center bg-black gap-4" style={bgPatternStyle}>

        <Loader2 className="animate-spin text-blue-500 w-12 h-12" />

        <p className="text-slate-500 font-medium tracking-widest uppercase text-xs">Memuat Dashboard Legenda...</p>

      </div>

    );

  }



  return (

    <div className="min-h-screen bg-black font-sans text-slate-100 relative overflow-hidden" style={bgPatternStyle}>

      <div className="fixed inset-0 pointer-events-none bg-gradient-to-b from-blue-900/10 via-transparent to-red-900/10 opacity-30"></div>



      <nav className="bg-slate-900/60 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex justify-between items-center sticky top-0 z-50">

        <div className="flex items-center gap-2 font-black text-2xl tracking-tighter text-blue-400 cursor-pointer" onClick={() => setView('login')}>

          <ShieldCheck className="w-8 h-8 text-blue-500" />

          <span>Absen2Legenda</span>

        </div>

        <div className="flex gap-2">

          {isAdmin ? (

            <div className="flex items-center gap-2">

               <button onClick={() => setView(view === 'dashboard' ? 'login' : 'dashboard')} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/10 text-blue-400 font-bold text-sm border border-blue-500/20 hover:bg-blue-500/20 transition-all">

                {view === 'dashboard' ? <LogIn className="w-4 h-4" /> : <LayoutDashboard className="w-4 h-4" />}

                {view === 'dashboard' ? "Tampilan Absen" : "Dashboard"}

              </button>

              <button onClick={handleLogout} className="p-2 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 transition-all"><LogOut className="w-5 h-5" /></button>

            </div>

          ) : (

            <button onClick={() => setShowAdminLogin(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold text-sm shadow-lg hover:bg-slate-700 transition-all">

              <Lock className="w-4 h-4 text-blue-400" /> Admin Login

            </button>

          )}

        </div>

      </nav>



      {/* Admin Login Modal */}

      {showAdminLogin && (

        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">

          <div className="bg-slate-900/90 border border-slate-800 rounded-[32px] shadow-2xl w-full max-w-sm overflow-hidden relative animate-in zoom-in duration-300 backdrop-blur-xl">

            <button onClick={() => setShowAdminLogin(false)} className="absolute top-6 right-6 text-slate-500 hover:text-slate-300"><X className="w-6 h-6" /></button>

            <div className="p-8">

              <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center mb-6 border border-blue-500/20"><ShieldCheck className="w-10 h-10" /></div>

              <h2 className="text-2xl font-black text-white mb-2 tracking-tight">Gerbang Admin</h2>

              <form onSubmit={handleAdminLogin} className="space-y-4">

                <input type="email" placeholder="Email Admin" className="w-full px-4 py-3.5 rounded-2xl bg-black/40 border border-slate-700 text-white outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} required />

                <input type="password" placeholder="Password" className="w-full px-4 py-3.5 rounded-2xl bg-black/40 border border-slate-700 text-white outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} required />

                {authError && <p className="text-red-500 text-xs font-bold">{authError}</p>}

                <button type="submit" className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-blue-500 transition-all transform active:scale-95">Masuk</button>

              </form>

            </div>

          </div>

        </div>

      )}



      <main className="max-w-5xl mx-auto p-4 sm:p-8 relative z-10">

       

        {/* VIEW: LOGIN (IDENTITY) */}

        {view === 'login' && (

          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl p-10 max-w-md mx-auto animate-in fade-in zoom-in duration-300">

            <div className="text-center mb-8">

               <h2 className="text-3xl font-black text-white mb-2 tracking-tight">Presensi Legenda</h2>

               <p className="text-slate-400">Siapkan diri Anda untuk tugas hari ini.</p>

            </div>

            <div className="space-y-5">

              <div>

                <label className="block text-xs font-bold mb-2 text-slate-500 uppercase tracking-widest ml-1">Cabang Penempatan</label>

                <div className="relative">

                  <Store className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />

                  <select

                    value={selectedBranch}

                    onChange={(e) => setSelectedBranch(e.target.value)}

                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-black/40 border border-slate-700 text-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none appearance-none transition-all font-medium"

                  >

                    <option value="" className="bg-slate-900 text-slate-400">Pilih Cabang...</option>

                    {CABANG_OPTIONS.map(c => <option key={c} value={c} className="bg-slate-900">{c}</option>)}

                  </select>

                </div>

              </div>

              <div>

                <label className="block text-xs font-bold mb-2 text-slate-500 uppercase tracking-widest ml-1">Identitas Diri</label>

                <div className="relative">

                  <User className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />

                  <input type="text" value={employeeName} onChange={(e) => setEmployeeName(e.target.value)} placeholder="Nama lengkap..." className="w-full pl-12 pr-4 py-4 rounded-2xl bg-black/40 border border-slate-700 text-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-lg font-medium" />

                </div>

              </div>

              <button onClick={() => { if(!employeeName || !selectedBranch) return alert("Data tidak lengkap."); setView('checkin'); getGeoLocation(); }} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 transform active:scale-95">Lanjut Absen <Send className="w-5 h-5" /></button>

            </div>

          </div>

        )}



        {/* VIEW: DASHBOARD (PREVIEW UTAMA) */}

        {view === 'dashboard' && isAdmin ? (

          <div className="animate-in fade-in slide-in-from-top-4 duration-500 space-y-10">

           

            {/* WHATSAPP SETTINGS PANEL */}

            <div className="bg-slate-900/40 backdrop-blur-md rounded-[32px] border border-blue-500/20 p-8">

               <div className="flex items-center gap-4 mb-8">

                 <div className="p-4 bg-blue-500/10 rounded-2xl text-blue-500 border border-blue-500/20"><Settings className="w-7 h-7" /></div>

                 <div>

                   <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Pengaturan Notifikasi Cabang</h2>

                   <p className="text-xs font-bold text-slate-500 tracking-widest">Kendalikan nomor tujuan WhatsApp per lokasi</p>

                 </div>

               </div>



               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                 {CABANG_OPTIONS.map(branch => (

                   <div key={branch} className="space-y-2 group">

                     <div className="flex justify-between items-center px-1">

                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{branch}</label>

                        <span className="text-[8px] font-bold text-blue-500/40 opacity-0 group-focus-within:opacity-100 transition-opacity uppercase italic">Sedang Diedit</span>

                     </div>

                     <div className="relative">

                       <Phone className="absolute left-5 top-4 w-4 h-4 text-slate-600 group-focus-within:text-blue-500 transition-colors" />

                       <input

                        type="text"

                        placeholder="Pisahkan nomor dengan koma (62812..., 62813...)"

                        className="w-full pl-12 pr-4 py-4 rounded-2xl bg-black/40 border border-slate-800 text-white text-sm outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all font-mono"

                        value={whatsappConfigs[branch] || ''}

                        onChange={(e) => setWhatsappConfigs({...whatsappConfigs, [branch]: e.target.value})}

                       />

                     </div>

                   </div>

                 ))}

               </div>

               

               <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-800/50">

                  <div className="flex items-center gap-2 text-[9px] text-slate-600 font-bold italic">

                     <AlertCircle className="w-3 h-3 text-amber-500" />

                     <span>Catatan: Gunakan kode negara (misal: 628) tanpa tanda +</span>

                  </div>

                  <button

                    onClick={handleSaveWASettings}

                    disabled={isSavingSettings}

                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 rounded-[20px] font-black shadow-2xl shadow-blue-900/40 transition-all transform active:scale-95 disabled:opacity-50"

                  >

                    {isSavingSettings ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> SIMPAN SEMUA PERUBAHAN</>}

                  </button>

               </div>

            </div>



            {/* ATTENDANCE RECAP */}

            <div className="space-y-8">

              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">

                <div className="flex items-center gap-4">

                  <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-500"><LayoutDashboard className="w-6 h-6" /></div>

                  <div>

                    <h1 className="text-3xl font-black text-white tracking-tighter">Rekapitulasi Legenda</h1>

                    <p className="text-slate-500 font-medium text-sm">Log kehadiran harian seluruh cabang</p>

                  </div>

                </div>

                <div className="flex gap-4 w-full md:w-auto">

                  <div className="bg-slate-900/50 backdrop-blur-md px-6 py-3 rounded-2xl flex flex-col items-center justify-center border border-slate-800 min-w-[140px]">

                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Entri Terdaftar</span>

                    <span className="text-3xl font-black text-blue-500 tracking-tighter leading-none">{attendanceData.length}</span>

                  </div>

                  <button onClick={exportToCSV} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-2xl font-black shadow-xl shadow-emerald-900/20 transition-all transform hover:-translate-y-1">

                    <FileSpreadsheet className="w-5 h-5" /> UNDUH CSV

                  </button>

                </div>

              </div>



              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">

                {attendanceData.map((item) => (

                  <div key={item.id} className="bg-slate-900/40 backdrop-blur-md rounded-[40px] shadow-2xl overflow-hidden border border-slate-800 hover:border-slate-600 transition-all group flex flex-col animate-in fade-in duration-500">

                    <div className="aspect-[4/3] relative overflow-hidden bg-black">

                      <img src={item.photo} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-70 group-hover:opacity-100" />

                      <div className="absolute top-6 left-6 bg-blue-600/90 backdrop-blur-md px-4 py-1.5 rounded-full font-black text-[10px] text-white shadow-lg uppercase tracking-widest border border-blue-400/30">{item.selectedBranch}</div>

                      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60"></div>

                      <div className="absolute bottom-6 left-6 right-6 opacity-0 group-hover:opacity-100 transition-all translate-y-4 group-hover:translate-y-0">

                         <a href={`https://www.google.com/maps?q=${item.latitude},${item.longitude}`} target="_blank" rel="noreferrer" className="bg-white text-black py-3 rounded-2xl text-xs font-black flex items-center gap-2 w-full justify-center shadow-2xl hover:bg-slate-100">

                           <MapPin className="w-4 h-4 text-red-600 animate-pulse" /> LIHAT LOKASI MAPS

                         </a>

                      </div>

                    </div>

                    <div className="p-8 flex-1 flex flex-col">

                      <div className="font-black text-2xl mb-1 text-white truncate uppercase tracking-tighter leading-none">{item.employeeName}</div>

                      <div className="text-[10px] font-black text-blue-500/60 uppercase mb-6 tracking-[0.2em] italic">{item.selectedBranch}</div>

                      <div className="mt-auto grid grid-cols-2 gap-4 border-t border-slate-800/50 pt-6">

                        <div className="flex flex-col gap-1">

                           <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-1"><Calendar className="w-2.5 h-2.5" /> Tanggal</span>

                           <span className="text-xs font-bold text-slate-300">{item.formattedDate}</span>

                        </div>

                        <div className="flex flex-col gap-1">

                           <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> Waktu</span>

                           <span className="text-xs font-bold text-slate-300">{item.formattedTime} WIB</span>

                        </div>

                      </div>

                    </div>

                  </div>

                ))}

                {attendanceData.length === 0 && (

                  <div className="col-span-full py-32 text-center bg-slate-900/10 rounded-[60px] border-4 border-dashed border-slate-800 flex flex-col items-center gap-6">

                     <div className="w-24 h-24 bg-slate-900 rounded-full flex items-center justify-center text-slate-800 border border-slate-800/50"><User className="w-12 h-12" /></div>

                     <p className="text-slate-700 font-black text-xl italic tracking-[0.3em] uppercase">Arsip Legenda Masih Kosong</p>

                  </div>

                )}

              </div>

            </div>

          </div>

        ) : view === 'dashboard' && !isAdmin ? (

          <div className="text-center py-20 bg-slate-900/50 backdrop-blur-xl rounded-[40px] shadow-xl max-w-lg mx-auto border border-red-900/20">

            <Lock className="w-16 h-16 text-red-500/20 mx-auto mb-6" />

            <h2 className="text-2xl font-black text-white mb-4 uppercase tracking-tighter">Gerbang Terkunci</h2>

            <button onClick={() => setShowAdminLogin(true)} className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black transition-all">Hubungi Admin</button>

          </div>

        ) : null}



        {/* VIEW: SUCCESS & CHECK-IN UI (Hidden for Dashboard Preview) */}

        {view === 'success' && <div className="text-center text-white">Berhasil Terkirim.</div>}



      </main>

     

      <footer className="py-12 text-center opacity-30 relative z-10">

        <div className="flex items-center justify-center gap-2 font-black text-slate-500 text-lg mb-1 tracking-tighter uppercase italic">

          <ShieldCheck className="w-5 h-5 text-blue-900" /> Absen2Legenda

        </div>

        <p className="text-slate-600 text-[10px] font-bold uppercase tracking-[0.3em]">Imperial Attendance Hub &bull; MMXXVI</p>

      </footer>

    </div>

  );

};



export default App;