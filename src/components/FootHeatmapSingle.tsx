import React from "react";

interface FootHeatmapSingleProps {
  p1: number; // Sensor 1: Forefoot Left (앞발 L)
  p2: number; // Sensor 2: Forefoot Right (앞발 R)
  p3: number; // Sensor 3: Heel Left (뒤꿈치 L)
  p4: number; // Sensor 4: Heel Right (뒤꿈치 R)
}

export default function FootHeatmapSingle({ p1, p2, p3, p4 }: FootHeatmapSingleProps) {
  // Helper to get color status badge class
  const getBadgeStyle = (val: number) => {
    if (val > 80) return "bg-rose-500 text-white shadow-md shadow-rose-500/30 ring-2 ring-rose-400/50 animate-pulse";
    if (val > 70) return "bg-amber-500 text-white shadow-sm shadow-amber-500/30";
    if (val > 40) return "bg-emerald-500 text-white shadow-sm shadow-emerald-500/20";
    return "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20";
  };

  // Dynamic radius for heat spots based on pressure
  const r1 = Math.max(35, Math.min(75, 35 + p1 * 0.4));
  const r2 = Math.max(35, Math.min(75, 35 + p2 * 0.4));
  const r3 = Math.max(35, Math.min(75, 35 + p3 * 0.4));
  const r4 = Math.max(35, Math.min(75, 35 + p4 * 0.4));

  // Dynamic heat spot colors (0-100) matching the reference image's rainbow palette
  const getGradientStops = (val: number) => {
    if (val > 80) {
      return (
        <>
          <stop offset="0%" stopColor="#e60000" stopOpacity="0.95" />
          <stop offset="28%" stopColor="#ff5500" stopOpacity="0.9" />
          <stop offset="52%" stopColor="#ffea00" stopOpacity="0.85" />
          <stop offset="75%" stopColor="#00e676" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#0066ff" stopOpacity="0" />
        </>
      );
    } else if (val > 65) {
      return (
        <>
          <stop offset="0%" stopColor="#ff6600" stopOpacity="0.9" />
          <stop offset="35%" stopColor="#ffea00" stopOpacity="0.85" />
          <stop offset="68%" stopColor="#00e676" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#0066ff" stopOpacity="0" />
        </>
      );
    } else if (val > 40) {
      return (
        <>
          <stop offset="0%" stopColor="#ffea00" stopOpacity="0.85" />
          <stop offset="42%" stopColor="#00e676" stopOpacity="0.75" />
          <stop offset="78%" stopColor="#00b0ff" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#0022ff" stopOpacity="0" />
        </>
      );
    } else {
      return (
        <>
          <stop offset="0%" stopColor="#00e676" stopOpacity="0.65" />
          <stop offset="50%" stopColor="#00b0ff" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#0022ff" stopOpacity="0" />
        </>
      );
    }
  };

  return (
    <div className="flex flex-col items-center w-full bg-slate-900/5 rounded-2xl p-3 border border-slate-200/80 shadow-inner">
      {/* Header Badge */}
      <div className="flex justify-between items-center w-full mb-2 px-1">
        <span className="text-[10px] font-black text-slate-800 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
          오른발 깁스 실시간 하중 (압전소자 4채널)
        </span>
        <span className="text-[8px] font-mono font-bold bg-slate-900 text-white px-2 py-0.5 rounded-full">
          SINGLE FOOT HEATMAP
        </span>
      </div>

      {/* Main Single Foot Heatmap Display */}
      <div className="relative w-full max-w-[240px] aspect-[220/370] flex items-center justify-center my-1">
        <svg
          viewBox="0 0 220 370"
          className="w-full h-full overflow-visible drop-shadow-[0_12px_24px_rgba(0,18,60,0.22)]"
        >
          <defs>
            {/* Smooth Blur Filter for Heatmap Diffusion */}
            <filter id="heatmap-blur" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="9" />
            </filter>

            {/* Foot Contour Clip Path (Toes + Sole) matching image precisely */}
            <clipPath id="single-foot-clip">
              {/* Big Toe */}
              <ellipse cx="58" cy="32" rx="21" ry="23" transform="rotate(-12 58 32)" />
              {/* 2nd Toe */}
              <ellipse cx="106" cy="27" rx="14" ry="16" transform="rotate(-6 106 27)" />
              {/* 3rd Toe */}
              <ellipse cx="140" cy="40" rx="12" ry="13" />
              {/* 4th Toe */}
              <ellipse cx="166" cy="60" rx="10" ry="11" />
              {/* 5th Toe (Pinky) */}
              <ellipse cx="186" cy="86" rx="8" ry="9" />

              {/* Main Foot Sole Outline */}
              <path d="M 40,82 C 28,110 32,135 65,150 C 95,160 102,210 88,260 C 76,295 72,320 85,355 C 98,375 138,375 152,355 C 168,320 162,280 168,230 C 174,180 182,140 188,112 C 188,95 160,88 135,92 C 100,98 65,85 40,82 Z" />
            </clipPath>

            {/* Base Cold Background Gradient */}
            <linearGradient id="cold-base-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#001299" />
              <stop offset="35%" stopColor="#0044ff" />
              <stop offset="70%" stopColor="#0099ff" />
              <stop offset="100%" stopColor="#0022bb" />
            </linearGradient>

            {/* Sensor 1 Heat Gradient (Forefoot Left) */}
            <radialGradient id="grad-s1" cx="50%" cy="50%" r="50%">
              {getGradientStops(p1)}
            </radialGradient>

            {/* Sensor 2 Heat Gradient (Forefoot Right) */}
            <radialGradient id="grad-s2" cx="50%" cy="50%" r="50%">
              {getGradientStops(p2)}
            </radialGradient>

            {/* Sensor 3 Heat Gradient (Heel Left) */}
            <radialGradient id="grad-s3" cx="50%" cy="50%" r="50%">
              {getGradientStops(p3)}
            </radialGradient>

            {/* Sensor 4 Heat Gradient (Heel Right) */}
            <radialGradient id="grad-s4" cx="50%" cy="50%" r="50%">
              {getGradientStops(p4)}
            </radialGradient>
          </defs>

          {/* LAYER 1: Base Foot Background + Heatmap Spots (Clipped to Foot Shape) */}
          <g clipPath="url(#single-foot-clip)">
            {/* Deep Royal Blue Foot Background */}
            <rect x="0" y="0" width="220" height="370" fill="url(#cold-base-gradient)" />

            {/* Ambient Rainbow Midfoot / Toe Pressure Layers */}
            <ellipse cx="65" cy="55" rx="30" ry="25" fill="#00e676" opacity="0.45" filter="url(#heatmap-blur)" />
            <ellipse cx="105" cy="195" rx="22" ry="40" fill="#00e5ff" opacity="0.5" filter="url(#heatmap-blur)" />
            <path d="M 50,120 Q 90,140 140,120 Q 110,180 75,170 Z" fill="#ffea00" opacity="0.35" filter="url(#heatmap-blur)" />

            {/* Blurred Heatmap Layer for the 4 Piezo Sensors */}
            <g filter="url(#heatmap-blur)">
              {/* Sensor 1 (Forefoot Left - 앞L) */}
              <circle cx="75" cy="118" r={r1} fill="url(#grad-s1)" />

              {/* Sensor 2 (Forefoot Right - 앞R) */}
              <circle cx="145" cy="125" r={r2} fill="url(#grad-s2)" />

              {/* Sensor 3 (Heel Left - 뒤L) */}
              <circle cx="92" cy="320" r={r3} fill="url(#grad-s3)" />

              {/* Sensor 4 (Heel Right - 뒤R) */}
              <circle cx="138" cy="320" r={r4} fill="url(#grad-s4)" />
            </g>
          </g>

          {/* LAYER 2: Foot Silhouette Outline Contour (Matching reference image) */}
          <g fill="none" stroke="#000c42" strokeWidth="3.5">
            <ellipse cx="58" cy="32" rx="21" ry="23" transform="rotate(-12 58 32)" />
            <ellipse cx="106" cy="27" rx="14" ry="16" transform="rotate(-6 106 27)" />
            <ellipse cx="140" cy="40" rx="12" ry="13" />
            <ellipse cx="166" cy="60" rx="10" ry="11" />
            <ellipse cx="186" cy="86" rx="8" ry="9" />
            <path d="M 40,82 C 28,110 32,135 65,150 C 95,160 102,210 88,260 C 76,295 72,320 85,355 C 98,375 138,375 152,355 C 168,320 162,280 168,230 C 174,180 182,140 188,112 C 188,95 160,88 135,92 C 100,98 65,85 40,82 Z" />
          </g>

          {/* LAYER 3: Piezoelectric Sensor Pins (압전소자 위치 그대로 유지) */}
          {/* Sensor 1: Forefoot Left (75, 118) */}
          <g transform="translate(75, 118)">
            <circle r="12" fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.6" />
            <circle r="4" fill="#ffffff" />
            {p1 > 75 && <circle r="18" fill="none" stroke="#ff0000" strokeWidth="2" className="animate-ping" />}
          </g>

          {/* Sensor 2: Forefoot Right (145, 125) */}
          <g transform="translate(145, 125)">
            <circle r="12" fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.6" />
            <circle r="4" fill="#ffffff" />
            {p2 > 75 && <circle r="18" fill="none" stroke="#ff0000" strokeWidth="2" className="animate-ping" />}
          </g>

          {/* Sensor 3: Heel Left (92, 320) */}
          <g transform="translate(92, 320)">
            <circle r="12" fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.6" />
            <circle r="4" fill="#ffffff" />
            {p3 > 75 && <circle r="18" fill="none" stroke="#ff0000" strokeWidth="2" className="animate-ping" />}
          </g>

          {/* Sensor 4: Heel Right (138, 320) */}
          <g transform="translate(138, 320)">
            <circle r="12" fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.6" />
            <circle r="4" fill="#ffffff" />
            {p4 > 75 && <circle r="18" fill="none" stroke="#ff0000" strokeWidth="2" className="animate-ping" />}
          </g>
        </svg>

        {/* OVERLAY BADGES: The 4 Piezoelectric Sensor Live Value Badges */}
        {/* Sensor 1 (Forefoot Left) Badge */}
        <div className="absolute top-[28%] left-[2%] -translate-y-1/2">
          <div className={`px-2 py-0.5 rounded-lg text-[8px] font-sans font-bold flex items-center gap-1 border border-white/40 backdrop-blur-md ${getBadgeStyle(p1)}`}>
            <span>S1 앞L</span>
            <span className="font-mono font-black">{p1}%</span>
          </div>
        </div>

        {/* Sensor 2 (Forefoot Right) Badge */}
        <div className="absolute top-[30%] right-[2%] -translate-y-1/2">
          <div className={`px-2 py-0.5 rounded-lg text-[8px] font-sans font-bold flex items-center gap-1 border border-white/40 backdrop-blur-md ${getBadgeStyle(p2)}`}>
            <span>S2 앞R</span>
            <span className="font-mono font-black">{p2}%</span>
          </div>
        </div>

        {/* Sensor 3 (Heel Left) Badge */}
        <div className="absolute bottom-[10%] left-[2%]">
          <div className={`px-2 py-0.5 rounded-lg text-[8px] font-sans font-bold flex items-center gap-1 border border-white/40 backdrop-blur-md ${getBadgeStyle(p3)}`}>
            <span>S3 뒤L</span>
            <span className="font-mono font-black">{p3}%</span>
          </div>
        </div>

        {/* Sensor 4 (Heel Right) Badge */}
        <div className="absolute bottom-[10%] right-[2%]">
          <div className={`px-2 py-0.5 rounded-lg text-[8px] font-sans font-bold flex items-center gap-1 border border-white/40 backdrop-blur-md ${getBadgeStyle(p4)}`}>
            <span>S4 뒤R</span>
            <span className="font-mono font-black">{p4}%</span>
          </div>
        </div>
      </div>

      {/* Heatmap Color Scale Indicator Bar */}
      <div className="w-full mt-2 pt-2 border-t border-slate-200/80">
        <div className="flex justify-between items-center text-[7.5px] font-mono text-slate-500 mb-1">
          <span>0% (저하중/안전)</span>
          <span>50% (보통)</span>
          <span>100% (고하중/위험)</span>
        </div>
        <div className="w-full h-2 rounded-full overflow-hidden bg-gradient-to-r from-blue-600 via-cyan-400 via-emerald-400 via-yellow-400 via-orange-500 to-rose-600 shadow-inner" />
      </div>
    </div>
  );
}
