import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  collection, 
  onSnapshot, 
  deleteDoc, 
  updateDoc,
  query
} from 'firebase/firestore';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  Plus, 
  Trash2, 
  CheckCircle, 
  Circle, 
  Play, 
  Pause, 
  RotateCcw, 
  Clock, 
  CheckSquare,
  Bell,
  BellOff,
  Settings,
  X,
  Loader2,
  PartyPopper,
  Coffee,
  Sun,
  Moon,
  Layout
} from 'lucide-react';

// --- Khởi tạo Firebase ---
const firebaseConfig = {
  apiKey: "AIzaSyCtwzMGOI4NvYQUdnIixYIV8xW7K61qzdY",
  authDomain: "workflow-bb753.firebaseapp.com",
  projectId: "workflow-bb753",
  storageBucket: "workflow-bb753.firebasestorage.app",
  messagingSenderId: "608288170073",
  appId: "1:608288170073:web:056cb8e6e2c4425b151148",
  measurementId: "G-LQDP02Y66S"
};

const App = () => {
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inputValue, setInputValue] = useState('');

  // --- State cho Timer & Settings ---
  const [settings, setSettings] = useState({ workTime: 25, breakTime: 5, theme: 'light' });
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [timerMode, setTimerMode] = useState('work'); 
  const [isMuted, setIsMuted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Custom Notification State
  const [notification, setNotification] = useState({ show: false, message: '', type: 'work' });
  
  const timerRef = useRef(null);
  const initialLoadRef = useRef(true);

  // 1. Xử lý Authentication
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
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // 2. Lắng nghe dữ liệu từ Firestore
  useEffect(() => {
    if (!user) return;

    const tasksCol = collection(db, 'artifacts', appId, 'users', user.uid, 'tasks');
    const unsubscribeTasks = onSnapshot(tasksCol, (snapshot) => {
      const taskList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTasks(taskList.sort((a, b) => b.createdAt - a.createdAt));
      setLoading(false);
    }, (error) => console.error("Tasks fetch error:", error));

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

    return () => {
      unsubscribeTasks();
      unsubscribeSettings();
    };
  }, [user, timerMode]);

  // 3. Logic Đếm ngược
  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
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
    
    if (!isMuted) {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3');
      audio.volume = 0.3; 
      audio.play().catch(() => {});
    }

    setNotification({
      show: true,
      message: timerMode === 'work' ? 'Bạn đã làm việc rất tốt! Giờ hãy nghỉ ngơi nhé.' : 'Nghỉ ngơi đủ rồi, quay lại công việc thôi nào!',
      type: timerMode
    });
  };

  // --- Hành động To-do ---
  const addTask = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || !user) return;
    const taskId = Date.now().toString();
    const taskData = {
      text: inputValue,
      completed: false,
      createdAt: Date.now()
    };
    try {
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'tasks', taskId), taskData);
      setInputValue('');
    } catch (e) { console.error("Add error:", e); }
  };

  const toggleTask = async (task) => {
    if (!user) return;
    try {
      const taskDoc = doc(db, 'artifacts', appId, 'users', user.uid, 'tasks', task.id);
      await updateDoc(taskDoc, { completed: !task.completed });
    } catch (e) { console.error("Update error:", e); }
  };

  const deleteTask = async (taskId) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'tasks', taskId));
    } catch (e) { console.error("Delete error:", e); }
  };

  // --- Hành động Timer & Settings ---
  const toggleTimer = () => setIsActive(!isActive);
  
  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(timerMode === 'work' ? settings.workTime * 60 : settings.breakTime * 60);
  };

  const setMode = (mode) => {
    setTimerMode(mode);
    setIsActive(false);
    setTimeLeft(mode === 'work' ? settings.workTime * 60 : settings.breakTime * 60);
  };

  const saveSettings = async (newSettings) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'timer'), {
        ...settings,
        ...newSettings
      });
    } catch (e) { console.error("Save settings error:", e); }
  };

  const toggleTheme = () => {
    const newTheme = settings.theme === 'light' ? 'dark' : 'light';
    saveSettings({ theme: newTheme });
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-violet-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-400 font-medium tracking-wide">Đang chuẩn bị không gian làm việc...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={settings.theme === 'dark' ? 'dark' : ''}>
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] text-slate-900 dark:text-slate-100 p-4 md:p-10 font-sans transition-colors duration-500 ease-in-out">
        
        {/* TOP BAR / NAVIGATION */}
        <div className="max-w-5xl mx-auto flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-200 dark:shadow-none">
              <Layout className="text-white" size={20} />
            </div>
            <h1 className="text-xl font-black tracking-tight uppercase">FocusFlow</h1>
          </div>
          
          <button 
            onClick={toggleTheme}
            className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:scale-110 transition-transform duration-300"
          >
            {settings.theme === 'light' ? <Moon size={20} className="text-slate-600" /> : <Sun size={20} className="text-amber-400" />}
          </button>
        </div>

        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* TIMER SECTION (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.1)] dark:shadow-none p-8 border border-slate-100 dark:border-slate-700 relative overflow-hidden group">
              {/* Background Glow */}
              <div className={`absolute -top-24 -right-24 w-48 h-48 blur-[80px] opacity-20 rounded-full transition-colors duration-500 ${timerMode === 'work' ? 'bg-violet-600' : 'bg-emerald-500'}`}></div>
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-10">
                  <div className={`flex items-center gap-2 font-bold px-4 py-1.5 rounded-full text-xs uppercase tracking-widest ${timerMode === 'work' ? 'bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'}`}>
                    <Clock size={14} />
                    {timerMode === 'work' ? 'Đang làm việc' : 'Nghỉ ngơi'}
                  </div>
                  <button onClick={() => setShowSettings(!showSettings)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                    <Settings size={20} />
                  </button>
                </div>

                <div className="text-center mb-10">
                  <span className="text-8xl md:text-9xl font-black tracking-tighter tabular-nums leading-none">
                    {formatTime(timeLeft)}
                  </span>
                </div>

                <div className="flex items-center justify-center gap-6">
                  <button 
                    onClick={resetTimer}
                    className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-700/50 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all hover:bg-slate-100"
                  >
                    <RotateCcw size={22} />
                  </button>

                  <button 
                    onClick={toggleTimer}
                    className={`w-20 h-20 rounded-[2rem] flex items-center justify-center text-white shadow-2xl transform transition-all active:scale-95 ${isActive ? 'bg-slate-900 dark:bg-white dark:text-slate-900' : 'bg-violet-600 shadow-violet-200 dark:shadow-none'}`}
                  >
                    {isActive ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
                  </button>

                  <button 
                    onClick={() => setIsMuted(!isMuted)}
                    className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-700/50 text-slate-400 hover:text-slate-900 transition-all"
                  >
                    {isMuted ? <BellOff size={22} /> : <Bell size={22} />}
                  </button>
                </div>
              </div>

              {/* Setting Overlay */}
              {showSettings && (
                <div className="absolute inset-0 z-20 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md p-8 flex flex-col justify-center animate-in fade-in zoom-in duration-200">
                  <button onClick={() => setShowSettings(false)} className="absolute top-6 right-6 p-2"><X size={24} /></button>
                  <h3 className="text-xl font-black mb-8">Tùy chỉnh thời gian</h3>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Thời gian làm việc (phút)</label>
                      <input 
                        type="number" 
                        value={settings.workTime} 
                        onChange={(e) => saveSettings({workTime: parseInt(e.target.value)||1})} 
                        className="w-full bg-slate-50 dark:bg-slate-700 p-4 rounded-2xl outline-none border-2 border-transparent focus:border-violet-500 font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Thời gian nghỉ (phút)</label>
                      <input 
                        type="number" 
                        value={settings.breakTime} 
                        onChange={(e) => saveSettings({breakTime: parseInt(e.target.value)||1})} 
                        className="w-full bg-slate-50 dark:bg-slate-700 p-4 rounded-2xl outline-none border-2 border-transparent focus:border-emerald-500 font-bold"
                      />
                    </div>
                    <button onClick={() => setShowSettings(false)} className="w-full bg-slate-900 dark:bg-white dark:text-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl mt-4">Xác nhận</button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setMode('work')} 
                className={`flex-1 py-4 rounded-3xl font-bold transition-all text-sm uppercase tracking-widest ${timerMode === 'work' ? 'bg-violet-600 text-white shadow-lg shadow-violet-200 dark:shadow-none' : 'bg-white dark:bg-slate-800 text-slate-400 border border-slate-100 dark:border-slate-700'}`}
              >
                Focus
              </button>
              <button 
                onClick={() => setMode('break')} 
                className={`flex-1 py-4 rounded-3xl font-bold transition-all text-sm uppercase tracking-widest ${timerMode === 'break' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200 dark:shadow-none' : 'bg-white dark:bg-slate-800 text-slate-400 border border-slate-100 dark:border-slate-700'}`}
              >
                Break
              </button>
            </div>
          </div>

          {/* TASK SECTION (7 cols) */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.1)] dark:shadow-none border border-slate-100 dark:border-slate-700 flex flex-col min-h-[500px] overflow-hidden">
            <div className="p-8 border-b border-slate-50 dark:border-slate-700">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black tracking-tight">Việc cần làm</h2>
                <span className="text-xs font-bold bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 px-3 py-1 rounded-full border border-violet-100 dark:border-violet-800">
                  {tasks.filter(t => !t.completed).length} mục tiêu
                </span>
              </div>

              <form onSubmit={addTask} className="relative">
                <input 
                  type="text" 
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Hôm nay bạn sẽ hoàn thành gì?"
                  className="w-full bg-slate-50 dark:bg-slate-700/50 border-2 border-transparent rounded-[1.5rem] pl-6 pr-16 py-5 focus:outline-none focus:bg-white dark:focus:bg-slate-700 focus:border-violet-500 transition-all font-medium text-slate-700 dark:text-slate-200"
                />
                <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 bg-violet-600 text-white p-3 rounded-2xl shadow-lg shadow-violet-200 dark:shadow-none hover:scale-105 transition-transform">
                  <Plus size={24} strokeWidth={3} />
                </button>
              </form>
            </div>

            <div className="flex-1 overflow-y-auto p-8 pt-6 space-y-4 custom-scrollbar">
              {loading ? (
                <div className="flex justify-center items-center h-full opacity-20"><Loader2 className="animate-spin" size={40}/></div>
              ) : tasks.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-30 gap-4">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-3xl flex items-center justify-center">
                    <CheckSquare size={32} />
                  </div>
                  <p className="font-bold text-slate-400 uppercase tracking-widest text-xs">Danh sách đang trống</p>
                </div>
              ) : (
                tasks.map(task => (
                  <div 
                    key={task.id} 
                    className={`group flex items-center gap-4 p-5 rounded-3xl border transition-all duration-300 ${task.completed ? 'bg-slate-50/50 dark:bg-slate-900/30 border-transparent' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 shadow-[0_10px_20px_-10px_rgba(0,0,0,0.05)] hover:shadow-lg hover:-translate-y-1'}`}
                  >
                    <button 
                      onClick={() => toggleTask(task)}
                      className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all ${task.completed ? 'bg-emerald-500 text-white scale-90' : 'bg-slate-100 dark:bg-slate-700 text-transparent hover:text-slate-300'}`}
                    >
                      <CheckCircle size={18} strokeWidth={3} />
                    </button>
                    
                    <span className={`flex-1 text-base transition-all duration-500 ${task.completed ? 'line-through text-slate-400 italic font-normal' : 'font-semibold text-slate-700 dark:text-slate-200'}`}>
                      {task.text}
                    </span>

                    <button 
                      onClick={() => deleteTask(task.id)} 
                      className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-2"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))
              )}
            </div>
            
            <div className="p-6 text-center">
              <p className="text-[10px] text-slate-300 dark:text-slate-500 uppercase font-black tracking-[0.2em]">Secure Cloud Sync Enabled</p>
            </div>
          </div>
        </div>

        {/* NOTIFICATION MODAL */}
        {notification.show && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-800 rounded-[3rem] p-10 max-w-sm w-full shadow-2xl text-center scale-up-center border border-white/20">
              <div className={`w-24 h-24 mx-auto rounded-[2rem] flex items-center justify-center mb-8 shadow-inner ${notification.type === 'work' ? 'bg-violet-100 text-violet-600' : 'bg-emerald-100 text-emerald-600'}`}>
                {notification.type === 'work' ? <PartyPopper size={48} /> : <Coffee size={48} />}
              </div>
              <h3 className="text-3xl font-black mb-3">Tuyệt vời!</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-10 font-medium">
                {notification.message}
              </p>
              <button 
                onClick={() => setNotification({ ...notification, show: false })}
                className={`w-full py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-sm text-white transition-all active:scale-95 shadow-xl ${notification.type === 'work' ? 'bg-violet-600 shadow-violet-200 dark:shadow-none' : 'bg-emerald-600 shadow-emerald-200 dark:shadow-none'}`}
              >
                Tiếp tục thôi
              </button>
            </div>
          </div>
        )}

        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap');
          
          body { font-family: 'Plus Jakarta Sans', sans-serif; }
          
          .custom-scrollbar::-webkit-scrollbar { width: 4px; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
          .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; }
          
          .scale-up-center {
            animation: scale-up-center 0.4s cubic-bezier(0.175, 0.885, 0.320, 1.275) both;
          }
          @keyframes scale-up-center {
            0% { transform: scale(0.7); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
          }
          
          /* Hide number arrows */
          input::-webkit-outer-spin-button, input::-webkit-inner-spin-button {
            -webkit-appearance: none; margin: 0;
          }
        `}</style>
      </div>
    </div>
  );
};

export default App;
