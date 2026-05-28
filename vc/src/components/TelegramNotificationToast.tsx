import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore, SidebarNotification } from '../store/notificationStore';
import { X, Send, Check } from 'lucide-react';

export default function TelegramNotificationToast() {
  const navigate = useNavigate();
  const notifications = useNotificationStore((state) => state.notifications);
  const markAsRead = useNotificationStore((state) => state.markAsRead);

  const [toast, setToast] = useState<SidebarNotification | null>(null);
  const [visible, setVisible] = useState(false);
  const lastIdRef = useRef<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Programmatic Web Audio API chime synthesis for high-fidelity offline notification audio
  const playChime = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      // Chime 1: A5 (880 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.frequency.setValueAtTime(880, ctx.currentTime);
      gain1.gain.setValueAtTime(0.08, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.18);
      
      // Chime 2: E6 (1320 Hz) with a 70ms delay
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.frequency.setValueAtTime(1320, ctx.currentTime);
        gain2.gain.setValueAtTime(0.06, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
        osc2.start();
        osc2.stop(ctx.currentTime + 0.28);
      }, 70);
    } catch (e) {
      console.warn("Web Audio chime playback failed due to user interaction policies:", e);
    }
  };

  useEffect(() => {
    if (notifications.length > 0) {
      const latest = notifications[0];

      // Setup initial ID on mount to prevent toast spam when the page loads
      if (lastIdRef.current === null) {
        lastIdRef.current = latest.id;
        return;
      }

      // Check if there is a new incoming notification
      if (latest.id !== lastIdRef.current) {
        lastIdRef.current = latest.id;
        setToast(latest);
        setVisible(true);
        playChime();

        // Clear any active timers
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }

        // Start new auto-dismiss timer (6 seconds)
        timerRef.current = setTimeout(() => {
          setVisible(false);
        }, 6000);
      }
    }
  }, [notifications]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    setVisible(false);
  };

  const handleAction = () => {
    if (!toast) return;
    setVisible(false);
    markAsRead(toast.id);
    // Navigate to project detail page with proof tab active
    navigate(`/launch/${toast.projectId}?tab=proof`, { state: { activeTab: 'proof' } });
  };

  const handleMouseEnter = () => {
    // Pause auto-dismiss when user is hovering
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleMouseLeave = () => {
    // Resume auto-dismiss when mouse leaves
    if (!timerRef.current) {
      timerRef.current = setTimeout(() => {
        setVisible(false);
      }, 3000); // give it another 3 seconds
    }
  };

  if (!toast) return null;

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleAction}
      className={`fixed bottom-20 md:bottom-6 right-4 md:right-6 max-w-sm w-[calc(100vw-2rem)] md:w-80 z-[9999] bg-[#0E1621] border border-[#24303F] rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.6)] p-3.5 transition-all duration-300 transform select-none hover:scale-[1.02] active:scale-[0.98] cursor-pointer ${
        visible 
          ? 'opacity-100 translate-x-0 pointer-events-auto' 
          : 'opacity-0 translate-x-12 pointer-events-none'
      }`}
    >
      <div className="flex gap-3 text-left">
        {/* Telegram icon badge */}
        <div className="relative shrink-0">
          <div className="w-10 h-10 rounded-full bg-[#24A1DE] flex items-center justify-center text-white shadow-md">
            <Send size={18} className="translate-x-[-1px] translate-y-[1px] rotate-[320deg]" />
          </div>
          <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-[8px] font-mono text-black font-extrabold px-1 rounded-full border border-[#0E1621]">
            BOT
          </span>
        </div>

        {/* Message body */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="text-xs font-black text-white font-sans">VibeCoder Bot</span>
              <span className="w-3.5 h-3.5 rounded-full bg-[#24A1DE] flex items-center justify-center text-white p-0.5 scale-75 shrink-0">
                <Check size={10} strokeWidth={4} />
              </span>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-300 p-0.5 rounded-full transition cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>

          <div className="text-[10.5px] font-bold text-[#A5C0FF] font-sans truncate">
            {toast.title}
          </div>
          <p className="text-[10px] text-gray-300 leading-normal font-sans line-clamp-2">
            {toast.description}
          </p>

          <div className="pt-1.5 flex items-center justify-between text-[9px] font-mono text-gray-500">
            <span>点击进行 Proof 核验 »</span>
            <span>刚刚</span>
          </div>
        </div>
      </div>
    </div>
  );
}
