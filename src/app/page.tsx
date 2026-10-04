// src/app/page.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { 
  Mic, 
  MicOff, 
  Settings2, 
  Volume2, 
  VolumeX,
  Maximize, 
  Minimize, 
  Globe, 
  Sparkles, 
  Award, 
  RotateCcw,
  Sliders,
  Music
} from "lucide-react";
import { 
  playBallBounceSound, 
  playBubblePop, 
  playCelebrationChime, 
  BallSoundTheme 
} from "@/utils/audioAlerts";

type ThemeType = "mascot" | "glass" | "neon" | "bubbles" | "emoji" | "numbers";
type LanguageType = "en" | "es" | "bi";

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  angle: number;
  va: number;
  id: number;
  emoji?: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  color: string;
}

// Classroom Alert Phrases by Language Mode
const ALERT_PHRASES: Record<LanguageType, { primary: string; sub?: string }[]> = {
  en: [
    { primary: "Quiet Please!" },
    { primary: "Too Noisy!" },
    { primary: "Ninja Mode Activated!" },
    { primary: "Shhhhh!" },
    { primary: "Indoor Voices!" },
    { primary: "Mrs Jimenez Said shhhhh!" }
  ],
  es: [
    { primary: "¡Silencio Por Favor!" },
    { primary: "¡Mucho Ruido!" },
    { primary: "¡Modo Ninja Activado!" },
    { primary: "¡Shhhhh!" },
    { primary: "¡Voz De Biblioteca!" },
    { primary: "Mrs Jimenez dijo shhhhh!" }
  ],
  bi: [
    { primary: "¡Silencio Por Favor!", sub: "Quiet Please!" },
    { primary: "¡Mucho Ruido!", sub: "Too Noisy!" },
    { primary: "¡Modo Ninja Activado!", sub: "Ninja Mode On!" },
    { primary: "¡Shhhhh!", sub: "Whisper Voices!" },
    { primary: "¡Voz De Biblioteca!", sub: "Indoor Voices!" },
    { primary: "Mrs Jimenez dijo shhhhh!", sub: "Mrs Jimenez Said shhhhh!" }
  ]
};

const EMOJIS = ["😎", "🥳", "🐶", "⭐", "🚀", "🎉", "🔥", "🦄", "⚡", "✨"];
const NEON_COLORS = ["#00F5FF", "#FF007F", "#39FF14", "#FFE600", "#BF00FF"];
const GLASS_COLORS = [
  "rgba(56, 189, 248, 0.7)",
  "rgba(168, 85, 247, 0.7)",
  "rgba(244, 63, 94, 0.7)",
  "rgba(234, 179, 8, 0.7)"
];

