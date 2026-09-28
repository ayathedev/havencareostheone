import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Activity, Share2 } from 'lucide-react';

export default function BootScreen({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(timer);
          setTimeout(onComplete, 500);
          return 100;
        }
        return p + Math.floor(Math.random() * 10) + 2;
      });
    }, 150);
    return () => clearInterval(timer);
  }, []); // Remove onComplete to avoid re-running on parent re-renders

  return (
    <div className="fixed inset-0 z-50 bg-[#0B0F19] flex flex-col items-center justify-center overflow-hidden">
      {/* Background Wallpaper Overlay */}
      <img 
        src="/src/assets/images/haven_os_wallpaper_1780622951790.png" 
        alt="" 
        className="absolute inset-0 w-full h-full object-cover opacity-10 pointer-events-none"
        referrerPolicy="no-referrer"
      />
      {/* Background Tech Elements */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
         <div className="absolute top-[20%] left-[20%] w-px h-[60%] bg-gradient-to-b from-transparent via-teal-500 to-transparent opacity-50" />
         <div className="absolute top-[50%] left-[10%] w-[80%] h-px bg-gradient-to-r from-transparent via-teal-500 to-transparent opacity-50" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="relative z-10 flex flex-col items-center"
      >
        {/* Animated Owl Logo (Haven) */}
        <div className="relative mb-8 group">
          <motion.div 
             animate={{ rotate: 360 }}
             transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
             className="absolute -inset-10 border-[1.5px] border-solid border-[#FDE047]/30 rounded-full"
          />
          <motion.div 
             animate={{ rotate: -360 }}
             transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
             className="absolute -inset-14 border-[1px] border-[#38BDF8]/20 rounded-full"
          >
             <div className="absolute top-0 left-1/2 -ml-1 w-2 h-2 bg-[#38BDF8] rounded-full shadow-[0_0_10px_#38BDF8]" />
          </motion.div>
          
          <motion.div
             animate={{ y: [-8, 8, -8] }}
             transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
             className="relative w-48 h-48 rounded-full flex items-center justify-center z-10 drop-shadow-[0_0_30px_rgba(253,224,71,0.3)]"
          >
             {/* Complex SVG representation of the Haven Mascot */}
             <svg viewBox="0 0 200 200" className="w-[120%] h-[120%]">
               {/* Glowing backing */}
               <circle cx="100" cy="100" r="45" fill="#fde047" opacity="0.1" filter="blur(10px)" />
               <motion.g animate={{ y: [-2, 2, -2] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>
                 {/* Body feathers */}
                 <path d="M 60,110 C 60,160 140,160 140,110 C 140,60 120,40 100,40 C 80,40 60,60 60,110 Z" fill="#b45309" stroke="#fde047" strokeWidth="2" />
                 <path d="M 65,110 C 65,150 135,150 135,110 C 135,70 120,50 100,50 C 80,50 65,70 65,110 Z" fill="#fef3c7" />
                 {/* Feathers textures */}
                 <path d="M 85,130 Q 100,150 115,130" fill="none" stroke="#d97706" strokeWidth="3" strokeLinecap="round" />
                 <path d="M 75,110 Q 100,130 125,110" fill="none" stroke="#d97706" strokeWidth="3" strokeLinecap="round" />
                 <path d="M 80,90 Q 100,110 120,90" fill="none" stroke="#d97706" strokeWidth="3" strokeLinecap="round" />
                 
                 {/* Face / Mask */}
                 <path d="M 60,70 C 60,60 80,50 100,70 C 120,50 140,60 140,70 C 140,90 100,110 100,110 C 100,110 60,90 60,70 Z" fill="#ffffff" stroke="#fde047" strokeWidth="1" />
                 
                 {/* Beak */}
                 <path d="M 95,85 L 105,85 L 100,95 Z" fill="#d97706" stroke="#b45309" strokeWidth="1" />

                 {/* Eyes */}
                 <circle cx="80" cy="75" r="10" fill="#022c22" />
                 <circle cx="120" cy="75" r="10" fill="#022c22" />
                 <motion.circle cx="82" cy="73" r="3" fill="#ffffff" animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1.5 }} />
                 <motion.circle cx="122" cy="73" r="3" fill="#ffffff" animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1.5 }} />
                 
                 {/* Glasses */}
                 <circle cx="80" cy="75" r="14" fill="none" stroke="#38bdf8" strokeWidth="2" />
                 <circle cx="120" cy="75" r="14" fill="none" stroke="#38bdf8" strokeWidth="2" />
                 <path d="M 94,75 L 106,75" fill="none" stroke="#38bdf8" strokeWidth="2" />

                 {/* Chest Medallion */}
                 <circle cx="100" cy="115" r="12" fill="#78350f" stroke="#fde047" strokeWidth="1.5" />
                 <path d="M 100,108 L 100,122 M 95,115 L 100,115 L 104,111 M 100,115 L 105,119" fill="none" stroke="#a7f3d0" strokeWidth="1.5" strokeLinecap="round" />

                 {/* Wings */}
                 <path d="M 60,80 C 40,80 40,140 65,130 C 50,110 50,90 60,80 Z" fill="#b45309" stroke="#fde047" strokeWidth="1" />
                 <path d="M 140,80 C 160,80 160,140 135,130 C 150,110 150,90 140,80 Z" fill="#b45309" stroke="#fde047" strokeWidth="1" />

                 {/* Ears/Tufts */}
                 <path d="M 65,60 C 65,40 50,40 50,40 C 70,30 85,50 85,50 Z" fill="#b45309" stroke="#fde047" strokeWidth="1" />
                 <path d="M 135,60 C 135,40 150,40 150,40 C 130,30 115,50 115,50 Z" fill="#b45309" stroke="#fde047" strokeWidth="1" />

                 {/* Feet */}
                 <path d="M 85,155 C 85,165 95,165 95,155 Z" fill="#d97706" />
                 <path d="M 105,155 C 105,165 115,165 115,155 Z" fill="#d97706" />
               </motion.g>

               {/* Branch */}
               <path d="M 40,160 Q 100,170 160,150 Q 170,145 165,140 Q 155,135 150,145" fill="none" stroke="#78350f" strokeWidth="4" strokeLinecap="round" />
               <path d="M 50,162 Q 55,150 45,145" fill="none" stroke="#fde047" strokeWidth="1.5" strokeLinecap="round" />
               <path d="M 140,154 Q 150,135 160,140" fill="none" stroke="#fde047" strokeWidth="1.5" strokeLinecap="round" />
             </svg>
          </motion.div>
          
          {/* Orbiting Elements */}
          <motion.div 
             animate={{ rotate: 360 }}
             transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
             className="absolute -inset-16 opacity-30"
          >
             <Shield className="absolute top-2 left-4 w-6 h-6 text-[#fde047]" />
             <Activity className="absolute bottom-2 right-4 w-6 h-6 text-[#38bdf8]" />
          </motion.div>
        </div>

        {/* Text / Title */}
        <div className="flex flex-col items-center space-y-2 mt-4">
          <h1 className="text-6xl font-sans tracking-tight text-white mb-2 font-semibold" style={{ textShadow: "0 0 30px rgba(255,255,255,0.4)"}}>
            HAVEN <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-200 to-amber-100 font-bold mix-blend-plus-lighter inline-block">OS</span>
          </h1>
          <p className="text-slate-400 font-medium text-[11px] tracking-[0.2em] uppercase flex items-center gap-3 opacity-80 mt-1">
            <span>Integrated AI</span>
            <span className="w-1 h-1 rounded-full bg-slate-500" />
            <span>Secure & Seamless</span>
            <span className="w-1 h-1 rounded-full bg-slate-500" />
            <span>Ver. 1.0.4</span>
          </p>
        </div>

        {/* Loading Bar */}
        <div className="w-72 max-w-[80vw] flex flex-col items-center mt-12 relative">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#38bdf8] mb-4 h-3 opacity-90 drop-shadow-[0_0_5px_rgba(56,189,248,0.5)]">
             {progress < 25 ? 'Initializing System...' : progress < 50 ? 'Decrypting Secure Storage...' : progress < 80 ? 'Engaging Neural Net...' : 'System Ready.'}
          </p>
          <div className="w-full h-1 bg-slate-800/80 rounded-full overflow-hidden relative shadow-[0_0_10px_rgba(56,189,248,0.1)]">
             <motion.div 
               className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-teal-400 via-[#38bdf8] to-[#fde047]"
               style={{ width: `${Math.min(progress, 100)}%` }}
               transition={{ type: "tween" }}
             />
             <motion.div 
               className="absolute top-0 bottom-0 w-12 bg-white/40 blur-[2px]"
               animate={{ left: ['-100%', '200%'] }}
               transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
             />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
