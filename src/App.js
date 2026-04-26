import React, { useState, useEffect, useRef, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, doc, setDoc, collection, onSnapshot, deleteDoc, updateDoc
} from 'firebase/firestore';
import { 
  getAuth, signInAnonymously, onAuthStateChanged 
} from 'firebase/auth';
import { 
  Plus, Trash2, CheckCircle, Play, Pause, RotateCcw, Clock, 
  CheckSquare, Bell, BellOff, Settings, X, Loader2, PartyPopper, Coffee, 
  Sun, Moon, Layout, Maximize2, Minimize2, Calendar as CalendarIcon, 
  Sparkles, ChevronLeft, ChevronRight, Mic
} from 'lucide-react';

// --- Khởi tạo Firebase (Đã bảo mật API Key) ---
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY, 
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "workflow-bb753.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "workflow-bb753",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "workflow-bb753.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "608288170073",
  appId: process.env.REACT_APP_FIREBASE_APP_ID, 
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-LQDP02Y66S"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'focus-flow-app';

// AI API Key
const apiKey = process.env.REACT_APP_GEMINI_API_KEY;

// --- Custom Time Picker Component ---
const CustomTimePicker = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef(null);
  const hoursRef = useRef(null);
  const minutesRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        hoursRef.current?.querySelector('.bg-violet-600')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        minutesRef.current?.querySelector('.bg-violet-600')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }, 10);
    }
  }, [isOpen]);

  const [hours, minutes] = value.split(':');
  const handleHourChange = (h) => onChange(`${h}:${minutes}`);
  const handleMinuteChange = (m) => onChange(`${hours}:${m}`);

  const hoursList = Array.from({length: 24}, (_, i) => i.toString().padStart(2, '0'));
  const minutesList = Array.from({length: 60}, (_, i) => i.toString().padStart(2, '0'));

  return (
    <div className="relative flex-1 flex justify-center" ref={pickerRef}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`text-sm md:text-base font-bold cursor-pointer transition-all w-full text-center select-none py-1.5 rounded-xl ${isOpen ? 'text-violet-600 bg-violet-50 dark:bg-violet-900/40' : 'hover:text-violet-600 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
      >
        {value}
      </div>

      {isOpen && (
        <div className="absolute top-full mt-3 left-1/2 -translate-x-1/2 w-48 bg-white dark:bg-slate-800 rounded-[1.5rem] shadow-[0_20px_50px_-10px_rgba(0,0,0,0.2)] border border-slate-100 dark:border-slate-700 p-3 z-[60] flex gap-1 animate-in zoom-in-95 duration-200">
          <div ref={hoursRef} className="flex-1 h-48 overflow-y-auto custom-scrollbar pr-1 flex flex-col gap-1">
            {hoursList.map(h => (
              <button
                key={`h-${h}`}
                onClick={() => handleHourChange(h)}
                className={`py-2 text-sm font-bold rounded-xl transition-all ${h === hours ? 'bg-violet-600 text-white shadow-md' : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'}`}
              >
                {h}
              </button>
            ))}
          </div>
          <div className="flex flex-col justify-center text-slate-300 dark:text-slate-600 font-black mb-1">:</div>
          <div ref={minutesRef} className="flex-1 h-48 overflow-y-auto custom-scrollbar pl-1 flex flex-col gap-1">
            {minutesList.map(m => (
              <button
                key={`m-${m}`}
                onClick={() => handleMinuteChange(m)}
                className={`py-2 text-sm font-bold rounded-xl transition-all ${m === minutes ? 'bg-violet-600 text-white shadow-md' : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'}`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// --- Helper Functions ---
const formatDisplayDate = (dateStr) => {
  if (!dateStr) return 'Sắp diễn ra';
  const [y, m, d] = dateStr.split('-');
  const date = new Date(y, m - 1, d);
  const today = new Date();

  if (date.toDateString() === today.toDateString()) return 'Hôm nay';
  return new Intl.DateTimeFormat('vi-VN', { 
    weekday: 'short', day: 'numeric', month: 'short' 
  }).format(date);
};

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // --- States: Tabs & Focus Mode ---
  const [activeTab, setActiveTab] = useState('focus'); 
  const [tasks, setTasks] = useState([]);
  const [inputValue, setInputValue] = useState('');
  
  const [settings, setSettings] = useState({ workTime: 25, breakTime: 5, theme: 'light' });
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [timerMode, setTimerMode] = useState('work'); 
  const [isMuted, setIsMuted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isCompactMode, setIsCompactMode] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'work' });
  
  const timerRef = useRef(null);
  const initialLoadRef = useRef(true);

  // --- States: Plan Mode (Calendar & AI) ---
  const [events, setEvents] = useState([]);
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
  const [showInlineForm, setShowInlineForm] = useState(false);
  const [selectedDateStr, setSelectedDateStr] = useState('');
  const [newEvent, setNewEvent] = useState({ title: '', startTime: '09:00', endTime: '10:00' });
  const [addToFocus, setAddToFocus] = useState(true);

  // --- STATES CHO PWA INSTALL BANNER ---
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [showIosInstall, setShowIosInstall] = useState(false);

  // --- LOGIC NHẬN DIỆN VÀ MỜI CÀI ĐẶT PWA ---
  useEffect(() => {
    // 1. Dành cho Android / Chrome PC
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault(); // Ngăn trình duyệt tự bật thông báo mặc định
      setDeferredPrompt(e);
      setShowInstallBanner(true); // Bật banner mời cài đặt của mình
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 2. Dành riêng cho iPhone (iOS Safari)
    const isIos = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      return /iphone|ipad|ipod/.test(userAgent);
    };
    // Kiểm tra xem đã cài ra Home Screen chưa
    const isInStandaloneMode = () => ('standalone' in window.navigator) && (window.navigator.standalone);

    // Nếu là iOS và chưa cài đặt, hiện hướng dẫn sau 2 giây
    if (isIos() && !isInStandaloneMode()) {
      const timer = setTimeout(() => setShowIosInstall(true), 2000);
      return () => clearTimeout(timer);
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowInstallBanner(false);
      }
      setDeferredPrompt(null);
    }
  };

  // --- TÍCH HỢP XIN QUYỀN THÔNG BÁO ---
  useEffect(() => {
    if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (error) {
        console.error("Auth error:", error);
      }
    };
    initAuth();
    
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const tasksCol = collection(db, 'artifacts', appId, 'users', user.uid, 'tasks');
    const unsubscribeTasks = onSnapshot(tasksCol, (snapshot) => {
      const taskList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTasks(taskList.sort((a, b) => b.createdAt - a.createdAt));
      setLoading(false);
    });

    const eventsCol = collection(db, 'artifacts', appId, 'users', user.uid, 'events');
    const unsubscribeEvents = onSnapshot(eventsCol, (snapshot) => {
      const eventList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEvents(eventList);
    });

    const settingsDoc = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'timer');
    const unsubscribeSettings = onSnapshot(settingsDoc, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const prevSettings = settings;
        setSettings(data);
        if (initialLoadRef.current || data.workTime !== prevSettings.workTime || data.breakTime !== prevSettings.breakTime) {
          if (!isActive) {
            setTimeLeft(timerMode === 'work' ? data.workTime * 60 : data.breakTime * 60);
            initialLoadRef.current = false;
          }
        }
      }
    });

    return () => { unsubscribeTasks(); unsubscribeEvents(); unsubscribeSettings(); };
  }, [user, timerMode]);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => setTimeLeft(p => p - 1), 1000);
    } else if (timeLeft === 0) {
      handleTimerEnd();
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isActive, timeLeft]);

  const handleTimerEnd = () => {
    setIsActive(false);
    clearInterval(timerRef.current);
    
    const notifMessage = timerMode === 'work' ? 'Bạn đã làm việc rất tốt! Giờ hãy nghỉ ngơi nhé.' : 'Nghỉ ngơi đủ rồi, quay lại công việc thôi nào!';

    if (!isMuted) {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3');
      audio.volume = 0.3; audio.play().catch(() => {});
    }
    
    if (isCompactMode) setIsCompactMode(false);
    
    setNotification({
      show: true,
      message: notifMessage,
      type: timerMode
    });

    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(timerMode === 'work' ? "Hết giờ Focus! 🍅" : "Hết giờ Break! ☕", {
        body: notifMessage,
        icon: "/logo192.png",
        requireInteraction: true 
      });
    }
  };

  const toggleTimer = () => setIsActive(!isActive);
  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(timerMode === 'work' ? settings.workTime * 60 : settings.breakTime * 60);
  };
  const setMode = (mode) => {
    setTimerMode(mode); setIsActive(false);
    setTimeLeft(mode === 'work' ? settings.workTime * 60 : settings.breakTime * 60);
  };

  const addTask = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || !user) return;
    try {
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'tasks', Date.now().toString()), { text: inputValue, completed: false, createdAt: Date.now() });
      setInputValue('');
    } catch (e) { console.error(e); }
  };
  
  const toggleTask = async (task) => {
    if (!user) return;
    await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'tasks', task.id), { completed: !task.completed });
  };
  
  const deleteTask = async (taskId) => {
    if (!user) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'tasks', taskId));
  };

  const daysInMonth = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 0).getDate();
  const startDayOfMonth = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth(), 1).getDay();
  const adjustedStartDay = startDayOfMonth === 0 ? 6 : startDayOfMonth - 1;

  const handlePrevMonth = () => setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 1));

  const formatDateObj = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const handleDayClick = (day) => {
    if(!day) return;
    const dateStr = formatDateObj(currentMonthDate.getFullYear(), currentMonthDate.getMonth(), day);
    setSelectedDateStr(dateStr);
    setShowInlineForm(false);
    setNewEvent({ title: '', startTime: '09:00', endTime: '10:00' });
  };

  const handleAddManualEvent = async () => {
    if (!newEvent.title.trim() || !user) return;
    if (newEvent.endTime < newEvent.startTime) { 
      alert('Giờ kết thúc không được sớm hơn giờ bắt đầu!'); 
      return; 
    }
    const eventId = Date.now().toString();
    const eventData = {
      title: newEvent.title,
      date: selectedDateStr,
      startTime: newEvent.startTime,
      endTime: newEvent.endTime,
      createdAt: Date.now()
    };
    try {
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'events', eventId), eventData);
      
      if (addToFocus) {
        const taskId = Date.now().toString() + '_task';
        await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'tasks', taskId), {
          text: `[${newEvent.startTime}] ${newEvent.title}`,
          completed: false,
          createdAt: Date.now()
        });
      }
      setShowInlineForm(false);
    } catch (e) { console.error(e); }
  };

  const handleDeleteEvent = async (eventId, e) => {
    e.stopPropagation();
    if(!user) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'events', eventId));
  }

  // --- BẮT LỖI MIC ĐẶC THÙ CHO IPHONE (iOS) ---
  const handleVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Trình duyệt không hỗ trợ Mic hoặc bạn đang dùng ứng dụng bên thứ 3 (như Zalo/Messenger). Vui lòng mở bằng Safari trên iPhone để dùng tính năng này!");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'vi-VN'; 
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setAiPrompt(prev => prev ? prev + ' ' + transcript : transcript);
    };

    recognition.onerror = (event) => {
      console.error("Lỗi Mic:", event.error);
      if (event.error === 'not-allowed') {
        alert("Micro đang bị chặn! Bạn vui lòng cấp quyền truy cập Micro cho Safari/Trình duyệt trong Cài đặt của máy.");
      }
      setIsListening(false);
    };

    recognition.onend = () => setIsListening(false);

    recognition.start();
  };

  const handleAIPlan = async () => {
    if (!aiPrompt.trim() || !user) return;
    setIsGeneratingAI(true);
    
    try {
      const today = new Date();
      const promptContext = `Ngữ cảnh: Hôm nay là ${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}. Dựa vào yêu cầu sau, hãy trích xuất các sự kiện cần làm. Trả về đúng 1 mảng JSON chứa các object sự kiện.\n\nYêu cầu: ${aiPrompt}`;
      
      const payload = {
        contents: [{ parts: [{ text: promptContext }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                title: { type: "STRING" },
                date: { type: "STRING", description: "Format: YYYY-MM-DD" },
                startTime: { type: "STRING", description: "Format: HH:MM" },
                endTime: { type: "STRING", description: "Format: HH:MM" }
              },
              required: ["title", "date", "startTime"]
            }
          }
        }
      };

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();

      if (!res.ok) {
        console.error("Lỗi chi tiết từ Google:", data);
        alert(`Lỗi API: ${data.error?.message || 'Không xác định'}`);
        setIsGeneratingAI(false);
        return;
      }
      
      if(data.candidates?.[0]?.content?.parts?.[0]?.text) {
        let textResponse = data.candidates[0].content.parts[0].text;
        textResponse = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
        
        let generatedEvents = [];
        try {
          generatedEvents = JSON.parse(textResponse);
        } catch (parseError) {
          console.error("Lỗi parse JSON:", parseError);
          alert("Dữ liệu AI trả về bị lỗi định dạng. Vui lòng thử lại!");
          setIsGeneratingAI(false);
          return;
        }
        
        for(const ev of generatedEvents) {
          const evId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
          const createdAt = Date.now();
          
          await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'events', evId), {
            title: ev.title, date: ev.date, startTime: ev.startTime, endTime: ev.endTime || "23:59", createdAt
          });
          
          const taskId = evId + '_task';
          await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'tasks', taskId), {
            text: `[${ev.startTime}] ${ev.title}`,
            completed: false,
            createdAt
          });
        }
        setAiPrompt('');
      }
    } catch (e) {
      console.error("AI Generation Error", e);
      alert("Có lỗi khi tạo kế hoạch tự động. Vui lòng thử lại!");
    }
    setIsGeneratingAI(false);
  };

  const saveSettings = async (newSettings) => {
    if (!user) return;
    try { await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'timer'), { ...settings, ...newSettings }); } catch (e) { console.error(e); }
  };
  
  const toggleTheme = () => saveSettings({ theme: settings.theme === 'light' ? 'dark' : 'light' });
  const formatTime = (sec) => `${Math.floor(sec / 60).toString().padStart(2, '0')}:${(sec % 60).toString().padStart(2, '0')}`;

  const groupedEvents = useMemo(() => {
    const map = {};
    events.forEach(ev => {
      if (!map[ev.date]) map[ev.date] = [];
      map[ev.date].push(ev);
    });
    Object.keys(map).forEach(date => {
      map[date].sort((a, b) => a.startTime.localeCompare(b.startTime));
    });
    return map;
  }, [events]);

  const todayStr = formatDateObj(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
  const isViewingSpecificDate = selectedDateStr && selectedDateStr !== todayStr;
  
  const panelTitle = formatDisplayDate(selectedDateStr);
  
  const displayEvents = isViewingSpecificDate
    ? (groupedEvents[selectedDateStr] || [])
    : events.filter(e => e.date >= todayStr).sort((a,b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)).slice(0, 4);

  if (!user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center"><Loader2 className="w-10 h-10 text-violet-600 animate-spin mx-auto mb-4" /></div>
      </div>
    );
  }

  return (
    <div className={settings.theme === 'dark' ? 'dark' : ''}>
      {/* BANNER MỜI CÀI ĐẶT APP (PWA) CHỈ HIỆN KHI CHƯA CÀI */}
      {(showInstallBanner || showIosInstall) && (
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-4 py-3 sm:py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between shadow-lg relative z-[150] animate-in slide-in-from-top-4">
          <div className="flex items-center gap-3 mb-3 sm:mb-0">
            <div className="bg-white/20 p-2.5 rounded-xl shadow-inner shrink-0"><Layout size={20}/></div>
            <div className="text-sm">
              <p className="font-black text-base">Cài đặt FocusFlow App</p>
              <p className="text-violet-100 text-xs sm:text-sm mt-0.5 opacity-90">
                {showIosInstall
                  ? "Nhấn biểu tượng Chia sẻ (Share) ở dưới cùng màn hình -> Chọn 'Thêm vào MH chính'."
                  : "Cài app ra màn hình chính để dùng mượt mà và nhận thông báo."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {!showIosInstall && (
              <button onClick={handleInstallApp} className="bg-white text-violet-600 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black active:scale-95 transition-transform shadow-md hover:bg-violet-50">
                Cài đặt ngay
              </button>
            )}
            <button onClick={() => { setShowInstallBanner(false); setShowIosInstall(false); }} className="p-2.5 hover:bg-white/20 rounded-xl transition-colors text-white/80 hover:text-white" title="Đóng">
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] text-slate-900 dark:text-slate-100 p-4 md:p-8 pb-24 md:pb-8 font-sans transition-colors duration-500 relative overflow-x-hidden">
        
        {/* COMPACT MODE OVERLAY (Focus Mode Only) */}
        <div className={`fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center transition-all duration-700 ease-in-out ${isCompactMode ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
          <div className={`absolute w-[60vw] h-[60vw] blur-[120px] rounded-full opacity-10 transition-colors duration-1000 ${timerMode === 'work' ? 'bg-violet-600' : 'bg-emerald-500'}`}></div>
          <button onClick={() => setIsCompactMode(false)} className="absolute top-8 right-8 text-white/20 hover:text-white hover:bg-white/10 p-3 md:p-4 rounded-2xl transition-all duration-200 ease-out z-50 group active:scale-95"><Minimize2 size={28} className="transform group-hover:scale-110 transition-transform" /></button>
          <div className="relative font-digital text-[25vw] md:text-[18vw] leading-none select-none cursor-pointer group z-10" onClick={toggleTimer}>
            <div className={`relative transition-colors duration-500 ${timerMode === 'work' ? 'text-violet-500 glow-violet' : 'text-emerald-500 glow-emerald'}`}>{formatTime(timeLeft)}</div>
          </div>
          <div className="absolute bottom-12 text-white/20 uppercase tracking-widest text-xs font-bold flex items-center gap-2 z-10 opacity-0 animate-fade-in-up delay-1000 fill-mode-forwards">
            {!isActive ? <><Play size={16}/> Nhấn vào số để tiếp tục</> : <><Pause size={16}/> Nhấn vào số để tạm dừng</>}
          </div>
        </div>

        {/* NOTIFICATION MODAL */}
        {notification.show && (
          <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center p-0 md:p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-800 rounded-t-[2rem] md:rounded-[3rem] p-8 md:p-10 w-full max-w-sm shadow-2xl text-center border border-white/20 relative z-10 mobile-bottom-sheet md:scale-up-center pb-12 md:pb-10">
              <div className={`w-24 h-24 mx-auto rounded-[2rem] flex items-center justify-center mb-8 shadow-inner ${notification.type === 'work' ? 'bg-violet-100 text-violet-600' : 'bg-emerald-100 text-emerald-600'}`}>
                {notification.type === 'work' ? <PartyPopper size={48} /> : <Coffee size={48} />}
              </div>
              <h3 className="text-3xl font-black mb-3">Tuyệt vời!</h3>
              <p className="text-slate-500 mb-10 font-medium">{notification.message}</p>
              <button onClick={() => setNotification({ ...notification, show: false })} className={`w-full py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-sm text-white transition-all duration-200 ease-out active:scale-95 shadow-xl ${notification.type === 'work' ? 'bg-violet-600' : 'bg-emerald-600'}`}>Tiếp tục thôi</button>
            </div>
          </div>
        )}

        {/* SETTINGS MODAL */}
        {showSettings && (
          <div className="fixed inset-0 z-[150] flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-t-[2rem] md:rounded-[2.5rem] p-8 md:p-10 w-full max-w-md shadow-2xl border border-slate-100 dark:border-slate-700 flex flex-col mobile-bottom-sheet pb-12 md:pb-10">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-black">Tùy chỉnh thời gian</h3>
                <button onClick={() => setShowSettings(false)} className="p-3 md:p-2 bg-slate-100 dark:bg-slate-700 rounded-full hover:bg-slate-200 transition-all duration-200 ease-out active:scale-95"><X size={20} /></button>
              </div>
              <div className="space-y-6">
                <div><label className="text-xs font-black text-slate-400 uppercase">Làm việc (phút)</label><input type="number" value={settings.workTime} onChange={(e) => saveSettings({workTime: parseInt(e.target.value)||1})} className="w-full bg-slate-50 dark:bg-slate-700 p-4 rounded-2xl outline-none font-bold mt-2"/></div>
                <div><label className="text-xs font-black text-slate-400 uppercase">Nghỉ (phút)</label><input type="number" value={settings.breakTime} onChange={(e) => saveSettings({breakTime: parseInt(e.target.value)||1})} className="w-full bg-slate-50 dark:bg-slate-700 p-4 rounded-2xl outline-none font-bold mt-2"/></div>
                <button onClick={() => setShowSettings(false)} className="w-full bg-slate-900 dark:bg-white dark:text-slate-900 text-white py-4 rounded-2xl font-black transition-all duration-200 ease-out active:scale-95">XÁC NHẬN</button>
              </div>
            </div>
          </div>
        )}

        {/* TOP BAR / NAVIGATION */}
        <div className="max-w-6xl mx-auto flex items-center justify-between mb-8 gap-6 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-200 dark:shadow-none"><Layout className="text-white" size={20} /></div>
            <h1 className="text-xl font-black tracking-tight uppercase">FocusFlow</h1>
          </div>
          
          <div className="hidden md:flex bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-2xl shadow-inner border border-slate-200/50 dark:border-slate-700/50">
            <button onClick={() => setActiveTab('focus')} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm uppercase tracking-wider transition-all duration-200 ease-out active:scale-95 ${activeTab === 'focus' ? 'bg-white dark:bg-slate-700 text-violet-600 dark:text-violet-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
              <Clock size={18} /> Focus
            </button>
            <button onClick={() => setActiveTab('plan')} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm uppercase tracking-wider transition-all duration-200 ease-out active:scale-95 ${activeTab === 'plan' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
              <CalendarIcon size={18} /> Plan
            </button>
          </div>

          <div className="flex items-center gap-3">
            {activeTab === 'focus' && (
              <button onClick={() => setIsCompactMode(true)} className="px-4 h-12 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-2 hover:border-violet-400 transition-all duration-200 ease-out font-bold text-sm text-slate-500 active:scale-95">
                <Maximize2 size={18} /><span className="hidden sm:inline">Compact</span>
              </button>
            )}
            <button onClick={toggleTheme} className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:scale-110 transition-all duration-200 ease-out active:scale-95">
              {settings.theme === 'light' ? <Moon size={20} className="text-slate-600" /> : <Sun size={20} className="text-amber-400" />}
            </button>
          </div>
        </div>

        {/* --- MAIN CONTENT SWITCHER --- */}
        <div className="max-w-6xl mx-auto">
          
          {/* TAB: FOCUS */}
          <div className={`transition-all duration-500 ${activeTab === 'focus' ? 'block opacity-100' : 'hidden opacity-0'}`}>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* TIMER */}
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.1)] dark:shadow-none p-8 border border-slate-100 dark:border-slate-700 relative overflow-hidden group">
                  <div className={`absolute -top-24 -right-24 w-48 h-48 blur-[80px] opacity-20 rounded-full transition-colors duration-500 ${timerMode === 'work' ? 'bg-violet-600' : 'bg-emerald-500'}`}></div>
                  <div className="relative z-10">
                    <div className="flex justify-between mb-10">
                      <div className={`flex items-center gap-2 font-bold px-4 py-1.5 rounded-full text-xs uppercase tracking-widest ${timerMode === 'work' ? 'bg-violet-50 text-violet-600 dark:bg-violet-900/20' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20'}`}>
                        <Clock size={14} /> {timerMode === 'work' ? 'Đang làm việc' : 'Nghỉ ngơi'}
                      </div>
                      <button onClick={() => setShowSettings(true)} className="text-slate-400 hover:text-slate-600 p-3 md:p-2 transition-all duration-200 ease-out active:scale-95"><Settings size={20} /></button>
                    </div>
                    <div className="text-center mb-10"><span className="text-8xl font-black tracking-tighter tabular-nums leading-none">{formatTime(timeLeft)}</span></div>
                    <div className="flex justify-center gap-6">
                      <button onClick={resetTimer} className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-700/50 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all duration-200 ease-out active:scale-95"><RotateCcw size={22} /></button>
                      <button onClick={toggleTimer} className={`w-20 h-20 rounded-[2rem] flex items-center justify-center text-white shadow-2xl transition-all duration-200 ease-out active:scale-95 ${isActive ? 'bg-slate-900 dark:bg-white dark:text-slate-900' : 'bg-violet-600'}`}>
                        {isActive ? <Pause size={32} /> : <Play size={32} className="ml-1" />}
                      </button>
                      <button onClick={() => setIsMuted(!isMuted)} className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-700/50 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all duration-200 ease-out active:scale-95">
                        {isMuted ? <BellOff size={22} /> : <Bell size={22} />}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setMode('work')} className={`flex-1 py-4 rounded-3xl font-bold text-sm uppercase tracking-widest transition-all duration-200 ease-out active:scale-95 ${timerMode === 'work' ? 'bg-violet-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-400 border border-slate-100 dark:border-slate-700'}`}>Focus</button>
                  <button onClick={() => setMode('break')} className={`flex-1 py-4 rounded-3xl font-bold text-sm uppercase tracking-widest transition-all duration-200 ease-out active:scale-95 ${timerMode === 'break' ? 'bg-emerald-500 text-white' : 'bg-white dark:bg-slate-800 text-slate-400 border border-slate-100 dark:border-slate-700'}`}>Break</button>
                </div>
              </div>

              {/* TASKS */}
              <div className="lg:col-span-7 bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.1)] dark:shadow-none border border-slate-100 dark:border-slate-700 flex flex-col min-h-[300px] md:min-h-[500px]">
                <div className="p-6 md:p-8 border-b border-slate-50 dark:border-slate-700">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl md:text-2xl font-black">Việc cần làm</h2>
                    <span className="text-xs font-bold bg-violet-50 text-violet-600 dark:bg-violet-900/30 px-3 py-1 rounded-full">{tasks.filter(t => !t.completed).length} mục tiêu</span>
                  </div>
                  <form onSubmit={addTask} className="relative">
                    <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="Hôm nay bạn sẽ hoàn thành gì?" enterKeyHint="send" className="w-full bg-slate-50 dark:bg-slate-700/50 rounded-[1.5rem] pl-6 pr-16 py-5 outline-none font-medium text-slate-700 dark:text-slate-200 focus:border-violet-500 border-2 border-transparent"/>
                    <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 bg-violet-600 text-white p-3 md:p-3 rounded-2xl hover:scale-105 transition-all duration-200 ease-out active:scale-95"><Plus size={24}/></button>
                  </form>
                </div>
                <div className="flex-1 overflow-y-auto p-6 md:p-8 pt-4 md:pt-6 space-y-4 custom-scrollbar">
                  {tasks.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-30 gap-4"><div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-3xl flex items-center justify-center"><CheckSquare size={32} /></div><p className="font-bold uppercase tracking-widest text-xs">Danh sách trống</p></div>
                  ) : (
                    tasks.map(task => (
                      <div key={task.id} className={`group flex items-center gap-3 md:gap-4 p-4 md:p-5 rounded-3xl border transition-all animate-list-item ${task.completed ? 'bg-slate-50/50 dark:bg-slate-900/30 border-transparent' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 shadow-sm md:hover:-translate-y-1'}`}>
                        <button onClick={() => toggleTask(task)} className={`w-8 h-8 md:w-7 md:h-7 rounded-xl flex items-center justify-center transition-all duration-200 ease-out active:scale-95 ${task.completed ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-transparent md:hover:text-slate-300'}`}><CheckCircle size={18} strokeWidth={3}/></button>
                        <span className={`flex-1 text-sm md:text-base ${task.completed ? 'line-through text-slate-400 font-normal' : 'font-semibold'}`}>{task.text}</span>
                        <button onClick={() => deleteTask(task.id)} className="text-slate-400 md:text-slate-300 hover:text-red-500 opacity-100 md:opacity-0 group-hover:opacity-100 p-3 md:p-2 transition-all duration-200 ease-out active:scale-95"><Trash2 size={18}/></button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* TAB: PLAN (LỊCH & AI) */}
          <div className={`transition-all duration-500 ${activeTab === 'plan' ? 'block opacity-100' : 'hidden opacity-0'}`}>
            
            <div className="flex items-center justify-between mb-6 md:mb-8">
              <h2 className="text-4xl md:text-7xl font-black lowercase tracking-tighter capitalize">
                {currentMonthDate.toLocaleString('vi-VN', { month: 'long' })}
              </h2>
              <div className="flex items-center gap-2 md:gap-4">
                <button onClick={handlePrevMonth} className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm hover:scale-105 transition-all duration-200 ease-out active:scale-95"><ChevronLeft size={20}/></button>
                <button onClick={handleNextMonth} className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm hover:scale-105 transition-all duration-200 ease-out active:scale-95"><ChevronRight size={20}/></button>
                <div className="text-2xl md:text-4xl font-black ml-2 md:ml-4 opacity-30 tabular-nums leading-none">
                  {currentMonthDate.getFullYear()}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              <div className="lg:col-span-8 bg-white dark:bg-slate-800 rounded-[2rem] md:rounded-[2.5rem] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.1)] dark:shadow-none border border-slate-100 dark:border-slate-700 overflow-hidden flex flex-col p-4 md:p-6">
                <div className="grid grid-cols-7 mb-2 md:mb-4">
                  {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d, i) => (
                    <div key={d} className={`py-2 text-center text-xs sm:text-sm font-black uppercase tracking-widest ${i >= 5 ? 'text-violet-500' : 'text-slate-400'}`}>
                      {d}
                    </div>
                  ))}
                </div>
                
                <div className="flex-1 grid grid-cols-7 gap-1 md:gap-2">
                  {Array.from({ length: adjustedStartDay }).map((_, i) => (
                    <div key={`empty-${i}`} className="aspect-square opacity-0 pointer-events-none"></div>
                  ))}
                  
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const dateStr = formatDateObj(currentMonthDate.getFullYear(), currentMonthDate.getMonth(), day);
                    const dayEvents = groupedEvents[dateStr] || [];
                    const isSelected = dateStr === selectedDateStr;
                    const isToday = dateStr === todayStr;

                    return (
                      <div 
                        key={day} 
                        onClick={() => handleDayClick(day)}
                        className={`aspect-square flex flex-col items-center justify-center p-1 sm:p-2 relative cursor-pointer rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-all duration-200 ease-out group active:scale-[0.92] ${isSelected ? 'bg-slate-50 dark:bg-slate-700/30' : ''}`}
                      >
                        <span className={`text-sm sm:text-base font-bold w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full transition-all ${isSelected ? 'bg-violet-600 text-white shadow-md scale-110' : isToday ? 'bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-400' : 'text-slate-600 dark:text-slate-300 group-hover:text-violet-600'}`}>
                          {day}
                        </span>
                        
                        <div className="flex gap-1 mt-1 h-2 flex-wrap justify-center w-full px-1">
                          {dayEvents.slice(0, 3).map(ev => (
                            <div key={ev.id} className="w-1.5 h-1.5 rounded-full bg-violet-500"></div>
                          ))}
                          {dayEvents.length > 3 && (
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600"></div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="lg:col-span-4 space-y-6">
                
                <div className="bg-white dark:bg-slate-800 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 border border-slate-100 dark:border-slate-700 flex flex-col transition-all">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl md:text-2xl font-black capitalize">{panelTitle}</h3>
                    <button 
                      onClick={() => {
                        if(!selectedDateStr) setSelectedDateStr(todayStr);
                        setShowInlineForm(true);
                      }} 
                      className="p-2.5 bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400 rounded-xl hover:scale-105 transition-all duration-200 ease-out active:scale-95"
                      title="Thêm sự kiện"
                    >
                      <Plus size={20} strokeWidth={3} />
                    </button>
                  </div>

                  {showInlineForm && (
                    <div className="mb-6 bg-slate-50 dark:bg-slate-900/50 rounded-[1.5rem] p-5 border border-slate-100 dark:border-slate-700 animate-in fade-in slide-in-from-top-4 duration-300">
                      <input 
                        type="text" 
                        placeholder="Tiêu đề sự kiện..." 
                        value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})}
                        className="w-full text-lg font-black outline-none border-b-2 border-transparent focus:border-violet-500 pb-2 mb-4 bg-transparent transition-colors placeholder:text-slate-300 dark:placeholder:text-slate-600"
                      />
                      
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-3 bg-white dark:bg-slate-800 px-4 py-3 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                          <Clock size={18} className="text-violet-500 opacity-80 shrink-0" />
                          <CustomTimePicker value={newEvent.startTime} onChange={v => setNewEvent({...newEvent, startTime: v})} />
                          <span className="text-slate-300 font-black shrink-0">-</span>
                          <CustomTimePicker value={newEvent.endTime} onChange={v => setNewEvent({...newEvent, endTime: v})} />
                        </div>
                        
                        <div className="flex items-center gap-3 cursor-pointer group w-max transition-all duration-200 ease-out active:scale-95 mt-1" onClick={() => setAddToFocus(!addToFocus)}>
                          <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${addToFocus ? 'bg-violet-600 text-white scale-110 shadow-md shadow-violet-200 dark:shadow-none' : 'bg-slate-200 dark:bg-slate-700 text-transparent group-hover:bg-slate-300 dark:group-hover:bg-slate-600'}`}>
                            <CheckCircle size={12} strokeWidth={4} />
                          </div>
                          <span className={`text-xs font-bold transition-colors select-none ${addToFocus ? 'text-violet-600 dark:text-violet-400' : 'text-slate-500'}`}>
                            Đồng bộ vào Focus
                          </span>
                        </div>

                        <div className="flex justify-end gap-2 mt-2">
                          <button onClick={() => setShowInlineForm(false)} className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-600 transition-all duration-200 ease-out active:scale-95">Hủy</button>
                          <button onClick={handleAddManualEvent} className="px-6 py-2.5 rounded-xl text-xs font-black bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-200 dark:shadow-none transition-all duration-200 ease-out active:scale-95">Lưu Sự kiện</button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    {displayEvents.map(ev => (
                      <div key={ev.id} className="group flex gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-700/50 transition-all hover:bg-slate-100 dark:hover:bg-slate-700 relative overflow-hidden animate-list-item">
                        <div className="w-2 h-auto bg-violet-500 rounded-full shrink-0"></div>
                        <div className="flex-1 min-w-0 pr-8">
                          <p className="font-bold text-sm truncate">{ev.title}</p>
                          <p className="text-xs text-slate-500 mt-1">{ev.date} • {ev.startTime}</p>
                        </div>
                        <button onClick={(e) => handleDeleteEvent(ev.id, e)} className="absolute right-1 md:right-3 top-1/2 -translate-y-1/2 text-slate-400 md:text-slate-300 hover:text-red-500 opacity-100 md:opacity-0 group-hover:opacity-100 transition-all duration-200 ease-out p-3 md:p-2 active:scale-95" title="Xóa sự kiện">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                    {displayEvents.length === 0 && <p className="text-sm text-slate-400 italic">Không có sự kiện nào.</p>}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 border border-violet-100 dark:border-slate-700 relative overflow-hidden">
                  <div className="absolute -top-10 -right-10 text-violet-500/10"><Sparkles size={120} /></div>
                  <div className="relative z-10">
                    <div className="inline-flex items-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase mb-6">
                      <Sparkles size={12} /> AI Planner
                    </div>
                    <textarea 
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="VD: Chiều mai 2h họp dự án, 5h đi tập gym. Sáng T7 8h học Tiếng Anh..."
                      className="w-full h-32 bg-white/60 dark:bg-slate-900/40 backdrop-blur-sm rounded-2xl p-4 text-sm font-medium outline-none resize-none focus:ring-2 focus:ring-violet-500 placeholder:text-slate-400 border border-white/50 dark:border-slate-700/50 shadow-inner"
                    ></textarea>
                    
                    <div className="flex gap-2 mt-4">
                      <button 
                        onClick={handleVoiceInput}
                        title="Nhập bằng giọng nói"
                        className={`flex items-center justify-center p-4 rounded-2xl border transition-all duration-300 ${isListening ? 'bg-red-50 dark:bg-red-900/30 border-red-500 text-red-500 animate-pulse' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95'}`}
                      >
                        <Mic size={24} />
                      </button>
                      
                      <button 
                        onClick={handleAIPlan}
                        disabled={isGeneratingAI || !aiPrompt.trim()}
                        className="flex-1 bg-violet-600 hover:bg-violet-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-violet-200 dark:shadow-none transition-all duration-200 ease-out active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isGeneratingAI ? <><Loader2 size={18} className="animate-spin" /> Đang phân tích...</> : 'Tạo kế hoạch thông minh'}
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* MOBILE BOTTOM NAVIGATION */}
        <div className="fixed bottom-0 left-0 w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 md:hidden z-[90] pb-safe">
          <div className="flex justify-around items-center p-2 gap-2">
            <button onClick={() => setActiveTab('focus')} className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-2xl transition-all duration-200 ease-out active:scale-95 ${activeTab === 'focus' ? 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>
              <Clock size={22} /><span className="text-[10px] font-black uppercase tracking-widest">Focus</span>
            </button>
            <button onClick={() => setActiveTab('plan')} className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-2xl transition-all duration-200 ease-out active:scale-95 ${activeTab === 'plan' ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>
              <CalendarIcon size={22} /><span className="text-[10px] font-black uppercase tracking-widest">Plan</span>
            </button>
          </div>
        </div>

        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=Share+Tech+Mono&display=swap');
          body { font-family: 'Plus Jakarta Sans', sans-serif; }
          .font-digital { font-family: 'Share Tech Mono', monospace; }
          .glow-violet { text-shadow: 0 0 20px rgba(139, 92, 246, 0.6), 0 0 50px rgba(139, 92, 246, 0.4); }
          .glow-emerald { text-shadow: 0 0 20px rgba(16, 185, 129, 0.6), 0 0 50px rgba(16, 185, 129, 0.4); }
          .custom-scrollbar::-webkit-scrollbar { width: 4px; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
          .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; }
          .scale-up-center { animation: scale-up-center 0.4s cubic-bezier(0.175, 0.885, 0.320, 1.275) both; }
          @keyframes scale-up-center { 0% { transform: scale(0.7); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
          .animate-fade-in-up { animation: fade-in-up 1s ease forwards; }
          @keyframes fade-in-up { 0% { opacity: 0; transform: translateY(10px); } 100% { opacity: 1; transform: translateY(0); } }
          .fill-mode-forwards { animation-fill-mode: forwards; }
          .delay-1000 { animation-delay: 1s; }
          
          input[type="time"] { position: relative; }
          input[type="time"]::-webkit-datetime-edit-ampm-field { display: none; }
          input[type="time"]::-webkit-calendar-picker-indicator { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; }
          
          @media (max-width: 767px) { .mobile-bottom-sheet { animation: slideUp 0.4s cubic-bezier(0.32, 0.72, 0, 1) forwards; } }
          @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
          
          .animate-list-item { animation: listItemEnter 0.3s ease-out forwards; }
          @keyframes listItemEnter { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
          
          .pb-safe { padding-bottom: env(safe-area-inset-bottom); }
        `}</style>
      </div>
    </div>
  );
};

export default App;
