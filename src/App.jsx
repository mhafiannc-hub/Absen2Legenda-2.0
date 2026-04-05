import React, { useEffect, useMemo, useRef, useState } from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut
} from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getFirestore,
  onSnapshot,
  serverTimestamp,
  setDoc
} from "firebase/firestore";
import {
  Calendar,
  Camera,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  LayoutDashboard,
  Loader2,
  Lock,
  LogIn,
  LogOut,
  MapPin,
  Phone,
  Save,
  Send,
  Settings,
  ShieldCheck,
  Store,
  User,
  X
} from "lucide-react";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const hasFirebaseConfig = Object.values(firebaseConfig).every(Boolean);
const firebaseApp = hasFirebaseConfig ? initializeApp(firebaseConfig) : null;
const auth = firebaseApp ? getAuth(firebaseApp) : null;
const db = firebaseApp ? getFirestore(firebaseApp) : null;
const appId = import.meta.env.VITE_APP_ID || "absen-2-legenda";
const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || "admin@dualegenda.com";

const CABANG_OPTIONS = [
  "Depot 2 Legenda",
  "Pengyu Kopitiam",
  "Warkop Tarkam",
  "Warehouse Dua Legenda"
];

const bgPatternStyle = {
  backgroundImage:
    'url("data:image/svg+xml,%3Csvg width=\'120\' height=\'120\' viewBox=\'0 0 120 120\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M9 66.828c.477-.123.955-.246 1.433-.369 1.404-.36 2.808-.72 4.212-1.08 1.428-.364 2.856-.728 4.284-1.092 1.424-.363 2.848-.726 4.272-1.089 1.436-.366 2.872-.732 4.308-1.098 1.416-.361 2.832-.722 4.248-1.083 1.432-.365 2.864-.73 4.296-1.095 1.412-.36 2.824-.72 4.236-1.08 1.436-.366 2.872-.732 4.308-1.098 1.412-.36 2.824-.72 4.236-1.08 1.432-.365 2.864-.73 4.296-1.095 1.412-.36 2.824-.72 4.236-1.08 1.432-.365 2.864-.73 4.296-1.095 1.412-.36 2.824-.72 4.236-1.08 1.432-.365 2.864-.73 4.296-1.095 1.412-.36 2.824-.72 4.236-1.08 1.432-.365 2.864-.73 4.296-1.095 1.412-.36 2.824-.72 4.236-1.08 1.432-.365 2.864-.73 4.296-1.095 1.412-.36 2.824-.72 4.236-1.08 1.432-.365 2.864-.73 4.296-1.095 1.412-.36 2.824-.72 4.236-1.08 1.432-.365 2.864-.73 4.296-1.095 1.412-.36 2.824-.72 4.236-1.08 1.432-.365 2.864-.73 4.296-1.095\' fill=\'none\' stroke=\'%23ffffff\' stroke-opacity=\'0.03\' stroke-width=\'1.5\'/%3E%3Cpath d=\'M0 120a20 20 0 1 1 40 0a20 20 0 1 1 40 0a20 20 0 1 1 40 0\' fill=\'none\' stroke=\'%23ffffff\' stroke-opacity=\'0.02\' stroke-width=\'1\'/%3E%3Ccircle cx=\'60\' cy=\'60\' r=\'10\' fill=\'none\' stroke=\'%23ffffff\' stroke-opacity=\'0.02\' stroke-width=\'1\'/%3E%3C/svg%3E")',
  backgroundAttachment: "fixed"
};

