/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut, 
  User as FirebaseUser,
  GoogleAuthProvider
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  Timestamp,
  serverTimestamp,
  doc,
  deleteDoc,
  getDocFromServer
} from 'firebase/firestore';


import { 
  Bot, 
  User as UserIcon, 
  Settings, 
  FileText, 
  Send, 
  History, 
  Plus,
  LogOut,
  Download,
  Gamepad2,
  FileCode,
  Paperclip,
  XCircle,
  CheckCircle,
  AlertCircle,
  Loader2,
  Menu,
  LayoutDashboard,
  Home,
  MessageSquare,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Layout,
  FilePlus,
  ArrowRight,
   TrendingUp,
  BrainCircuit,
  GraduationCap,
  Trash2,
  RotateCcw
} from 'lucide-react';


import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { auth, db, googleProvider } from './lib/firebase';
import { generateExam } from './lib/gemini';
import { exportToWord, createGoogleForm } from './lib/exports';
import { Quiz, Question, AttachedFile, GenerateConfig } from './types';
import { formatQuizToMarkdown } from './lib/formatter';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function useWindowSize() {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  useEffect(() => {
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return windowSize;
}

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Layout Components ---

const SidebarItem = ({ 
  icon: Icon, 
  label, 
  isActive, 
  onClick, 
  badge 
}: { 
  icon: any, 
  label: string, 
  isActive?: boolean, 
  onClick: () => void, 
  badge?: string 
}) => (
  <motion.button
    variants={{
      hidden: { opacity: 0, x: -10 },
      visible: { opacity: 1, x: 0 }
    }}
    whileHover={{ x: 4 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group relative overflow-hidden",
      isActive 
        ? "bg-indigo-600 text-white shadow-[0_8px_20px_-4px_rgba(79,70,229,0.4)]" 
        : "text-slate-400 hover:bg-white/5 hover:text-white"
    )}
  >

    {isActive && <div className="active-indicator" />}
    <Icon className={cn("w-5 h-5", isActive ? "text-white" : "text-slate-500 group-hover:text-indigo-400")} />
    <span className="font-semibold text-sm tracking-tight">{label}</span>

    {badge && (
      <span className={cn(
        "ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-bold",
        isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
      )}>
        {badge}
      </span>
    )}
  </motion.button>
);

const SidebarSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
  <div className="space-y-2 pt-6">
    <p className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">{title}</p>
    {children}
  </div>
);

// --- Content Views ---

const DashboardView = ({ 
  quizzes, 
  onViewQuiz,
  onDelete
}: { 
  quizzes: Quiz[], 
  onViewQuiz: (q: Quiz) => void,
  onDelete: (id: string) => void
}) => {

  const stats = [
    { label: 'Total Soal', value: quizzes.length, icon: FileText, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Sesi Aktif', value: '1', icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Subjek Terpopuler', value: quizzes.length > 0 ? Array.from(new Set(quizzes.map(q => q.subject))).sort((a,b) => quizzes.filter(x => x.subject === b).length - quizzes.filter(x => x.subject === a).length)[0] : 'Belum Ada', icon: BrainCircuit, color: 'text-violet-600', bg: 'bg-violet-50' },
  ];


  const topicCounts = quizzes.reduce((acc, q) => {
    acc[q.subject] = (acc[q.subject] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sortedTopics = Object.entries(topicCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const maxCount = Math.max(...Object.values(topicCounts), 1);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Dashboard</h2>
          <p className="text-sm text-slate-500">Selamat datang kembali! Berikut adalah ringkasan aktivitas Anda.</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <motion.div 
            key={i} 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="premium-card p-6 flex items-center gap-5"
          >
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner", stat.bg)}>
              <stat.icon className={cn("w-6 h-6", stat.color)} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{stat.label}</p>
              <p className="text-2xl font-black text-slate-900 tabular-nums">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Quizzes */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Aktivitas Terakhir</h3>
            <button className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition flex items-center gap-1">
              Lihat Semua <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quizzes.length === 0 ? (
              <div className="col-span-full premium-card p-12 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center shadow-inner">
                  <FilePlus className="w-10 h-10 text-slate-300" />
                </div>
                <div className="space-y-1">
                  <p className="text-slate-900 font-bold">Belum ada aktivitas</p>
                  <p className="text-slate-500 text-sm">Mulai buat soal pertama Anda dengan AI Generator.</p>
                </div>
                <button 
                  onClick={() => onViewQuiz({} as any)} 
                  className="text-sm font-bold text-indigo-600 bg-indigo-50 px-6 py-2.5 rounded-xl hover:bg-indigo-100 transition"
                >
                  Buat Soal Sekarang
                </button>
              </div>
            ) : (
              quizzes.slice(0, 4).map((q, i) => (
                <motion.div 
                  key={i} 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + (i * 0.1) }}
                  className="premium-card premium-card-hover p-5 flex items-start justify-between group cursor-pointer" 
                  onClick={() => onViewQuiz(q)}
                >
                  <div className="space-y-1.5 flex-1">
                    <h4 className="font-bold text-slate-900 group-hover:text-indigo-600 transition line-clamp-1">{q.title}</h4>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <span className="bg-slate-100 px-2 py-0.5 rounded-md">{q.subject}</span>
                      <span className="bg-slate-100 px-2 py-0.5 rounded-md">{q.gradeClass}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        q.id && onDelete(q.id);
                      }}
                      className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="p-2.5 rounded-xl bg-slate-50 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>

                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Topic Breakdown */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-900">Statistik Subjek</h3>
          <div className="premium-card p-6 space-y-6">
            {sortedTopics.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">Belum ada data subjek.</p>
            ) : (
              sortedTopics.map(([topic, count]) => (
                <div key={topic} className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-700">{topic}</span>
                    <span className="text-slate-400 font-medium">{count} Soal</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(count / maxCount) * 100}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full bg-indigo-600 rounded-full"
                    />
                  </div>
                </div>
              ))
            )}
            {sortedTopics.length > 0 && (
              <div className="pt-2 border-t border-slate-100">
                <p className="text-[10px] text-slate-400 font-bold uppercase text-center">Distribusi Materi</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main App Component ---

const INITIAL_CONFIG: GenerateConfig = {
  prompt: '',
  subject: 'Umum',
  level: 'SMA / SMK / MA',
  gradeClass: 'Kelas 10 SMA/SMK',
  count: 16,
  difficulty: 'Sedang',
  type: 'Campuran',
  typeConfig: {
    'Pilihan Ganda': { enabled: true, count: 10 },
    'Benar / Salah': { enabled: true, count: 2 },
    'Mencocokkan': { enabled: true, count: 2 },
    'Uraian / Essay': { enabled: true, count: 2 }
  },
  includeKey: true,
  attachedFile: null
};

export default function App() {
  const { width } = useWindowSize();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [currentView, setCurrentView] = useState<'dashboard' | 'generator' | 'history'>('dashboard');
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string, quiz?: Quiz }[]>([]);
  const [config, setConfig] = useState<GenerateConfig>(INITIAL_CONFIG);

  const [showHelp, setShowHelp] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isExportingGForm, setIsExportingGForm] = useState(false);
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        // Fetch User Quizzes
        const q = query(
          collection(db, 'users', u.uid, 'quizzes'),
          orderBy('createdAt', 'desc')
        );
        const unsubSnap = onSnapshot(q, (snapshot) => {
          const fetchedQuizzes = snapshot.docs.map(d => {
            const data = d.data();
            return { 
              id: d.id, 
              ...data,
              createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt 
            };
          }) as Quiz[];

          setQuizzes(fetchedQuizzes);
        });
        return unsubSnap;
      } else {
        setQuizzes([]);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (currentView === 'generator') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, currentView]);

  const handleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setAccessToken(credential.accessToken);
      }
    } catch (err) {
      console.error("Login error", err);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setMessages([]);
    setCurrentQuiz(null);
    setCurrentView('dashboard');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = (event.target?.result as string).split(',')[1];
      setAttachedFile({
        name: file.name,
        size: `${(file.size / 1024).toFixed(1)} KB`,
        mimeType: file.type || 'application/octet-stream',
        data: base64
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!config.prompt && !attachedFile) return;

    const userMsg = config.prompt || `Buatkan ${config.count} soal ${config.type} untuk ${config.gradeClass}.`;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    
    setIsGenerating(true);
    const currentConfig = { ...config, attachedFile };
    setConfig(prev => ({ ...prev, prompt: '' }));
    setAttachedFile(null);

    try {
      const result = await generateExam(currentConfig);
      const quiz: Quiz = {
        ...result,
        gradeClass: currentConfig.gradeClass,
        includeKey: currentConfig.includeKey,
        createdAt: new Date().toISOString(),
        userId: user?.uid || 'anonymous'
      };

      if (user) {
        // Remove createdAt from the spread object to avoid type conflict with serverTimestamp
        const { createdAt, ...quizData } = quiz;
        await addDoc(collection(db, 'users', user.uid, 'quizzes'), {
          ...quizData,
          createdAt: serverTimestamp()
        });
      }


      setCurrentQuiz(quiz);
      setMessages(prev => [...prev, { 
        role: 'model', 
        text: formatQuizToMarkdown(quiz), 
        quiz 
      }]);
    } catch (err: any) {
      let errorMessage = err.message;
      try {
        const parsed = JSON.parse(err.message);
        errorMessage = parsed.error?.message || parsed.message || err.message;
      } catch (e) {}
      
      setMessages(prev => [...prev, { 
        role: 'model', 
        text: `⚠️ **Maaf, terjadi kendala:** ${errorMessage}\n\nSilakan coba lagi dalam beberapa saat.` 
      }]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteQuiz = async (quizId: string) => {
    if (!user || !quizId) return;
    if (!window.confirm("Apakah Anda yakin ingin menghapus soal ini dari riwayat?")) return;

    try {
      await deleteDoc(doc(db, 'users', user.uid, 'quizzes', quizId));
    } catch (err) {
      console.error("Delete error", err);
      alert("Gagal menghapus soal.");
    }
  };

  const handleReset = () => {
    if (messages.length > 0 && !window.confirm("Bersihkan percakapan dan reset pengaturan?")) return;
    setMessages([]);
    setAttachedFile(null);
    setConfig(INITIAL_CONFIG);
    setCurrentQuiz(null);
  };



  const levels = ['SD / MI', 'SMP / MTs', 'SMA / SMK / MA', 'Perguruan Tinggi', 'Umum/Profesional'];
  const subjects = [
    'Umum', 'Budaya Melayu Riau (BMR)', 'Matematika', 'IPAS', 'Bahasa Indonesia', 'Bahasa Inggris', 
    'Pendidikan Pancasila', 'Informatika', 'PJOK', 'Seni & Prakarya', 'Fisika', 'Kimia', 'Biologi',
    'Sejarah Indonesia', 'Geografi', 'Ekonomi', 'Sosiologi', 'PAI', 'B. Arab', 'Fikih', 'Al-Qur\'an Hadist', 'SKI', 'Akidah Akhlak'
  ];

  const getClassOptions = (level: string) => {
    if (level === 'SD / MI') return ['Kelas 1 SD', 'Kelas 2 SD', 'Kelas 3 SD', 'Kelas 4 SD', 'Kelas 5 SD', 'Kelas 6 SD'];
    if (level === 'SMP / MTs') return ['Kelas 7 SMP', 'Kelas 8 SMP', 'Kelas 9 SMP'];
    if (level === 'SMA / SMK / MA') return ['Kelas 10 SMA/SMK', 'Kelas 11 SMA/SMK', 'Kelas 12 SMA/SMK'];
    if (level === 'Perguruan Tinggi') return ['Semester 1-2', 'Semester 3-4', 'Semester 5-8'];
    return ['Umum / Pemula', 'Umum / Menengah', 'Umum / Profesional'];
  };

  return (
    <div className="h-full flex overflow-hidden bg-premium-gradient">

      {/* Mobile Sidebar Drawer Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Navigation */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 glass-sidebar transform transition-transform duration-500 lg:static lg:translate-x-0 shadow-2xl lg:shadow-none",
        !isSidebarOpen && "-translate-x-full"
      )}>

        <div className="h-full flex flex-col p-6">
          {/* Brand */}
          <div className="flex items-center gap-4 mb-10 px-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-[0_8px_20px_-4px_rgba(79,70,229,0.5)] p-0.5">
              <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center overflow-hidden">
                <img src="/assets/aistudio/BoimSmart_Learning_App_Icon_39775095.png" alt="Logo" className="w-full h-full object-cover" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tighter leading-none">Boim<span className="text-indigo-400">Smart</span></h1>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">System V22</p>
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-6 overflow-y-auto custom-scrollbar pr-2">
            <SidebarSection title="Utama">
              <motion.div 
                initial="hidden"
                animate="visible"
                variants={{
                  visible: { transition: { staggerChildren: 0.05 } }
                }}
                className="space-y-1"
              >
                <SidebarItem 
                  icon={Home} 
                  label="Home" 
                  isActive={currentView === 'dashboard'} 
                  onClick={() => { setCurrentView('dashboard'); setIsSidebarOpen(false); }} 
                />
                <SidebarItem 
                  icon={Sparkles} 
                  label="AI Generator" 
                  isActive={currentView === 'generator'} 
                  onClick={() => { setCurrentView('generator'); setIsSidebarOpen(false); }} 
                />
                <SidebarItem 
                  icon={History} 
                  label="Riwayat Soal" 
                  isActive={currentView === 'history'} 
                  onClick={() => { setCurrentView('history'); setIsSidebarOpen(false); }} 
                  badge={quizzes.length.toString()}
                />
              </motion.div>
            </SidebarSection>


            <SidebarSection title="Bantuan">
              <SidebarItem 
                icon={MessageSquare} 
                label="Pusat Bantuan" 
                onClick={() => { setShowHelp(true); setIsSidebarOpen(false); }} 
              />
              <SidebarItem 
                icon={Settings} 
                label="Pengaturan" 
                onClick={() => { setShowSettings(true); setIsSidebarOpen(false); }} 
              />
            </SidebarSection>

          </div>

          {/* User Profile */}
          <div className="pt-6 border-t border-white/5">
            {user ? (
              <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5 group hover:bg-white/10 transition-colors">
                <div className="relative">
                  <img src={user.photoURL || ''} className="w-10 h-10 rounded-xl border border-white/10 object-cover" alt="Profile" />
                  <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-900 rounded-full" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">{user.displayName}</p>
                  <p className="text-[10px] text-slate-500 font-medium truncate">{user.email}</p>
                </div>
                <button onClick={handleLogout} className="p-2 text-slate-500 hover:text-rose-400 transition-colors">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button 
                onClick={handleLogin}
                className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-3 hover:bg-indigo-700 transition shadow-xl shadow-indigo-900/20 active:scale-[0.98]"
              >
                <UserIcon className="w-5 h-5" /> <span className="text-sm">Mulai Sekarang</span>
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC]">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-6 bg-white border-b border-slate-100 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg">
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <Layout className="w-4 h-4" />
              <span>Sistem</span>
              <ChevronRight className="w-3 h-3" />
              <span className="text-slate-900 font-bold capitalize">{currentView}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {currentView !== 'generator' && (
              <button 
                onClick={() => setCurrentView('generator')}
                className="bg-indigo-600 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> <span>Soal Baru</span>
              </button>
            )}
            <div className="w-px h-6 bg-slate-100 mx-2" />
            <button className="p-2 text-slate-400 hover:text-slate-900 transition">
              <AlertCircle className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* View Container */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8 lg:p-10">
          <div className="max-w-6xl mx-auto h-full flex flex-col">
            <AnimatePresence mode="wait">
              {currentView === 'dashboard' && (
                <motion.div
                  key="dashboard"
                  initial={{ opacity: 0, x: -20, filter: 'blur(10px)' }}
                  animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, x: 20, filter: 'blur(10px)' }}
                  transition={{ duration: 0.4, ease: "circOut" }}
                >

                  <DashboardView 
                    quizzes={quizzes} 
                    onViewQuiz={(q) => {
                      setCurrentQuiz(q);
                      setMessages([{ role: 'model', text: formatQuizToMarkdown(q), quiz: q }]);
                      setCurrentView('generator');
                    }} 
                    onDelete={handleDeleteQuiz}
                  />

                </motion.div>
              )}

              {currentView === 'generator' && (
                <motion.div
                  key="generator"
                  initial={{ opacity: 0, x: -20, filter: 'blur(10px)' }}
                  animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, x: 20, filter: 'blur(10px)' }}
                  transition={{ duration: 0.4, ease: "circOut" }}
                  className="flex-1 flex flex-col gap-6"
                >

                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-black text-slate-900">AI Exam Generator</h2>
                      <p className="text-sm text-slate-500">Tentukan topik dan biarkan AI menyusun soal berkualitas untuk Anda.</p>
                    </div>
                    <div className="flex gap-2">
                       <button 
                         onClick={handleReset}
                         className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all active:scale-95"
                       >
                         <RotateCcw className="w-4 h-4" /> Reset
                       </button>
                    </div>
                  </div>


                  <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
                    {/* Settings Panel */}
                    <div className="w-full lg:w-80 space-y-6">
                      <div className="premium-card p-6 space-y-5">
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                          <Settings className="w-4 h-4 text-indigo-600" /> Pengaturan Soal
                        </h3>
                        
                        <div className="space-y-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase">Mata Pelajaran</label>
                            <select 
                              value={config.subject}
                              onChange={(e) => setConfig({...config, subject: e.target.value})}
                              className="w-full bg-slate-50 border border-slate-200 text-sm font-medium rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 outline-none transition"
                            >
                              {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-slate-400 uppercase">Jenjang</label>
                              <select 
                                value={config.level}
                                onChange={(e) => {
                                  const newLevel = e.target.value;
                                  setConfig({...config, level: newLevel, gradeClass: getClassOptions(newLevel)[0]});
                                }}
                                className="w-full bg-slate-50 border border-slate-200 text-[13px] font-medium rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 outline-none transition"
                              >
                                {levels.map(l => <option key={l} value={l}>{l}</option>)}
                              </select>
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-slate-400 uppercase">Kelas</label>
                              <select 
                                value={config.gradeClass}
                                onChange={(e) => setConfig({...config, gradeClass: e.target.value})}
                                className="w-full bg-slate-50 border border-slate-200 text-[13px] font-medium rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 outline-none transition"
                              >
                                {getClassOptions(config.level).map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                            </div>
                          </div>

                          <div className="space-y-3">
                             <label className="text-[10px] font-black text-slate-400 uppercase">Format & Jumlah Soal</label>
                             <div className="space-y-3">
                                {Object.entries(config.typeConfig).map(([name, cfg]) => (
                                  <div key={name} className="flex items-center gap-3 group">
                                    <label className="flex items-center gap-3 flex-1 cursor-pointer">
                                      <div className={cn(
                                        "w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all",
                                        cfg.enabled ? "bg-indigo-600 border-indigo-600 shadow-sm" : "bg-white border-slate-200 group-hover:border-slate-300"
                                      )}>
                                        <input 
                                          type="checkbox" 
                                          className="hidden"
                                          checked={cfg.enabled}
                                          onChange={(e) => {
                                            const newConfig = { ...config.typeConfig, [name]: { ...cfg, enabled: e.target.checked } };
                                            setConfig({ ...config, typeConfig: newConfig });
                                          }}
                                        />
                                        {cfg.enabled && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                                      </div>
                                      <span className={cn("text-xs font-bold transition", cfg.enabled ? "text-slate-900" : "text-slate-500")}>
                                        {name}
                                      </span>
                                    </label>
                                    <AnimatePresence>
                                      {cfg.enabled && (
                                        <motion.input 
                                          initial={{ opacity: 0, scale: 0.8 }}
                                          animate={{ opacity: 1, scale: 1 }}
                                          exit={{ opacity: 0, scale: 0.8 }}
                                          type="number" 
                                          value={cfg.count}
                                          onChange={(e) => {
                                            const newConfig = { ...config.typeConfig, [name]: { ...cfg, count: parseInt(e.target.value) || 0 } };
                                            setConfig({ ...config, typeConfig: newConfig });
                                          }}
                                          className="w-14 bg-white border border-slate-200 text-xs font-black rounded-lg p-1.5 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm text-center"
                                        />
                                      )}
                                    </AnimatePresence>
                                  </div>
                                ))}
                             </div>
                             <p className="text-[9px] text-slate-400 font-medium italic">Total soal akan disesuaikan secara otomatis berdasarkan pilihan di atas.</p>
                          </div>

                        </div>
                      </div>
                    </div>

                    {/* Chat Area */}
                    <div className="flex-1 flex flex-col min-w-0 premium-card overflow-hidden">
                      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50/30">
                        {messages.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-center space-y-6 max-w-sm mx-auto opacity-50">
                            <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-3xl flex items-center justify-center">
                              <Bot className="w-10 h-10" />
                            </div>
                            <div className="space-y-2">
                              <h3 className="text-lg font-bold text-slate-900">Siap Membuat Soal?</h3>
                              <p className="text-sm text-slate-500 leading-relaxed">Pilih subjek di kiri atau unggah materi pendukung di bawah untuk memulai.</p>
                            </div>
                          </div>
                        ) : (
                          messages.map((m, i) => (
                            <motion.div 
                              key={i} 
                              initial={{ opacity: 0, y: 10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              transition={{ duration: 0.4, ease: "easeOut" }}
                              className={cn("flex gap-4 max-w-full mx-auto", m.role === 'user' ? "justify-end" : "justify-start")}
                            >
                              {m.role === 'model' && (
                                <div className="w-9 h-9 rounded-2xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 shadow-[0_4px_12px_rgba(79,70,229,0.3)]">
                                  <Bot className="w-5 h-5" />
                                </div>
                              )}
                              <div className={cn(
                                "max-w-[92%] p-5 rounded-2xl shadow-sm border text-sm overflow-x-auto transition-all",
                                m.role === 'user' 
                                  ? "bg-slate-900 text-white border-slate-800 rounded-tr-none" 
                                  : "bg-white text-slate-800 border-slate-100 rounded-tl-none hover:shadow-md"
                              )}>
                                <div className="prose prose-sm max-w-none prose-slate prose-p:leading-relaxed prose-strong:text-indigo-600">
                                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {m.text}
                                  </ReactMarkdown>
                                </div>
                                {m.quiz && (
                                  <div className="mt-6 pt-5 border-t border-slate-100 flex flex-wrap gap-3">
                                    <button 
                                      onClick={() => {
                                        setCurrentQuiz(m.quiz!);
                                        setShowQuizModal(true);
                                      }}
                                      className="bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] px-5 py-2.5 rounded-xl font-black flex items-center gap-2 transition-all shadow-lg shadow-emerald-100 active:scale-95"
                                    >
                                      <Gamepad2 className="w-4 h-4" /> KERJAKAN SOAL
                                    </button>
                                    <button 
                                      onClick={() => exportToWord(m.quiz!)}
                                      className="bg-slate-900 hover:bg-slate-800 text-white text-[10px] px-5 py-2.5 rounded-xl font-black flex items-center gap-2 transition-all active:scale-95"
                                    >
                                      <FileText className="w-4 h-4" /> WORD (DOCX)
                                    </button>
                                    <button 
                                      disabled={isExportingGForm}
                                      onClick={async () => {
                                        let currentToken = accessToken;
                                        if (!currentToken) {
                                          try {
                                            const result = await signInWithPopup(auth, googleProvider);
                                            const credential = GoogleAuthProvider.credentialFromResult(result);
                                            if (credential?.accessToken) {
                                              currentToken = credential.accessToken;
                                              setAccessToken(currentToken);
                                            } else throw new Error("Gagal mendapatkan token.");
                                          } catch (e) { alert("Izin Google diperlukan."); return; }
                                        }
                                        setIsExportingGForm(true);
                                        try {
                                          const url = await createGoogleForm(m.quiz!, currentToken!);
                                          window.open(url, '_blank');
                                        } catch (err: any) { alert(err.message); } finally { setIsExportingGForm(false); }
                                      }}
                                      className={cn(
                                        "bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] px-5 py-2.5 rounded-xl font-black flex items-center gap-2 transition-all shadow-lg shadow-indigo-100 active:scale-95",
                                        isExportingGForm && "opacity-50"
                                      )}
                                    >
                                      {isExportingGForm ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCode className="w-4 h-4" />}
                                      GOOGLE FORMS
                                    </button>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          ))
                        )}
                        {isGenerating && (
                          <div className="flex gap-4 max-w-full mx-auto justify-start">
                            <div className="w-9 h-9 rounded-2xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0">
                              <Bot className="w-5 h-5" />
                            </div>
                            <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-none p-5 shadow-sm flex items-center gap-3">
                              <div className="flex gap-1">
                                <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
                                <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '400ms' }} />
                              </div>
                              <span className="text-xs font-bold text-slate-500">AI sedang menyusun soal akurat...</span>
                            </div>
                          </div>
                        )}
                        <div ref={chatEndRef} />
                      </div>

                      {/* Message Input Container */}
                      <div className="p-4 bg-white border-t border-slate-100">
                        {attachedFile && (
                          <div className="flex items-center justify-between bg-indigo-50 p-2 rounded-xl border border-indigo-100 mb-3 mx-4">
                            <div className="flex items-center gap-2 text-[10px] text-indigo-900">
                              <Paperclip className="w-3.5 h-3.5 text-indigo-600" />
                              <span className="font-black">{attachedFile.name}</span>
                              <span className="opacity-60">{attachedFile.size}</span>
                            </div>
                            <button onClick={() => setAttachedFile(null)} className="text-slate-400 hover:text-rose-500">
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                        
                        <form onSubmit={handleSubmit} className="flex items-end gap-3 px-2">
                          <button 
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-500 transition group"
                          >
                            <Paperclip className="w-5 h-5 group-hover:text-indigo-600" />
                          </button>
                          <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileSelect} 
                            className="hidden" 
                            accept=".pdf,.txt,.docx,.png,.jpg,.jpeg"
                          />
                          
                          <div className="flex-1 bg-slate-50 rounded-2xl p-2.5 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-100 border border-transparent focus-within:border-indigo-200 transition-all">
                            <textarea 
                              value={config.prompt}
                              onChange={(e) => setConfig({...config, prompt: e.target.value})}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleSubmit();
                                }
                              }}
                              placeholder="Tulis instruksi tambahan di sini..." 
                              className="w-full bg-transparent border-none focus:outline-none text-sm font-medium resize-none custom-scrollbar max-h-32"
                              rows={1}
                            />
                          </div>
                          
                          <button 
                            disabled={isGenerating || (!config.prompt && !attachedFile)}
                            type="submit"
                            className="p-3.5 rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition disabled:opacity-30 disabled:shadow-none"
                          >
                            <Send className="w-5 h-5" />
                          </button>
                        </form>
                        <div className="mt-3 text-center">
                          <p className="text-[10px] font-black text-slate-400 tracking-[0.2em]">BoimSmart Jenius, Tapi Bukan Tuhan!</p>
                        </div>
                      </div>
                    </div>
                  </div>

                </motion.div>
              )}

              {currentView === 'history' && (
                <motion.div
                  key="history"
                  initial={{ opacity: 0, x: -20, filter: 'blur(10px)' }}
                  animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, x: 20, filter: 'blur(10px)' }}
                  transition={{ duration: 0.4, ease: "circOut" }}
                  className="space-y-6"
                >

                  <div>
                    <h2 className="text-2xl font-black text-slate-900">Riwayat Soal</h2>
                    <p className="text-sm text-slate-500">Akses kembali soal-soal yang telah Anda buat sebelumnya.</p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {quizzes.map((q, i) => (
                      <div key={i} className="premium-card p-6 flex flex-col gap-4 relative group">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            q.id && handleDeleteQuiz(q.id);
                          }}
                          className="absolute top-4 right-4 p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 z-10"
                          title="Hapus Soal"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <h4 className="font-bold text-slate-900 text-lg leading-tight line-clamp-1 pr-8">{q.title}</h4>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                              <span>{q.subject}</span>
                              <span aria-hidden="true">·</span>
                              <span>{q.gradeClass}</span>
                            </div>
                          </div>
                          <div className="text-right text-[10px] text-slate-400 font-medium">
                            {new Date(q.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex gap-2">
                           <button 
                             onClick={() => {
                               setCurrentQuiz(q);
                               setMessages([{ role: 'model', text: formatQuizToMarkdown(q), quiz: q }]);
                               setCurrentView('generator');
                             }}
                             className="flex-1 bg-slate-900 text-white text-[11px] font-black py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-800 transition"
                           >
                             <Sparkles className="w-4 h-4 text-amber-400" /> Buka di Generator
                           </button>
                           <button 
                             onClick={() => {
                               setCurrentQuiz(q);
                               setShowQuizModal(true);
                             }}
                             className="px-4 bg-emerald-50 text-emerald-700 text-[11px] font-black py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-100 transition"
                           >
                             <Gamepad2 className="w-4 h-4" /> Kerjakan
                           </button>
                        </div>
                      </div>
                    ))}

                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {showQuizModal && currentQuiz && (
          <QuizModal 
            quiz={currentQuiz} 
            onClose={() => setShowQuizModal(false)} 
          />
        )}
        {showHelp && (
          <HelpModal onClose={() => setShowHelp(false)} />
        )}
        {showSettings && (
          <SettingsModal 
            config={config} 
            setConfig={setConfig} 
            onClose={() => setShowSettings(false)} 
          />
        )}
      </AnimatePresence>

    </div>
  );
}

const QuizModal = ({ quiz, onClose }: { quiz: Quiz, onClose: () => void }) => {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showResults, setShowResults] = useState(false);

  const calculateScore = () => {
    let score = 0;
    quiz.questions.forEach(q => {
      const userAns = (answers[q.id] || "").toLowerCase().trim();
      const correctAns = q.correctAnswer.toLowerCase().trim();
      if (userAns && (userAns.includes(correctAns) || correctAns.includes(userAns))) {
        score++;
      }
    });
    return score;
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 md:p-8"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white w-full max-w-4xl h-full max-h-[85vh] rounded-[32px] shadow-2xl flex flex-col overflow-hidden"
      >
        <div className="p-6 md:p-8 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">
              <GraduationCap className="w-4 h-4" /> Mode Evaluasi
            </div>
            <h3 className="font-black text-xl md:text-2xl text-slate-900">{quiz.title}</h3>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
              <span>{quiz.subject}</span>
              <span aria-hidden="true">·</span>
              <span>{quiz.gradeClass}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-3 bg-white border border-slate-200 text-slate-400 hover:text-slate-900 hover:border-slate-300 rounded-2xl transition shadow-sm">
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-12 custom-scrollbar">
          {quiz.questions.map((q, idx) => (
            <div key={q.id} className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: `${idx * 50}ms` }}>
              <div className="flex items-start gap-4">
                <span className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-black text-base flex-shrink-0">
                  {idx + 1}
                </span>
                <div className="space-y-4 flex-1">
                  <div className="space-y-2">
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{q.type}</span>
                    <p className="text-slate-900 font-bold text-base md:text-lg leading-relaxed">{q.questionText}</p>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-3">
                    {q.type === 'Benar / Salah' ? (
                      <div className="flex gap-4">
                        {['Benar', 'Salah'].map(opt => (
                          <label key={opt} className={cn(
                            "flex-1 p-4 rounded-2xl border-2 flex items-center gap-3 cursor-pointer transition-all duration-200",
                            answers[q.id] === opt ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100" : "bg-white border-slate-100 hover:border-slate-200 text-slate-700"
                          )}>
                            <input 
                              type="radio" 
                              name={`q-${q.id}`} 
                              className="hidden" 
                              onChange={() => setAnswers({...answers, [q.id]: opt})}
                            />
                            <span className="text-sm font-black">{opt}</span>
                            {answers[q.id] === opt && <CheckCircle className="ml-auto w-5 h-5 text-white" />}
                          </label>
                        ))}
                      </div>
                    ) : q.options ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {q.options.map((opt, oIdx) => (
                          <label key={opt} className={cn(
                            "p-4 rounded-2xl border-2 flex items-center gap-4 cursor-pointer transition-all duration-200",
                            answers[q.id] === opt ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100" : "bg-white border-slate-100 hover:border-slate-200 text-slate-700"
                          )}>
                            <input 
                              type="radio" 
                              name={`q-${q.id}`} 
                              className="hidden" 
                              onChange={() => setAnswers({...answers, [q.id]: opt})}
                            />
                            <span className={cn(
                              "w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs",
                              answers[q.id] === opt ? "bg-white/20 text-white" : "bg-slate-50 text-slate-400"
                            )}>
                              {String.fromCharCode(65 + oIdx)}
                            </span>
                            <span className="text-sm font-bold flex-1">{opt}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <textarea 
                        className="w-full p-5 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 outline-none text-sm font-medium min-h-[120px] bg-slate-50/50 focus:bg-white transition-all"
                        placeholder="Ketik jawaban Anda di sini..."
                        onChange={(e) => setAnswers({...answers, [q.id]: e.target.value})}
                      />
                    )}
                  </div>

                  {showResults && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className={cn(
                        "p-5 rounded-2xl text-sm font-bold border",
                        (answers[q.id] || "").toLowerCase().trim() === q.correctAnswer.toLowerCase().trim() 
                          ? "bg-emerald-50 text-emerald-800 border-emerald-100" 
                          : "bg-rose-50 text-rose-800 border-rose-100"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        { (answers[q.id] || "").toLowerCase().trim() === q.correctAnswer.toLowerCase().trim() ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" /> }
                        <span>Kunci Jawaban: {q.correctAnswer}</span>
                      </div>
                      {q.explanation && (
                        <p className="mt-2 text-xs opacity-70 font-medium italic border-t border-current/10 pt-2">
                          Pembahasan: {q.explanation}
                        </p>
                      )}
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="p-6 md:p-8 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <button 
            onClick={onClose}
            className="px-6 py-3 rounded-2xl border-2 border-slate-200 text-slate-500 font-black text-xs hover:bg-white hover:border-slate-300 transition-all"
          >
            Nanti Saja
          </button>
          
          {showResults ? (
            <div className="flex items-center gap-6">
              <div className="text-right">
                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Skor Anda</span>
                <span className="text-3xl font-black text-slate-900">{calculateScore()} <span className="text-slate-300 text-lg font-bold">/ {quiz.questions.length}</span></span>
              </div>
              <button 
                onClick={onClose}
                className="px-8 py-3 rounded-2xl bg-slate-900 text-white font-black text-sm shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all"
              >
                Selesai
              </button>
            </div>
          ) : (
            <button 
              onClick={() => {
                const unanswered = quiz.questions.length - Object.keys(answers).length;
                if (unanswered > 0 && !window.confirm(`Ada ${unanswered} soal belum dijawab. Kumpulkan?`)) return;
                setShowResults(true);
              }}
              className="px-10 py-3 rounded-2xl bg-indigo-600 text-white font-black text-sm shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
            >
              Kumpulkan Nilai
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

const HelpModal = ({ onClose }: { onClose: () => void }) => (
  <motion.div 
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
  >
    <motion.div 
      initial={{ scale: 0.9, y: 20 }}
      animate={{ scale: 1, y: 0 }}
      className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden p-8 space-y-6"
    >
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-black text-slate-900 flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-indigo-600" /> Pusat Bantuan
        </h3>
        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition">
          <XCircle className="w-6 h-6 text-slate-400" />
        </button>
      </div>
      
      <div className="space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
        <div className="space-y-2">
          <h4 className="font-bold text-slate-900">Apa itu BoimSmart AI?</h4>
          <p className="text-sm text-slate-600 leading-relaxed">
            BoimSmart AI adalah platform cerdas berbasis AI yang di bangun oleh Team Budrek, untuk membantu guru dan instansi pendidikan menyusun soal ujian secara otomatis, akurat, dan cepat sesuai dengan Kurikulum Merdeka.
          </p>
        </div>
        
        <div className="space-y-2">
          <h4 className="font-bold text-slate-900">Cara Menggunakan Generator</h4>
          <ul className="text-sm text-slate-600 space-y-2 list-disc pl-5">
            <li>Pilih <strong>Mata Pelajaran</strong> dan <strong>Jenjang</strong> yang sesuai.</li>
            <li>Aktifkan format soal yang diinginkan (PG, Benar/Salah, dll) dan tentukan jumlahnya.</li>
            <li>Unggah file materi (PDF/DOCX/Gambar) untuk membuat soal yang lebih spesifik berdasarkan materi tersebut.</li>
            <li>Klik tombol <strong>Kirim</strong> dan biarkan AI menyusun soal untuk Anda.</li>
          </ul>
        </div>

        <div className="space-y-2">
          <h4 className="font-bold text-slate-900">Fitur Eksport</h4>
          <p className="text-sm text-slate-600 leading-relaxed">
            Setelah soal selesai dibuat, Anda bisa langsung mengerjakannya di platform, mengunduh dalam format <strong>Word (Docx)</strong>, atau membuat <strong>Google Forms</strong> secara otomatis.
          </p>
        </div>
      </div>

      <button 
        onClick={onClose}
        className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-slate-800 transition shadow-xl shadow-slate-100"
      >
        Mengerti
      </button>
    </motion.div>
  </motion.div>
);

const SettingsModal = ({ config, setConfig, onClose }: { config: any, setConfig: any, onClose: () => void }) => (
  <motion.div 
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
  >
    <motion.div 
      initial={{ scale: 0.9, y: 20 }}
      animate={{ scale: 1, y: 0 }}
      className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden p-8 space-y-6"
    >
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-black text-slate-900 flex items-center gap-2">
          <Settings className="w-6 h-6 text-indigo-600" /> Pengaturan
        </h3>
        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition">
          <XCircle className="w-6 h-6 text-slate-400" />
        </button>
      </div>

      <div className="space-y-5">
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
          <div className="space-y-1">
            <p className="text-sm font-bold text-slate-900">Sertakan Kunci Jawaban</p>
            <p className="text-[10px] text-slate-500 font-medium">Selalu buat kunci jawaban di setiap sesi.</p>
          </div>
          <button 
            onClick={() => setConfig({ ...config, includeKey: !config.includeKey })}
            className={cn(
              "w-12 h-6 rounded-full transition-colors relative",
              config.includeKey ? "bg-indigo-600" : "bg-slate-300"
            )}
          >
            <motion.div 
              animate={{ x: config.includeKey ? 26 : 4 }}
              className="w-4 h-4 bg-white rounded-full absolute top-1"
            />
          </button>
        </div>

        <div className="p-4 bg-slate-50 rounded-2xl space-y-3">
          <p className="text-sm font-bold text-slate-900">Kesulitan Default</p>
          <div className="flex gap-2">
            {['Mudah', 'Sedang', 'Sulit'].map(d => (
              <button 
                key={d}
                onClick={() => setConfig({ ...config, difficulty: d })}
                className={cn(
                  "flex-1 py-2 text-xs font-bold rounded-xl border transition",
                  config.difficulty === d ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-slate-200 text-slate-500"
                )}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button 
        onClick={onClose}
        className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 transition shadow-xl shadow-indigo-100"
      >
        Simpan Perubahan
      </button>
    </motion.div>
  </motion.div>
);