export default function Home() {
  const [isMicOn, setIsMicOn] = useState(false);
  const [theme, setTheme] = useState<ThemeType>("mascot");
  const [language, setLanguage] = useState<LanguageType>("bi");
  const [sensitivity, setSensitivity] = useState<number>(55);
  const [noiseThreshold, setNoiseThreshold] = useState<number>(75);
  const [ballCount, setBallCount] = useState<number>(30);
  
  // Ball Sound Settings
  const [bounceSoundsEnabled, setBounceSoundsEnabled] = useState<boolean>(true);
  const [soundTheme, setSoundTheme] = useState<BallSoundTheme>("thud");
  const [bounceVolume, setBounceVolume] = useState<number>(45);

  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const [currentVolume, setCurrentVolume] = useState<number>(0);
  const [noiseAlert, setNoiseAlert] = useState<{ primary: string; sub?: string } | null>(null);
  const [quietStreak, setQuietStreak] = useState<number>(0);
  const [stars, setStars] = useState<number>(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mascotImgRef = useRef<HTMLImageElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const ballsRef = useRef<Ball[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameId = useRef<number>(0);
  const pointerPosRef = useRef<{ x: number; y: number } | null>(null);
  const lastSoundTimeRef = useRef<number>(0);
  const alertCooldownRef = useRef<number>(0);

  // Load Mascot Image
  useEffect(() => {
    const img = new Image();
    img.src = "/mascot.png";
    img.onload = () => {
      mascotImgRef.current = img;
    };
  }, []);

  // Initialize Ball Array with Dynamic Sizes & Varied Mascot Dimensions
  useEffect(() => {
    const canvas = canvasRef.current;
    const w = canvas ? canvas.width : window.innerWidth;
    const h = canvas ? canvas.height : window.innerHeight;

    const balls: Ball[] = [];
    for (let i = 0; i < ballCount; i++) {
      let radius: number;

      if (theme === "mascot") {
        const sizeTier = i % 10;
        if (sizeTier === 0) {
          radius = Math.random() * 12 + 66; 
        } else if (sizeTier < 4) {
          radius = Math.random() * 10 + 48; 
        } else {
          radius = Math.random() * 8 + 36;  
        }
      } else if (theme === "bubbles") {
        radius = Math.random() * 28 + 24;
      } else {
        radius = Math.random() * 22 + 28;
      }

      balls.push({
        id: i,
        x: Math.random() * (w - radius * 2) + radius,
        y: Math.random() * (h - radius * 2) + radius,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        radius,
        color:
          theme === "neon"
            ? NEON_COLORS[i % NEON_COLORS.length]
            : theme === "glass"
            ? GLASS_COLORS[i % GLASS_COLORS.length]
            : "#f59e0b",
        angle: Math.random() * Math.PI * 2,
        va: (Math.random() - 0.5) * 0.04,
        emoji: EMOJIS[i % EMOJIS.length]
      });
    }
    ballsRef.current = balls;
  }, [ballCount, theme]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const toggleMic = async () => {
    if (isMicOn) {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      setIsMicOn(false);
      setCurrentVolume(0);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioCtx();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.6;

        const source = ctx.createMediaStreamSource(stream);
        source.connect(analyser);

        mediaStreamRef.current = stream;
        audioContextRef.current = ctx;
        analyserRef.current = analyser;
        setIsMicOn(true);
      } catch {
        alert("Please enable microphone permissions in your browser.");
      }
    }
  };

  // Quiet Streak Tracker
  useEffect(() => {
    const interval = setInterval(() => {
      if (isMicOn) {
        if (currentVolume < noiseThreshold) {
          setQuietStreak((prev) => {
            const next = prev + 1;
            if (next % 30 === 0 && next > 0) {
              setStars((s) => s + 1);
              playCelebrationChime();
              confetti({ particleCount: 35, spread: 60, origin: { y: 0.85 } });
            }
            return next;
          });
        } else {
          setQuietStreak(0);
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isMicOn, currentVolume, noiseThreshold]);

  // Main Canvas & Physics Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const freqData = new Uint8Array(128);

    const triggerBounceAudio = (velocity: number, ballId: number) => {
      if (!bounceSoundsEnabled) return;
      const now = performance.now();
      if (now - lastSoundTimeRef.current > 25 && velocity > 2.5) {
        lastSoundTimeRef.current = now;
        playBallBounceSound(soundTheme, velocity, ballId, bounceVolume / 100);
      }
    };

    const render = () => {
      let measuredVol = 0;
      if (analyserRef.current && isMicOn) {
        analyserRef.current.getByteFrequencyData(freqData);
        let sum = 0;
        for (let i = 0; i < freqData.length; i++) {
          sum += freqData[i];
        }
        const rawVol = (sum / freqData.length / 255) * 100;
        measuredVol = Math.min(100, Math.round(rawVol * (sensitivity / 35)));
        setCurrentVolume(measuredVol);

        // Bilingual / Monolingual Noise Alert Trigger
        if (measuredVol > noiseThreshold && Date.now() > alertCooldownRef.current) {
          alertCooldownRef.current = Date.now() + 2400;
          const pool = ALERT_PHRASES[language];
          const chosen = pool[Math.floor(Math.random() * pool.length)];
          setNoiseAlert(chosen);

          setTimeout(() => {
            setNoiseAlert(null);
          }, 1800);
        }
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const impulse = measuredVol > 15 ? (measuredVol / 100) * 20 : 0;
      const gravity = theme === "bubbles" ? -0.2 : 0.38;
      const friction = 0.99;
      const balls = ballsRef.current;

      for (let i = 0; i < balls.length; i++) {
        const b = balls[i];

        const massFactor = Math.pow(b.radius / 36, 1.4);
        if (impulse > 0) {
          const force = (Math.random() * impulse + 1) / massFactor;
          if (theme === "bubbles") {
            b.vy += force * 0.3;
          } else {
            b.vy -= force * 0.85;
          }
          b.vx += ((Math.random() - 0.5) * impulse * 0.8) / massFactor;
        }

        b.vy += gravity;
        b.vx *= friction;
        b.vy *= friction;

        b.x += b.vx;
        b.y += b.vy;
        b.angle += b.va;

        // Wall Collisions
        if (b.x - b.radius < 0) {
          const speed = Math.abs(b.vx);
          b.x = b.radius;
          b.vx = -b.vx * 0.75;
          triggerBounceAudio(speed, b.id);
        } else if (b.x + b.radius > canvas.width) {
          const speed = Math.abs(b.vx);
          b.x = canvas.width - b.radius;
          b.vx = -b.vx * 0.75;
          triggerBounceAudio(speed, b.id);
        }

        if (b.y - b.radius < 0) {
          const speed = Math.abs(b.vy);
          b.y = b.radius;
          b.vy = -b.vy * 0.75;
          if (theme === "bubbles") {
            b.y = canvas.height + b.radius;
          } else {
            triggerBounceAudio(speed, b.id);
          }
        } else if (b.y + b.radius > canvas.height) {
          const speed = Math.abs(b.vy);
          b.y = canvas.height - b.radius;
          b.vy = -b.vy * 0.75;
          triggerBounceAudio(speed, b.id);
        }

        // Pointer Interaction
        if (pointerPosRef.current) {
          const dx = b.x - pointerPosRef.current.x;
          const dy = b.y - pointerPosRef.current.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 130 && dist > 0) {
            const force = (130 - dist) / 130;
            b.vx += (dx / dist) * force * 5.5;
            b.vy += (dy / dist) * force * 5.5;
            triggerBounceAudio(force * 10, b.id);
          }
        }

        // Ball Collision Physics
        for (let j = i + 1; j < balls.length; j++) {
          const b2 = balls[j];
          const dx = b2.x - b.x;
          const dy = b2.y - b.y;
          const dist = Math.hypot(dx, dy);
          const minDist = b.radius + b2.radius;

          if (dist < minDist && dist > 0) {
            const overlap = minDist - dist;
            const nx = dx / dist;
            const ny = dy / dist;

            b.x -= nx * overlap * 0.5;
            b.y -= ny * overlap * 0.5;
            b2.x += nx * overlap * 0.5;
            b2.y += ny * overlap * 0.5;

            const m1 = b.radius * b.radius;
            const m2 = b2.radius * b2.radius;

            const kx = b.vx - b2.vx;
            const ky = b.vy - b2.vy;
            const p = (2 * (nx * kx + ny * ky)) / (m1 + m2);

            b.vx -= p * m2 * nx * 0.78;
            b.vy -= p * m2 * ny * 0.78;
            b2.vx += p * m1 * nx * 0.78;
            b2.vy += p * m1 * ny * 0.78;

            const impactSpeed = Math.abs(p * (m1 + m2) * 0.5);
            if (impactSpeed > 3.5) {
              triggerBounceAudio(impactSpeed, b.id);
            }
          }
        }

        // Render Theme
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.angle);

        if (theme === "mascot") {
          ctx.beginPath();
          ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
          ctx.fillStyle = "#1e293b";
          ctx.fill();
          ctx.lineWidth = Math.max(2.5, b.radius * 0.08);
          ctx.strokeStyle = "#eab308";
          ctx.stroke();

          if (mascotImgRef.current && mascotImgRef.current.complete) {
            ctx.drawImage(
              mascotImgRef.current,
              -b.radius * 0.88,
              -b.radius * 0.88,
              b.radius * 1.76,
              b.radius * 1.76
            );
          } else {
            ctx.fillStyle = "#ffffff";
            ctx.font = `bold ${Math.round(b.radius * 0.65)}px sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("🐾", 0, 0);
          }
        } else if (theme === "glass") {
          const grad = ctx.createRadialGradient(
            -b.radius * 0.3,
            -b.radius * 0.3,
            b.radius * 0.1,
            0,
            0,
            b.radius
          );
          grad.addColorStop(0, "rgba(255, 255, 255, 0.9)");
          grad.addColorStop(0.3, b.color);
          grad.addColorStop(1, "rgba(15, 23, 42, 0.85)");
          ctx.beginPath();
          ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();
        } else if (theme === "neon") {
          ctx.shadowBlur = 18;
          ctx.shadowColor = b.color;
          ctx.beginPath();
          ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
          ctx.fillStyle = b.color;
          ctx.fill();
          ctx.shadowBlur = 0;
        } else if (theme === "bubbles") {
          ctx.beginPath();
          ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(147, 197, 253, 0.25)";
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(-b.radius * 0.35, -b.radius * 0.35, b.radius * 0.22, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
          ctx.fill();
        } else if (theme === "emoji") {
          ctx.font = `${Math.round(b.radius * 1.35)}px sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(b.emoji || "⭐", 0, 0);
        } else if (theme === "numbers") {
          ctx.beginPath();
          ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
          ctx.fillStyle = "#dc2626";
          ctx.fill();
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = "#ffffff";
          ctx.stroke();

          ctx.fillStyle = "#ffffff";
          ctx.font = `bold ${Math.round(b.radius * 0.68)}px sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(String(b.id + 1), 0, 2);
        }

        ctx.restore();
      }

      // Particles
      for (let pIdx = particlesRef.current.length - 1; pIdx >= 0; pIdx--) {
        const p = particlesRef.current[pIdx];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.03;
        if (p.alpha <= 0) {
          particlesRef.current.splice(pIdx, 1);
          continue;
        }
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animationFrameId.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId.current);
      window.removeEventListener("resize", resize);
    };
  }, [isMicOn, sensitivity, noiseThreshold, theme, bounceSoundsEnabled, soundTheme, bounceVolume, language]);

  // Touch & Pointer Interaction
  const handleCanvasInteraction = (clientX: number, clientY: number) => {
    pointerPosRef.current = { x: clientX, y: clientY };
    setTimeout(() => {
      pointerPosRef.current = null;
    }, 200);

    if (theme === "bubbles") {
      const balls = ballsRef.current;
      for (let i = balls.length - 1; i >= 0; i--) {
        const b = balls[i];
        const dist = Math.hypot(b.x - clientX, b.y - clientY);
        if (dist <= b.radius) {
          playBubblePop(0.5);
          for (let k = 0; k < 10; k++) {
            particlesRef.current.push({
              x: b.x,
              y: b.y,
              vx: (Math.random() - 0.5) * 5,
              vy: (Math.random() - 0.5) * 5,
              radius: Math.random() * 3 + 2,
              alpha: 1,
              color: "#93c5fd"
            });
          }
          b.y = window.innerHeight + b.radius;
          b.x = Math.random() * window.innerWidth;
          b.vy = -Math.random() * 3 - 1;
          break;
        }
      }
    }
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none text-white">
      <div 
        className={`absolute inset-0 transition-opacity duration-700 pointer-events-none ${
          theme === "bubbles" 
            ? "bg-gradient-to-b from-blue-950 via-slate-900 to-indigo-950" 
            : theme === "mascot"
            ? "bg-radial from-slate-900 via-zinc-950 to-black"
            : "bg-gradient-to-br from-slate-950 via-slate-900 to-black"
        }`} 
      />

      <canvas
        ref={canvasRef}
        onMouseDown={(e) => handleCanvasInteraction(e.clientX, e.clientY)}
        onTouchStart={(e) => {
          if (e.touches[0]) {
            handleCanvasInteraction(e.touches[0].clientX, e.touches[0].clientY);
          }
        }}
        className="absolute inset-0 z-0 cursor-pointer"
      />

      {/* Bilingual / Monolingual Noise Alert Banner */}
      {noiseAlert && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 transition-all duration-300">
          <div className="flex flex-col items-center gap-2 px-8 md:px-12 py-6 rounded-3xl bg-red-600/90 backdrop-blur-md shadow-2xl border-4 border-white/80 animate-bounce">
            <h1 className="text-3xl md:text-6xl font-black tracking-wide text-white uppercase text-center drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)]">
              {noiseAlert.primary}
            </h1>
            {noiseAlert.sub && (
              <h2 className="text-xl md:text-3xl font-extrabold tracking-wider text-amber-300 uppercase text-center drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                {noiseAlert.sub}
              </h2>
            )}
          </div>
        </div>
      )}

      {/* Header HUD */}
      <header className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between">
        <div className="flex items-center gap-3 bg-slate-900/70 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 shadow-lg">
          <button
            onClick={toggleMic}
            className={`p-3 rounded-xl transition-all duration-300 flex items-center justify-center ${
              isMicOn 
                ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30" 
                : "bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30"
            }`}
          >
            {isMicOn ? <Mic className="w-5 h-5 animate-pulse" /> : <MicOff className="w-5 h-5" />}
          </button>

          <div className="flex flex-col gap-1 w-32 md:w-48">
            <div className="flex justify-between text-xs font-semibold text-slate-300">
              <span className="flex items-center gap-1">
                <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                {isMicOn ? `${currentVolume}%` : "OFF"}
              </span>
              <span className="text-slate-400">Limit: {noiseThreshold}%</span>
            </div>
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden border border-white/5">
              <div
                className={`h-full transition-all duration-100 ${
                  currentVolume > noiseThreshold
                    ? "bg-red-500 shadow-md shadow-red-500"
                    : currentVolume > noiseThreshold * 0.75
                    ? "bg-amber-400"
                    : "bg-emerald-400"
                }`}
                style={{ width: `${currentVolume}%` }}
              />
            </div>
          </div>
        </div>

        {/* Quiet Streak Gamification */}
        <div className="hidden sm:flex items-center gap-4 bg-slate-900/70 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-white/10 shadow-lg">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              {language === "es" ? "Racha Silenciosa" : language === "bi" ? "Racha / Streak" : "Quiet Streak"}
            </span>
            <span className="px-2 py-0.5 bg-slate-800 text-amber-400 font-mono font-bold rounded-lg text-sm border border-amber-400/20">
              {quietStreak}s
            </span>
          </div>

          <div className="h-4 w-px bg-white/10" />

          <div className="flex items-center gap-1.5">
            <Award className="w-4 h-4 text-yellow-400" />
            <span className="font-bold text-sm text-yellow-300">{stars}</span>
          </div>
        </div>

        {/* Top Control Buttons */}
        <div className="flex items-center gap-2">
          {/* Quick Toggle Ball Bounce Sounds */}
          <button
            onClick={() => setBounceSoundsEnabled(!bounceSoundsEnabled)}
            className={`p-3 rounded-2xl border border-white/10 backdrop-blur-md transition-all shadow-lg ${
              bounceSoundsEnabled
                ? "bg-slate-900/70 text-cyan-400 hover:text-cyan-300"
                : "bg-slate-900/50 text-slate-500 hover:text-slate-400"
            }`}
            title={bounceSoundsEnabled ? "Mute Ball Sounds" : "Unmute Ball Sounds"}
          >
            {bounceSoundsEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-3 bg-slate-900/70 backdrop-blur-md hover:bg-slate-800/80 rounded-2xl border border-white/10 text-slate-300 hover:text-white transition-all shadow-lg"
          >
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </button>

          <button
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className="p-3 bg-slate-900/70 backdrop-blur-md hover:bg-slate-800/80 rounded-2xl border border-white/10 text-slate-300 hover:text-white transition-all shadow-lg flex items-center gap-2"
          >
            <Settings2 className="w-5 h-5 text-cyan-400" />
            <span className="hidden md:inline font-semibold text-sm">
              {language === "es" ? "Ajustes" : language === "bi" ? "Ajustes / Settings" : "Settings"}
            </span>
          </button>
        </div>
      </header>

      {/* Slide-out Settings */}
      {isSettingsOpen && (
        <aside className="absolute right-4 top-20 z-30 w-80 md:w-96 bg-slate-900/95 backdrop-blur-xl border border-white/15 rounded-3xl p-6 shadow-2xl text-slate-200 transition-all duration-300 max-h-[85vh] overflow-y-auto">
          <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
            <h2 className="font-bold text-lg text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-cyan-400" />
              {language === "es" ? "Configuración" : language === "bi" ? "Ajustes / Settings" : "Settings"}
            </h2>
            <button
              onClick={() => setIsSettingsOpen(false)}
              className="text-slate-400 hover:text-white text-sm px-2 py-1 rounded-lg bg-slate-800"
            >
              ✕
            </button>
          </div>

          <div className="space-y-6">
            {/* Language Selection: English, Spanish, Bilingual */}
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2 mb-2">
                <Globe className="w-4 h-4 text-cyan-400" />
                {language === "es" ? "Idioma de Mensajes" : language === "bi" ? "Idioma / Language Mode" : "Message Language"}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "bi", label: "🌐 Bilingüe" },
                  { id: "es", label: "Español" },
                  { id: "en", label: "English" }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setLanguage(item.id as LanguageType)}
                    className={`py-2 px-2 rounded-xl font-medium text-xs transition-all text-center ${
                      language === item.id
                        ? "bg-cyan-500 text-white font-bold shadow-lg shadow-cyan-500/25"
                        : "bg-slate-800 hover:bg-slate-700/80 text-slate-300"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Ball Bounce Sound Theme Selection */}
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2 mb-2">
                <Music className="w-4 h-4 text-cyan-400" />
                {language === "es" ? "Sonidos de Rebote" : language === "bi" ? "Sonidos / Bounce Sounds" : "Ball Bounce Sounds"}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "thud", label: "🎾 Thud" },
                  { id: "marimba", label: "🎵 Marimba" },
                  { id: "retro", label: "🕹️ 8-Bit" },
                  { id: "wood", label: "🪵 Madera" },
                  { id: "water", label: "💧 Gotas" },
                  { id: "piano", label: "🎹 Piano" }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setSoundTheme(item.id as BallSoundTheme);
                      playBallBounceSound(item.id as BallSoundTheme, 10, 0, bounceVolume / 100);
                    }}
                    className={`py-2 px-2 rounded-xl font-medium text-xs transition-all text-center ${
                      soundTheme === item.id && bounceSoundsEnabled
                        ? "bg-cyan-500 text-white font-bold shadow-lg shadow-cyan-500/25"
                        : "bg-slate-800 hover:bg-slate-700/80 text-slate-300"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Bounce Sound Volume */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {language === "es" ? "Volumen del Rebote" : language === "bi" ? "Volumen / Bounce Volume" : "Bounce Volume"}
                </label>
                <span className="font-mono text-cyan-400 text-xs font-bold">{bounceVolume}%</span>
              </div>
              <input
                type="range"
                min="5"
                max="100"
                value={bounceVolume}
                onChange={(e) => setBounceVolume(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            {/* Mascot & Ball Themes */}
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                {language === "es" ? "Temas & Mascota" : language === "bi" ? "Temas / Themes" : "Themes & Mascot"}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "mascot", label: "Bulldog 🐾" },
                  { id: "glass", label: "3D Glass" },
                  { id: "neon", label: "Neon" },
                  { id: "bubbles", label: "Bubbles" },
                  { id: "emoji", label: "Emoji" },
                  { id: "numbers", label: "Numbers" }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setTheme(item.id as ThemeType)}
                    className={`py-2 px-2 rounded-xl font-medium text-xs transition-all text-center ${
                      theme === item.id
                        ? "bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/25"
                        : "bg-slate-800 hover:bg-slate-700/80 text-slate-300"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sensitivity Slider */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {language === "es" ? "Sensibilidad del Micrófono" : language === "bi" ? "Sensibilidad / Mic Sensitivity" : "Mic Sensitivity"}
                </label>
                <span className="font-mono text-cyan-400 text-xs font-bold">{sensitivity}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={sensitivity}
                onChange={(e) => setSensitivity(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            {/* Noise Limit Threshold Slider */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {language === "es" ? "Límite de Ruido Máximo" : language === "bi" ? "Límite / Noise Threshold" : "Noise Threshold Limit"}
                </label>
                <span className="font-mono text-red-400 text-xs font-bold">{noiseThreshold}%</span>
              </div>
              <input
                type="range"
                min="30"
                max="95"
                value={noiseThreshold}
                onChange={(e) => setNoiseThreshold(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-red-400"
              />
            </div>

            {/* Ball Count Slider */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {language === "es" ? "Cantidad de Pelotas" : language === "bi" ? "Pelotas / Ball Count" : "Total Balls"}
                </label>
                <span className="font-mono text-amber-400 text-xs font-bold">{ballCount}</span>
              </div>
              <input
                type="range"
                min="15"
                max="80"
                value={ballCount}
                onChange={(e) => setBallCount(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
            </div>

            <button
              onClick={() => {
                setQuietStreak(0);
                setStars(0);
              }}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              {language === "es" ? "Reiniciar Contador de Estrellas" : language === "bi" ? "Reiniciar / Reset Stars" : "Reset Streak & Stars"}
            </button>
          </div>
        </aside>
      )}

      {/* Mic Enable Overlay */}
      {!isMicOn && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="bg-slate-900/85 backdrop-blur-md p-6 md:p-8 rounded-3xl border border-white/10 max-w-sm text-center shadow-2xl pointer-events-auto">
            <h2 className="text-xl md:text-2xl font-bold text-white mb-2">
              {language === "es" 
                ? "Control de Ruido Escolar" 
                : language === "bi" 
                ? "Control de Ruido / Noise Monitor" 
                : "Classroom Noise Monitor"}
            </h2>
            <p className="text-sm text-slate-300 mb-6">
              {language === "es" 
                ? "Haz clic para activar el micrófono. ¡Las pelotas y tu mascota rebotan y avisan cuando haya mucho ruido!"
                : language === "bi"
                ? "Activa el micrófono. ¡Las pelotas rebotan y alertan en español e inglés cuando hay ruido!\nEnable the mic to monitor sound."
                : "Click below to turn on the microphone. The balls and mascot bounce when students make sound!"}
            </p>
            <button
              onClick={toggleMic}
              className="w-full py-3.5 px-6 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-base shadow-xl shadow-cyan-500/25 transition-all flex items-center justify-center gap-2"
            >
              <Mic className="w-5 h-5" />
              {language === "es" 
                ? "Iniciar Micrófono" 
                : language === "bi" 
                ? "Iniciar Micrófono / Start Mic" 
                : "Enable Microphone"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}