function App() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [view, setView] = useState("login");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [whatsappConfigs, setWhatsappConfigs] = useState({});
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [employeeName, setEmployeeName] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [location, setLocation] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [attendanceData, setAttendanceData] = useState([]);
  const [configError, setConfigError] = useState("");
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const defaultWhatsappConfigs = useMemo(
    () =>
      CABANG_OPTIONS.reduce((acc, branch) => {
        acc[branch] = "6281234567890";
        return acc;
      }, {}),
    []
  );

  useEffect(() => {
    if (!auth) {
      setConfigError("Firebase belum dikonfigurasi. Lengkapi file .env terlebih dahulu.");
      setLoading(false);
      return undefined;
    }

    let isMounted = true;

    signInAnonymously(auth).catch((error) => {
      console.error("Auth error:", error);
      if (isMounted) {
        setConfigError("Gagal melakukan koneksi ke Firebase. Periksa konfigurasi project.");
        setLoading(false);
      }
    });

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (!isMounted) {
        return;
      }

      setUser(currentUser);
      setIsAdmin(currentUser?.email === ADMIN_EMAIL);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      unsubscribeAuth();
    };
  }, []);

  useEffect(() => {
    if (!user || !db) {
      return undefined;
    }

    const settingsRef = doc(db, "artifacts", appId, "public", "data", "settings", "whatsapp");
    const unsubscribeSettings = onSnapshot(
      settingsRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setWhatsappConfigs(docSnap.data());
        } else {
          setWhatsappConfigs(defaultWhatsappConfigs);
        }
      },
      (error) => {
        console.error("Settings listener error:", error);
      }
    );

    return () => unsubscribeSettings();
  }, [defaultWhatsappConfigs, user]);

  useEffect(() => {
    if (!user || !isAdmin || !db) {
      return undefined;
    }

    const attendanceRef = collection(db, "artifacts", appId, "public", "data", "absensi");
    const unsubscribeAttendance = onSnapshot(
      attendanceRef,
      (snapshot) => {
        const data = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data()
        }));
        const sorted = data.sort(
          (a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)
        );
        setAttendanceData(sorted);
      },
      (error) => {
        console.error("Attendance listener error:", error);
      }
    );

    return () => unsubscribeAttendance();
  }, [isAdmin, user]);

  useEffect(() => {
    return () => {
      const stream = videoRef.current?.srcObject;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleAdminLogin = async (event) => {
    event.preventDefault();
    if (!auth) {
      return;
    }

    setAuthError("");
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
      setShowAdminLogin(false);
      setView("dashboard");
    } catch (error) {
      console.error("Admin login error:", error);
      setAuthError("Email atau password admin tidak valid.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveWASettings = async () => {
    if (!user || !db) {
      return;
    }

    setIsSavingSettings(true);
    try {
      const settingsRef = doc(db, "artifacts", appId, "public", "data", "settings", "whatsapp");
      await setDoc(settingsRef, whatsappConfigs);
      window.alert("Pengaturan WhatsApp cabang berhasil disimpan.");
    } catch (error) {
      console.error("Save settings error:", error);
      window.alert("Gagal menyimpan pengaturan WhatsApp.");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleLogout = async () => {
    if (!auth) {
      return;
    }

    await signOut(auth);
    await signInAnonymously(auth);
    setView("login");
    setIsAdmin(false);
  };

  const getGeoLocation = () => {
    if (!navigator.geolocation) {
      window.alert("Browser ini tidak mendukung geolocation.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      () => {
        window.alert("Gagal mendapatkan lokasi.");
      }
    );
  };

  const startCamera = async () => {
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error("Camera error:", error);
      setIsCameraActive(false);
      window.alert("Akses kamera ditolak atau tidak tersedia.");
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) {
      return;
    }

    const context = canvasRef.current.getContext("2d");
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    context.drawImage(videoRef.current, 0, 0);
    setPhoto(canvasRef.current.toDataURL("image/jpeg"));

    const stream = videoRef.current.srcObject;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    setIsCameraActive(false);
  };

  const handleSubmitAttendance = async () => {
    if (!user || !db) {
      window.alert("Sesi belum siap. Silakan refresh halaman.");
      return;
    }

    if (!employeeName || !selectedBranch || !photo || !location) {
      window.alert("Data identitas, foto, atau lokasi belum lengkap.");
      return;
    }

    setSubmitting(true);
    const now = new Date();
    const payload = {
      employeeName,
      selectedBranch,
      photo,
      latitude: location.lat,
      longitude: location.lng,
      timestamp: serverTimestamp(),
      formattedTime: now.toLocaleTimeString("id-ID"),
      formattedDate: now.toLocaleDateString("id-ID")
    };

    try {
      await addDoc(collection(db, "artifacts", appId, "public", "data", "absensi"), payload);

      const targetNumbersStr = whatsappConfigs[selectedBranch] || "";
      const targetNumbers = targetNumbersStr
        .split(",")
        .map((number) => number.trim())
        .filter(Boolean);

      const waMessage = `*Notifikasi Absensi Absen2Legenda*\n\nNama: ${employeeName}\nCabang: ${selectedBranch}\nWaktu: ${payload.formattedTime}\nTanggal: ${payload.formattedDate}\nLokasi: https://www.google.com/maps?q=${location.lat},${location.lng}`;

      if (targetNumbers.length > 0) {
        window.open(
          `https://wa.me/${targetNumbers[0]}?text=${encodeURIComponent(waMessage)}`,
          "_blank"
        );
      }

      setView("success");
    } catch (error) {
      console.error("Submit attendance error:", error);
      window.alert("Gagal mengirim data absensi.");
    } finally {
      setSubmitting(false);
    }
  };

  const exportToCSV = () => {
    if (attendanceData.length === 0) {
      return;
    }

    const headers = ["Nama", "Cabang", "Tanggal", "Jam", "Latitude", "Longitude"];
    const rows = attendanceData.map((row) => [
      row.employeeName,
      row.selectedBranch,
      row.formattedDate,
      row.formattedTime,
      row.latitude,
      row.longitude
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((entry) => entry.join(","))].join("\n");

    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute(
      "download",
      `Laporan_Absen2Legenda_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading && !submitting) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center bg-black gap-4"
        style={bgPatternStyle}
      >
        <Loader2 className="animate-spin text-blue-500 w-12 h-12" />
        <p className="text-slate-500 font-medium tracking-widest uppercase text-xs">
          Menyambungkan Kuil Legenda...
        </p>
      </div>
    );
  }

  if (configError) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-6 flex items-center justify-center">
        <div className="max-w-xl w-full rounded-3xl border border-red-900/50 bg-slate-900/70 p-8 shadow-2xl">
          <h1 className="text-2xl font-black text-white mb-3">Konfigurasi Belum Lengkap</h1>
          <p className="text-slate-300 mb-4">{configError}</p>
          <div className="rounded-2xl bg-black/40 border border-slate-800 p-4 text-sm text-slate-400">
            Isi nilai Firebase pada file <code>.env</code> berdasarkan contoh di <code>.env.example</code>, lalu jalankan ulang aplikasi.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-black font-sans text-slate-100 relative overflow-hidden"
      style={bgPatternStyle}
    >
      <div className="fixed inset-0 pointer-events-none bg-gradient-to-b from-blue-900/10 via-transparent to-red-900/10 opacity-30" />

      <nav className="bg-slate-900/60 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div
          className="flex items-center gap-2 font-black text-2xl tracking-tighter text-blue-400 cursor-pointer"
          onClick={() => setView("login")}
        >
          <ShieldCheck className="w-8 h-8 text-blue-500" />
          <span>Absen2Legenda</span>
        </div>
        <div className="flex gap-2">
          {isAdmin ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setView(view === "dashboard" ? "login" : "dashboard")}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/10 text-blue-400 font-bold text-sm border border-blue-500/20 hover:bg-blue-500/20 transition-all"
              >
                {view === "dashboard" ? <LogIn className="w-4 h-4" /> : <LayoutDashboard className="w-4 h-4" />}
                {view === "dashboard" ? "Absen" : "Admin"}
              </button>
              <button
                onClick={handleLogout}
                className="p-2 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 transition-all"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAdminLogin(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold text-sm shadow-lg hover:bg-slate-700 transition-all"
            >
              <Lock className="w-4 h-4 text-blue-400" /> Admin Login
            </button>
          )}
        </div>
      </nav>

      {showAdminLogin && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900/90 border border-slate-800 rounded-[32px] shadow-2xl w-full max-w-sm overflow-hidden relative backdrop-blur-xl">
            <button
              onClick={() => setShowAdminLogin(false)}
              className="absolute top-6 right-6 text-slate-500 hover:text-slate-300"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="p-8">
              <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center mb-6 border border-blue-500/20">
                <ShieldCheck className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-black text-white mb-2">Akses Admin</h2>
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <input
                  type="email"
                  placeholder="Email Admin"
                  className="w-full px-4 py-3.5 rounded-2xl bg-black/40 border border-slate-700 text-white outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                  value={adminEmail}
                  onChange={(event) => setAdminEmail(event.target.value)}
                  required
                />
                <input
                  type="password"
                  placeholder="Password"
                  className="w-full px-4 py-3.5 rounded-2xl bg-black/40 border border-slate-700 text-white outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                  value={adminPassword}
                  onChange={(event) => setAdminPassword(event.target.value)}
                  required
                />
                {authError && <p className="text-red-500 text-xs font-bold">{authError}</p>}
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-blue-500 transition-all transform active:scale-95"
                >
                  Masuk
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-4xl mx-auto p-4 sm:p-8 relative z-10">
        {view === "login" && (
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl p-10 max-w-md mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-black text-white mb-2 tracking-tight">Presensi Harian</h2>
              <p className="text-slate-400">Siapkan diri Anda, Legenda.</p>
            </div>
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold mb-2 text-slate-500 uppercase tracking-widest ml-1">
                  Pilih Cabang Tugas
                </label>
                <div className="relative">
                  <Store className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                  <select
                    value={selectedBranch}
                    onChange={(event) => setSelectedBranch(event.target.value)}
                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-black/40 border border-slate-700 text-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none appearance-none transition-all font-medium"
                  >
                    <option value="" className="bg-slate-900 text-slate-400">
                      Pilih Cabang...
                    </option>
                    {CABANG_OPTIONS.map((branch) => (
                      <option key={branch} value={branch} className="bg-slate-900">
                        {branch}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold mb-2 text-slate-500 uppercase tracking-widest ml-1">
                  Identitas Legenda
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                  <input
                    type="text"
                    value={employeeName}
                    onChange={(event) => setEmployeeName(event.target.value)}
                    placeholder="Nama lengkap..."
                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-black/40 border border-slate-700 text-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-lg font-medium"
                  />
                </div>
              </div>
              <button
                onClick={() => {
                  if (!employeeName || !selectedBranch) {
                    window.alert("Pilih cabang dan isi nama terlebih dahulu.");
                    return;
                  }
                  setView("checkin");
                  getGeoLocation();
                }}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 transform active:scale-95"
              >
                Lanjut Absen <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {view === "checkin" && (
          <div className="space-y-6 max-w-lg mx-auto">
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-xl p-6 border-t-4 border-blue-500">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black flex items-center gap-2 text-white">
                  <Camera className="w-6 h-6 text-blue-500" /> Foto Selfie
                </h2>
                <div className="bg-black/40 px-3 py-2 rounded-xl border border-slate-800 text-right">
                  <div className="flex items-center gap-1 text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                    <Calendar className="w-3 h-3 text-blue-500" /> {new Date().toLocaleDateString("id-ID")}
                  </div>
                </div>
              </div>
              <div className="relative aspect-[3/4] bg-black rounded-2xl overflow-hidden mb-6 border-2 border-slate-800 group">
                {photo ? (
                  <img src={photo} className="w-full h-full object-cover" alt="Foto selfie" />
                ) : isCameraActive ? (
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-700 font-bold">Kamera Mati</div>
                )}
                <canvas ref={canvasRef} className="hidden" />
              </div>
              <div className="flex gap-3">
                {!isCameraActive && !photo ? (
                  <button
                    onClick={startCamera}
                    className="flex-1 bg-slate-800 text-white py-4 rounded-2xl font-black transition-all"
                  >
                    Buka Kamera
                  </button>
                ) : isCameraActive ? (
                  <button
                    onClick={capturePhoto}
                    className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg"
                  >
                    <CheckCircle2 className="w-5 h-5" /> Ambil Foto
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setPhoto(null);
                      startCamera();
                    }}
                    className="flex-1 bg-slate-700/50 text-slate-300 py-4 rounded-2xl font-black border border-slate-600"
                  >
                    Ulangi
                  </button>
                )}
              </div>
            </div>

            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-xl p-6 border-t-4 border-emerald-500">
              <h2 className="text-xl font-black flex items-center gap-2 mb-4 text-white">
                <MapPin className="w-6 h-6 text-emerald-500" /> Lokasi Langit
              </h2>
              {location ? (
                <div className="bg-emerald-500/10 text-emerald-400 p-4 rounded-2xl border border-emerald-500/20 font-black text-sm uppercase tracking-wider">
                  Lokasi Terkunci
                </div>
              ) : (
                <div className="bg-amber-500/10 text-amber-400 p-4 rounded-2xl border border-amber-500/20 flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm font-bold italic">Mencari Koordinat...</span>
                </div>
              )}
            </div>

            <button
              disabled={submitting || !photo || !location}
              onClick={handleSubmitAttendance}
              className={`w-full py-5 rounded-3xl text-white font-black text-xl shadow-2xl transition-all flex items-center justify-center gap-3 transform active:scale-95 ${
                submitting || !photo || !location
                  ? "bg-slate-700 text-slate-500 grayscale cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-500"
              }`}
            >
              {submitting ? (
                <Loader2 className="animate-spin w-7 h-7" />
              ) : (
                <>
                  <Send className="w-6 h-6" /> Kirim Kehadiran
                </>
              )}
            </button>
          </div>
        )}

        {view === "success" && (
          <div className="text-center py-12">
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-12 rounded-[40px] shadow-2xl inline-block max-w-sm border-b-8 border-green-500">
              <div className="w-24 h-24 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-8 border border-green-500/20">
                <CheckCircle2 className="w-14 h-14" />
              </div>
              <h2 className="text-3xl font-black mb-4 text-white">Berhasil Abadi!</h2>
              <p className="text-slate-400 mb-10 font-medium leading-relaxed">
                Terima kasih. Data Anda telah diamankan di database.
              </p>
              <button
                onClick={() => setView("login")}
                className="bg-white text-black px-10 py-4 rounded-2xl font-black hover:bg-slate-200 transition-all shadow-xl"
              >
                Kembali
              </button>
            </div>
          </div>
        )}

        {view === "dashboard" && isAdmin ? (
          <div className="space-y-12">
            <div className="bg-slate-900/40 backdrop-blur-md rounded-[32px] border border-blue-500/20 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500 border border-blue-500/20">
                  <Settings className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white uppercase tracking-tight">
                    Pengaturan Notifikasi WhatsApp
                  </h2>
                  <p className="text-xs font-bold text-slate-500 tracking-widest">
                    Atur nomor manajer per cabang
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {CABANG_OPTIONS.map((branch) => (
                  <div key={branch} className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                      {branch}
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-3.5 w-4 h-4 text-slate-600" />
                      <input
                        type="text"
                        placeholder="Contoh: 62812, 62813..."
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-black/40 border border-slate-700 text-white text-sm outline-none focus:border-blue-500 transition-all font-mono"
                        value={whatsappConfigs[branch] || ""}
                        onChange={(event) =>
                          setWhatsappConfigs({
                            ...whatsappConfigs,
                            [branch]: event.target.value
                          })
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  onClick={handleSaveWASettings}
                  disabled={isSavingSettings}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-2xl font-black shadow-lg shadow-blue-900/20 transition-all disabled:opacity-50"
                >
                  {isSavingSettings ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Save className="w-5 h-5" /> SIMPAN PENGATURAN
                    </>
                  )}
                </button>
              </div>
              <p className="text-[9px] text-slate-600 mt-4 font-bold italic">
                * Gunakan koma untuk memisahkan nomor. Browser hanya akan membuka nomor pertama secara otomatis.
              </p>
            </div>

            <div className="space-y-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                  <h1 className="text-3xl font-black text-white tracking-tight">
                    Pusat Kendali Legenda
                  </h1>
                  <p className="text-slate-400 font-medium">Monitoring kehadiran tim secara akurat.</p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                  <div className="bg-slate-900/50 backdrop-blur-md px-5 py-3 rounded-2xl flex flex-col items-center justify-center border border-slate-800 min-w-[120px]">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      Total Entri
                    </span>
                    <span className="text-2xl font-black text-blue-400">{attendanceData.length}</span>
                  </div>
                  <button
                    onClick={exportToCSV}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-2xl font-black shadow-lg shadow-emerald-900/20 transition-all"
                  >
                    <FileSpreadsheet className="w-5 h-5" /> EXPORT CSV
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {attendanceData.map((item) => (
                  <div
                    key={item.id}
                    className="bg-slate-900/40 backdrop-blur-md rounded-[32px] shadow-lg overflow-hidden border border-slate-800 hover:border-slate-600 transition-all group flex flex-col"
                  >
                    <div className="aspect-[4/3] relative overflow-hidden bg-black">
                      <img
                        src={item.photo}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-80"
                        alt={item.employeeName}
                      />
                      <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl font-black text-[10px] text-blue-400 border border-slate-800 uppercase tracking-widest">
                        {item.selectedBranch}
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                        <a
                          href={`https://www.google.com/maps?q=${item.latitude},${item.longitude}`}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-white text-black px-6 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 w-full justify-center shadow-xl"
                        >
                          <MapPin className="w-4 h-4 text-red-600" /> CEK MAPS
                        </a>
                      </div>
                    </div>
                    <div className="p-6 flex-1 flex flex-col">
                      <div className="font-black text-xl mb-1 text-white truncate uppercase tracking-tight">
                        {item.employeeName}
                      </div>
                      <div className="text-[10px] font-black text-blue-500/60 uppercase mb-4 tracking-widest">
                        {item.selectedBranch}
                      </div>
                      <div className="mt-auto flex flex-col gap-2 border-t border-slate-800 pt-4">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 italic">
                          <Calendar className="w-4 h-4 text-blue-500/60" /> {item.formattedDate}
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 italic">
                          <Clock className="w-4 h-4 text-blue-500/60" /> {item.formattedTime} WIB
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : view === "dashboard" && !isAdmin ? (
          <div className="text-center py-20 bg-slate-900/50 backdrop-blur-xl rounded-[40px] shadow-xl max-w-lg mx-auto border border-red-900/20">
            <Lock className="w-16 h-16 text-red-500/20 mx-auto mb-6" />
            <h2 className="text-2xl font-black text-white mb-4 uppercase tracking-tighter">
              Gerbang Terkunci
            </h2>
            <button
              onClick={() => setShowAdminLogin(true)}
              className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black transition-all"
            >
              Panggil Admin
            </button>
          </div>
        ) : null}
      </main>

      <footer className="py-12 text-center opacity-30 relative z-10">
        <div className="flex items-center justify-center gap-2 font-black text-slate-500 text-lg mb-1 tracking-tighter uppercase italic">
          <ShieldCheck className="w-5 h-5 text-blue-900" /> Absen2Legenda
        </div>
        <p className="text-slate-600 text-[10px] font-bold uppercase tracking-[0.3em]">
          Imperial Attendance • MMXXVI
        </p>
      </footer>
    </div>
  );
}

export default App;
