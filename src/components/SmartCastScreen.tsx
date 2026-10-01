import React, { useState, useEffect } from "react";
import { 
  ChevronLeft, 
  Activity, 
  Compass, 
  Sliders, 
  Sparkles, 
  Bluetooth, 
  Battery, 
  Flame, 
  Cpu, 
  Bell,
  FileText,
  TrendingUp,
  Usb,
  Terminal,
  AlertTriangle,
  CheckCircle2,
  Save,
  Trash2,
  Info
} from "lucide-react";
import { motion } from "motion/react";
import { AppState, ChatMessage } from "../types";
import { tokens } from "../ui/theme";
import FootHeatmapSingle from "./FootHeatmapSingle";
import RecoverySignal from "./ui/RecoverySignal";

const PROFILE_IMAGE = "/src/assets/images/profile.jpg";

// Local storage saved session interface
interface SavedSession {
  id: string;
  date: string;
  weekNumber: number;
  stepCount: number;
  balanceScore: number;
  leftRatio: number;
  rightRatio: number;
  speed: number;
  lsi: number;
  similarity: number;
  leftStepCm: number;
  rightStepCm: number;
  risk: "낮음" | "보통" | "높음";
}

interface SmartCastScreenProps {
  key?: string | number;
  screenName: string;
  state: AppState;
  onTightnessChange: (val: number) => void;
  setScreenName: (scr: string) => void;
  heatTherapy: number;
  setHeatTherapy: (l: number) => void;
  muscleStim: boolean;
  setMuscleStim: (b: boolean) => void;
  stimIntensity: number;
  setStimIntensity: (v: number) => void;
  
  // Chat states
  chatMessages?: ChatMessage[];
  chatInput?: string;
  setChatInput?: (s: string) => void;
  onSendMessage?: (txt: string) => void;
  isAiLoading?: boolean;
  presetQuestions?: { label: string; q: string }[];

  // Simulator & Manual Pressure controls
  onToggleSimulateWalking?: () => void;
  onTriggerPressureAlert?: (isHazard: boolean) => void;
  onAddManualSteps?: () => void;
  onToggleIoTConnection?: () => void;
  onUpdateManualPressure?: (fore: number, mid: number, heel: number) => void;
  onResetSampleData?: () => void;

  // Pain handlers
  onPainScoreChange?: (score: number) => void;
  onPainStatusChange?: (status: "happy" | "neutral" | "bad" | "cry") => void;

  // Bluetooth specific handlers
  onStartBluetoothScan?: () => void;
  onConnectBluetoothDevice?: (name: string) => void;
  onDisconnectBluetooth?: () => void;

  // Serial specific props
  isSerialSupported?: boolean;
  isSerialConnected?: boolean;
  onConnectSerial?: () => void;
  onDisconnectSerial?: () => void;
  serialError?: string;
  latestRawSerialData?: string;
}

export default function SmartCastScreen({
  screenName,
  state,
  onTightnessChange,
  setScreenName,
  heatTherapy,
  setHeatTherapy,
  muscleStim,
  setMuscleStim,
  stimIntensity,
  setStimIntensity,
  
  // Chat states
  chatMessages,
  chatInput,
  setChatInput,
  onSendMessage,
  isAiLoading,
  presetQuestions,

  // Simulator controls
  onToggleSimulateWalking,
  onTriggerPressureAlert,
  onAddManualSteps,
  onToggleIoTConnection,
  onUpdateManualPressure,
  onResetSampleData,

  // Pain handlers
  onPainScoreChange,
  onPainStatusChange,

  // Bluetooth specific handlers
  onStartBluetoothScan,
  onConnectBluetoothDevice,
  onDisconnectBluetooth,

  // Serial specific props
  isSerialSupported = false,
  isSerialConnected = false,
  onConnectSerial,
  onDisconnectSerial,
  serialError,
  latestRawSerialData = ""
}: SmartCastScreenProps) {
  const [showArduinoCode, setShowArduinoCode] = useState(false);
  const [savedRecords, setSavedRecords] = useState<SavedSession[]>([]);
  const [recordsTab, setRecordsTab] = useState<"daily" | "weekly" | "longterm">("daily");

  // Initial mock history for Feature 15 (Data Storage)
  const defaultMockHistory: SavedSession[] = [
    { id: "rec-1", date: "2026-06-20 10:14", weekNumber: 1, stepCount: 1205, balanceScore: 72, leftRatio: 64, rightRatio: 36, speed: 0.7, lsi: 72, similarity: 70, leftStepCm: 62, rightStepCm: 48, risk: "높음" },
    { id: "rec-2", date: "2026-06-27 15:30", weekNumber: 2, stepCount: 2450, balanceScore: 79, leftRatio: 60, rightRatio: 40, speed: 0.9, lsi: 80, similarity: 78, leftStepCm: 63, rightStepCm: 52, risk: "보통" },
    { id: "rec-3", date: "2026-07-04 11:22", weekNumber: 3, stepCount: 4120, balanceScore: 86, leftRatio: 53, rightRatio: 47, speed: 1.1, lsi: 88, similarity: 86, leftStepCm: 64, rightStepCm: 56, risk: "보통" },
    { id: "rec-4", date: "2026-07-11 17:45", weekNumber: 4, stepCount: 5421, balanceScore: 92, leftRatio: 48, rightRatio: 52, speed: 1.25, lsi: 94, similarity: 91, leftStepCm: 65, rightStepCm: 58, risk: "낮음" }
  ];

  // Initialize and load records from localStorage
  useEffect(() => {
    const local = localStorage.getItem("moongs_gait_sessions");
    if (local) {
      try {
        setSavedRecords(JSON.parse(local));
      } catch (e) {
        setSavedRecords(defaultMockHistory);
      }
    } else {
      setSavedRecords(defaultMockHistory);
      localStorage.setItem("moongs_gait_sessions", JSON.stringify(defaultMockHistory));
    }
  }, []);

  // Save active gait session handler
  const handleSaveActiveSession = () => {
    const now = new Date();
    const dateStr = now.toISOString().replace("T", " ").substring(0, 16);
    
    const newRecord: SavedSession = {
      id: `rec-${Date.now()}`,
      date: dateStr,
      weekNumber: 4, // Current active week is surgical week 4
      stepCount: state.gaitMetrics.stepCount,
      balanceScore: state.gaitMetrics.balanceScore,
      leftRatio: state.gaitMetrics.weightDistributionLeft,
      rightRatio: state.gaitMetrics.weightDistributionRight,
      speed: state.gaitMetrics.avgSpeedKmh / 3.6, // km/h to m/s approximation
      lsi: state.gaitMetrics.lsiSymmetry,
      similarity: state.gaitMetrics.gaitSimilarity,
      leftStepCm: 65,
      rightStepCm: 58 + Math.round((state.gaitMetrics.balanceScore - 80) * 0.5), // dynamic based on recovery balance
      risk: state.sensorData.rightFoot.heel > 80 ? "높음" : state.gaitMetrics.balanceScore < 80 ? "보통" : "낮음"
    };

    const updated = [newRecord, ...savedRecords];
    setSavedRecords(updated);
    localStorage.setItem("moongs_gait_sessions", JSON.stringify(updated));
    alert(`💾 [데이터 저장 성공] ${dateStr} 기준 보행 데이터가 성공적으로 저장되었습니다!`);
  };

  // Delete saved session
  const handleDeleteRecord = (id: string) => {
    const updated = savedRecords.filter(r => r.id !== id);
    setSavedRecords(updated);
    localStorage.setItem("moongs_gait_sessions", JSON.stringify(updated));
  };

  // State calculations for dynamic visual metrics
  const lsiVal = state.gaitMetrics.lsiSymmetry;
  const similarityVal = state.gaitMetrics.gaitSimilarity;
  const currentSpeedMs = parseFloat((state.gaitMetrics.avgSpeedKmh / 3.6).toFixed(2));
  const isWalkingActive = state.isSimulatingWalking;

  // Feature 11: Re-injury Risk Analysis value
  let reinjuryRisk: "낮음" | "보통" | "높음" = "낮음";
  if (state.sensorData.rightFoot.heel > 80 || state.gaitMetrics.balanceScore < 75) {
    reinjuryRisk = "높음";
  } else if (state.sensorData.rightFoot.heel > 70 || state.gaitMetrics.balanceScore < 88) {
    reinjuryRisk = "보통";
  }

  // Feature 5: AI Return to Life Traffic Light color selection
  let trafficLight: "green" | "yellow" | "red" = "yellow";
  if (reinjuryRisk === "높음") {
    trafficLight = "red";
  } else if (state.gaitMetrics.balanceScore > 90 && state.sensorData.rightFoot.heel < 72) {
    trafficLight = "green";
  }

  // Transition config
  const transitionConfig = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
    transition: { ease: "easeInOut", duration: 0.2 }
  };

  // Foot heatmap color utility (0-100 values)
  const getHeatmapColorClass = (val: number, isRight: boolean) => {
    if (val === 0) return "bg-slate-100 text-slate-400";
    if (isRight && val > 80) return "bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/20"; // overload
    if (isRight && val > 70) return "bg-amber-500 text-white shadow-md shadow-amber-500/20";
    if (val > 45) return "bg-indigo-500 text-white shadow-md shadow-indigo-500/20";
    return "bg-emerald-500 text-white shadow-md shadow-emerald-500/20";
  };

  switch (screenName) {
    // ----------------------------------------------------
    // SCREEN 1: HOME (Heatmap, Traffic Light, Risk, Bluetooth)
    // ----------------------------------------------------
    case "home":
      return (
        <motion.div {...transitionConfig} className="flex flex-col h-full text-slate-800 space-y-4 overflow-y-auto pb-24 px-0.5">
          {/* Header Title */}
          <div className="shrink-0 text-center pt-2">
            <h1 className="font-sans text-xl font-black tracking-widest text-slate-900 leading-none">MOONGS SMART CAST</h1>
          </div>

          {/* Quick Stats Panel */}
          <div className="grid grid-cols-3 gap-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-100">
            <div className="text-center">
              <span className="text-[8px] font-bold text-slate-400 block uppercase">오늘 걸음</span>
              <span className="text-sm font-black text-slate-900 font-mono mt-0.5 block">{state.gaitMetrics.stepCount.toLocaleString()}</span>
            </div>
            <div className="text-center border-x border-slate-200">
              <span className="text-[8px] font-bold text-slate-400 block uppercase">대칭도 (LSI)</span>
              <span className="text-sm font-black text-indigo-600 font-mono mt-0.5 block">{lsiVal}%</span>
            </div>
            <div className="text-center">
              <span className="text-[8px] font-bold text-slate-400 block uppercase">정상 유사도</span>
              <span className="text-sm font-black text-emerald-600 font-mono mt-0.5 block">{similarityVal}%</span>
            </div>
          </div>

          {/* Feature 1: 실시간 발바닥 하중 히트맵 (단일 발 실시간 히트맵) */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-2.5">
              <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <span className="w-1.5 h-3.5 bg-indigo-600 rounded-full" />
                실시간 발바닥 하중 히트맵
              </h3>
              <span className="text-[8px] font-sans px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
                실시간 센서 갱신 중
              </span>
            </div>

            {/* Single Foot Heatmap with 4 Piezo Sensors */}
            <FootHeatmapSingle 
              p1={state.sensorData.rightFoot.piezo1 ?? state.sensorData.rightFoot.forefoot}
              p2={state.sensorData.rightFoot.piezo2 ?? state.sensorData.rightFoot.forefoot}
              p3={state.sensorData.rightFoot.piezo3 ?? state.sensorData.rightFoot.heel}
              p4={state.sensorData.rightFoot.piezo4 ?? state.sensorData.rightFoot.heel}
            />

            {/* Live Indicator Note */}
            <div className="mt-2.5 p-2 bg-slate-50 rounded-xl text-[8.5px] text-slate-500 text-center font-sans">
              💡 {state.sensorData.rightFoot.forefoot > 80 || (state.sensorData.rightFoot.piezo1 ?? 0) > 80 ? (
                <span className="text-rose-600 font-extrabold animate-pulse">⚠️ 경고: 오른발 앞발 하중 쏠림 감지! 체중을 분산해 주세요.</span>
              ) : state.sensorData.rightFoot.heel > 80 || (state.sensorData.rightFoot.piezo3 ?? 0) > 80 ? (
                <span className="text-rose-600 font-extrabold animate-pulse">⚠️ 경고: 오른발 뒤꿈치 과압 상태! 체중을 분산해 주세요.</span>
              ) : (
                <span>하중 분석: 현재 압전소자 4채널 하중이 안전 범위 내에 있습니다.</span>
              )}
            </div>
          </div>

          {/* Feature 5: AI 일상 복귀 신호등 */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5 mb-2.5">
              <span className="w-1.5 h-3.5 bg-indigo-600 rounded-full" />
              AI 일상 복귀 신호등
            </h3>
            
            <div className="flex gap-4 items-center bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
              {/* Traffic Light Container */}
              <div className="flex flex-col gap-2 p-2 bg-slate-900 rounded-2xl w-14 items-center shrink-0 border border-white/5 shadow">
                {/* Red Light */}
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[8px] transition-all duration-300 ${trafficLight === "red" ? "bg-rose-500 shadow-md shadow-rose-500/50 scale-110 font-bold text-white" : "bg-rose-950/40 text-rose-500/20"}`}>
                  정지
                </div>
                {/* Yellow Light */}
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[8px] transition-all duration-300 ${trafficLight === "yellow" ? "bg-amber-500 shadow-md shadow-amber-500/40 scale-110 font-bold text-white" : "bg-amber-950/40 text-amber-500/20"}`}>
                  주의
                </div>
                {/* Green Light */}
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[8px] transition-all duration-300 ${trafficLight === "green" ? "bg-emerald-500 shadow-md shadow-emerald-500/50 scale-110 font-bold text-white" : "bg-emerald-950/40 text-emerald-500/20"}`}>
                  안전
                </div>
              </div>

              {/* Status Description */}
              <div className="flex-1 text-left">
                <span className={`text-xs font-black block ${
                  trafficLight === "red" ? "text-rose-600" : trafficLight === "yellow" ? "text-amber-600" : "text-emerald-600"
                }`}>
                  {trafficLight === "red" && "🔴 회복 경고 (보행 제한)"}
                  {trafficLight === "yellow" && "🟡 주의 단계 (가벼운 평지 보행)"}
                  {trafficLight === "green" && "🟢 일상 복귀 (활동 가능)"}
                </span>
                <p className="text-[9.5px] text-slate-600 mt-1 font-medium leading-tight">
                  {trafficLight === "red" && "수절 부위 과부하 감지. 보행을 보류하고 깁스 밀착도를 높이세요."}
                  {trafficLight === "yellow" && "대칭성 LSI 94%로 회복 중입니다. 평지 위주 가벼운 산책만 권장합니다."}
                  {trafficLight === "green" && "보행 대칭이 안정적입니다. 스포츠 복귀 준비가 가능합니다."}
                </p>
              </div>
            </div>
          </div>

          {/* Feature 11: 재부상 위험도 분석 */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5 mb-2.5">
              <span className="w-1.5 h-3.5 bg-indigo-600 rounded-full" />
              재부상 위험도 분석
            </h3>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
              <div className="flex justify-between items-center text-[10px] text-slate-400 mb-2">
                <span>정적 위험 진단</span>
                <span className={`font-black uppercase px-2 py-0.5 rounded-md text-[9px] ${
                  reinjuryRisk === "높음" ? "bg-rose-50 text-rose-700" : reinjuryRisk === "보통" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
                }`}>
                  위험도: {reinjuryRisk}
                </span>
              </div>

              {/* Slider Scale visualizer */}
              <div className="relative w-full h-3 bg-slate-200 rounded-full overflow-hidden mt-2 mb-2 flex">
                <div className="w-1/3 h-full bg-emerald-400 border-r border-white/10" />
                <div className="w-1/3 h-full bg-amber-400 border-r border-white/10" />
                <div className="w-1/3 h-full bg-rose-400" />

                {/* Pointer indicator */}
                <div 
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-slate-900 rounded-full border-2 border-white shadow transition-all duration-500"
                  style={{ 
                    left: reinjuryRisk === "낮음" ? "15%" : reinjuryRisk === "보통" ? "50%" : "85%" 
                  }}
                />
              </div>

              <div className="flex justify-between text-[8px] font-mono text-slate-400 px-1 mb-1">
                <span>낮음</span>
                <span>보통</span>
                <span>높음</span>
              </div>

              <p className="text-[9.5px] text-slate-600 leading-tight text-left font-medium">
                {reinjuryRisk === "높음" && "⚠️ 과도 압력 감지. 보호대 고정 상태를 점검하세요."}
                {reinjuryRisk === "보통" && "⚠️ 발바닥 충격 흡수 주의. 안장 보행 습관을 자제하세요."}
                {reinjuryRisk === "낮음" && "✅ 좌우 하중 균형이 우수하여 재부상 위험이 낮습니다."}
              </p>
            </div>
          </div>

          {/* Feature 14: 블루투스 연동 (Bluetooth Integration) & Arduino Serial fallback */}
          <div className="bg-slate-900 text-white p-4.5 rounded-3xl shadow-md space-y-3 relative overflow-hidden text-left">
            <div className="absolute right-0 top-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl pointer-events-none" />
            
            <div 
              onClick={state.isIoTConnected ? onDisconnectBluetooth : onStartBluetoothScan}
              className="flex justify-between items-center cursor-pointer hover:bg-slate-800/40 p-1.5 -m-1.5 rounded-xl transition-all active:scale-[0.98]"
              title={state.isIoTConnected ? "클릭하여 블루투스 연결 해제" : "클릭하여 블루투스 기기 검색 및 연결"}
            >
              <div className="flex items-center gap-1.5">
                <Bluetooth className={`w-4 h-4 text-indigo-300 ${isWalkingActive || state.isBluetoothScanning ? "animate-pulse" : ""}`} />
                <span className="text-xs font-black">블루투스 하드웨어 연동</span>
              </div>
              <span className={`text-[8.5px] px-2 py-0.5 rounded-full font-extrabold transition-all duration-150 ${
                state.isIoTConnected 
                  ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30" 
                  : "bg-rose-500/20 text-rose-300 hover:bg-rose-500/30"
              }`}>
                {state.isIoTConnected ? "연동 활성" : "미연동 (클릭하여 연결)"}
              </span>
            </div>

            <p className="text-[9px] text-slate-400 leading-normal">
              스마트 깁스 발바닥 물리 프로토타입 하드웨어(압전 소자 FSR 4채널 보드)와 페어링하여 실시간 보행 데이터를 동기화합니다.
            </p>

            {/* Bluetooth controller actions */}
            <div className="space-y-2 bg-slate-950/60 p-3 rounded-2xl border border-white/5 text-left">
              <div className="flex justify-between items-center mb-1.5">
                <div>
                  <span className="text-[8px] text-slate-400 block font-bold leading-tight uppercase">Connected Device</span>
                  <span className="text-xs font-black text-indigo-300">
                    {state.isIoTConnected ? (state.bluetoothDeviceName || "MOONGS-Cast-04F") : "연결된 장치 없음"}
                  </span>
                </div>
                {state.isIoTConnected ? (
                  <button
                    type="button"
                    onClick={onDisconnectBluetooth}
                    className="bg-white/10 hover:bg-white/15 active:scale-95 text-white text-[9.5px] font-bold px-2.5 py-1 rounded-xl transition-all"
                  >
                    연결 해제
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onStartBluetoothScan}
                    className="bg-[#D9C8FF] hover:bg-[#C9D8FF] active:scale-95 text-[#171B25] text-[9.5px] font-bold px-2.5 py-1.5 rounded-xl transition-all shadow-md shadow-[#D9C8FF]/25"
                  >
                    기기 검색
                  </button>
                )}
              </div>

              {/* Scanner State feedback */}
              {state.isBluetoothScanning && (
                <div className="flex items-center gap-1.5 text-[9px] text-slate-400 py-1 font-mono">
                  <div className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                  <span>근처 저전력 블루투스(BLE) 헬스 장비를 스캔하고 있습니다...</span>
                </div>
              )}

              {/* Scanned device listing */}
              {state.scannedDevices && state.scannedDevices.length > 0 && (
                <div className="space-y-1 mt-2 max-h-24 overflow-y-auto pr-1">
                  {state.scannedDevices.map((dev) => (
                    <button
                      key={dev.address}
                      type="button"
                      onClick={() => onConnectBluetoothDevice && onConnectBluetoothDevice(dev.name)}
                      className="w-full bg-white/5 hover:bg-white/10 active:bg-white/15 p-2 rounded-xl text-left border border-white/5 flex justify-between items-center transition-all"
                    >
                      <div>
                        <span className="text-[10px] font-bold text-white block">🦶 {dev.name}</span>
                        <span className="text-[8px] font-mono text-slate-400 block">{dev.address}</span>
                      </div>
                      <span className="text-[8.5px] bg-[#D9C8FF] text-[#171B25] font-bold px-1.5 py-0.5 rounded-md">연결</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Wired Serial fallback header */}
            <div className="border-t border-white/5 pt-3">
              <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-300 block mb-2">
                📡 아두이노 유선 시리얼 백업 링크
              </span>

              {isSerialConnected ? (
                <div className="space-y-2 bg-slate-950 p-2.5 rounded-xl border border-white/5 font-mono text-[9px] text-emerald-400">
                  <div className="flex justify-between items-center border-b border-white/5 pb-1 mb-1 font-sans text-slate-400 font-bold">
                    <span>🟢 아두이노 연결됨</span>
                    <button onClick={onDisconnectSerial} className="text-rose-400 hover:underline">연결 해제</button>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Live CSV Feed:</span>
                    <span className="text-emerald-300 font-black">{latestRawSerialData || "데이터 수신 대기중..."}</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={onConnectSerial}
                    className="w-full bg-[#B9F0EA] hover:bg-[#C9F5D7] active:scale-95 text-[#13201E] py-2 px-3 rounded-xl text-[10px] font-bold text-center transition-all duration-150 flex items-center justify-center gap-1.5"
                  >
                    <Usb className="w-3.5 h-3.5" />
                    아두이노 USB 시리얼 연결
                  </button>
                  {serialError && (
                    <div className="text-[8.5px] text-rose-300 bg-rose-500/10 p-2 rounded-xl border border-rose-500/20 leading-normal">
                      {serialError}
                    </div>
                  )}
                  <p className="text-[8px] text-slate-500 leading-normal">
                    * iframe 환경 보안 제약으로 시리얼 오프라인 시 우측 위 '새 창으로 열기' 버튼을 클릭해 새 탭에서 실행하십시오.
                  </p>
                </div>
              )}

              {/* Code visibility expander */}
              <button 
                type="button" 
                onClick={() => setShowArduinoCode(!showArduinoCode)} 
                className="text-[9px] text-indigo-400 hover:underline block mt-2"
              >
                {showArduinoCode ? "▲ 아두이노 전송 코드 접기" : "▼ 아두이노 전송 코드 보기"}
              </button>

              {showArduinoCode && (
                <pre className="font-mono text-[7px] text-slate-300 bg-slate-950 p-2 rounded-lg max-h-36 overflow-y-auto mt-1 border border-white/5 leading-relaxed">
{`// MOONGS 스마트 깁스 - 압력 센서 전송 규격
void setup() {
  Serial.begin(9600);
}
void loop() {
  int p1 = analogRead(A0); // 앞발 안쪽
  int p2 = analogRead(A1); // 앞발 바깥쪽
  int p3 = analogRead(A2); // 중간 아치
  int p4 = analogRead(A3); // 뒤꿈치
  
  int minX = map(p1, 0, 1023, 10, 40);
  int maxX = map(p2, 0, 1023, 60, 90);
  int minY = map(p3, 0, 1023, 5, 30);
  int maxY = map(p4, 0, 1023, 70, 95);

  Serial.print(p1); Serial.print(",");
  Serial.print(p2); Serial.print(",");
  Serial.print(p3); Serial.print(",");
  Serial.print(p4); Serial.print(",");
  Serial.print(minX); Serial.print(",");
  Serial.print(maxX); Serial.print(",");
  Serial.print(minY); Serial.print(",");
  Serial.println(maxY);
  delay(200);
}`}
                </pre>
              )}
            </div>
          </div>

          {/* Active Walk Simulation Control */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm text-left">
            <span className="text-[10px] font-bold text-slate-400 block mb-1">REAL-TIME SIMULATION CONTROL</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onToggleSimulateWalking}
                className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all duration-150 text-center active:scale-95 ${
                  isWalkingActive 
                    ? "bg-[#F4B3D8] hover:bg-[#F8C8A1] text-[#1E1419]" 
                    : "bg-[#D9C8FF] hover:bg-[#C5D9FF] text-[#171B25]"
                }`}
              >
                {isWalkingActive ? "⏸️ 보행 시뮬레이터 중지" : "▶️ 실시간 보행 시동"}
              </button>
              
              <button
                type="button"
                onClick={handleSaveActiveSession}
                className="bg-[#C9F5D7] hover:bg-[#B9F0EA] text-[#112520] font-bold px-3 rounded-xl text-xs flex items-center justify-center gap-1 active:scale-95 border border-white/20"
              >
                <Save className="w-3.5 h-3.5" />
                저장
              </button>
            </div>
          </div>
        </motion.div>
      );

    // ----------------------------------------------------
    // SCREEN 2: ANALYSIS (COP, Speed, Step Length, Balance, Similarity)
    // ----------------------------------------------------
    case "analysis":
      const minX = state.arduinoData ? state.arduinoData.minX : Math.round(20 + Math.sin(Date.now() / 2500) * 4);
      const maxX = state.arduinoData ? state.arduinoData.maxX : Math.round(75 + Math.cos(Date.now() / 2500) * 6);
      const minY = state.arduinoData ? state.arduinoData.minY : Math.round(15 + Math.sin(Date.now() / 2200) * 5);
      const maxY = state.arduinoData ? state.arduinoData.maxY : Math.round(82 + Math.cos(Date.now() / 2200) * 8);

      return (
        <motion.div {...transitionConfig} className="glass screen-surface analysis-screen flex flex-col h-full text-slate-800 space-y-4 overflow-y-auto pb-24 px-3" style={{ color: tokens.color.text }}>
          <div className="analysis-heading pt-3 px-1">
            <p className="text-[9px] font-bold uppercase tracking-[.2em]">Live analysis</p>
            <h1 className="font-sans text-[22px] font-semibold tracking-[-.04em] leading-none mt-1">보행 분석</h1>
            <p className="mt-2 text-[11px] font-medium">센서 데이터를 바탕으로 오늘의 움직임을 읽어요</p>
          </div>

          {/* Feature 9: 보행 균형도 (Gait Balance) & Weight Distribution */}
          <div className="analysis-card analysis-card-balance bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5 mb-2.5">
              보행 균형도 (Gait Balance)
            </h3>
            
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-600">균형 점수</span>
                <span className="text-sm font-black text-emerald-600 font-mono">{state.gaitMetrics.balanceScore}점 / 100</span>
              </div>

              {/* Slider for Left-Right Weight Distribution */}
              <div className="space-y-1">
                <div className="flex justify-between text-[9px] font-bold text-slate-500 px-1">
                  <span>왼발 ({state.gaitMetrics.weightDistributionLeft}%)</span>
                  <span>오른발 ({state.gaitMetrics.weightDistributionRight}%)</span>
                </div>
                
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden flex">
                  <div 
                    className="bg-indigo-500 h-full transition-all duration-500"
                    style={{ width: `${state.gaitMetrics.weightDistributionLeft}%` }}
                  />
                  <div 
                    className="bg-rose-500 h-full transition-all duration-500"
                    style={{ width: `${state.gaitMetrics.weightDistributionRight}%` }}
                  />
                </div>
              </div>

              <p className="text-[9.5px] text-slate-500 leading-tight text-center font-medium">
                {state.gaitMetrics.weightDistributionLeft > 55 ? (
                  <span>왼발 의존도가 높아 체중 분산이 필요합니다.</span>
                ) : (
                  <span>좌우 균등한 하중 배분이 유지되고 있습니다.</span>
                )}
              </p>
            </div>
          </div>

          <div className="analysis-metrics-grid grid grid-cols-[1.1fr_1fr] gap-3 shrink-0">
          {/* Feature 2: COP(압력 중심) 이동 궤적 분석 */}
          <div className="analysis-card analysis-card-cop flex min-w-0 flex-col bg-white p-3 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold">보행 균형</h3>
              <Info size={13} className="text-white/60" />
            </div>
            <p className="text-[8px] leading-tight text-white/65 mb-1">걸을 때 몸의 중심 이동을 분석해요.</p>
            <div className="my-2 flex flex-1 items-center justify-center relative bg-slate-950 px-2 pt-3 pb-7 rounded-2xl border border-slate-800">
              <svg className="w-full max-w-[150px] aspect-square" viewBox="0 0 160 160" role="img" aria-label="점으로 표현한 발바닥과 현재 압력 중심. 점선은 기준 경로입니다.">
                <defs>
                  <pattern id="cop-foot-dots" width="3.5" height="3.5" patternUnits="userSpaceOnUse"><circle cx="1.75" cy="1.75" r=".72" fill="#e0e5e2" opacity=".82" /></pattern>
                  <linearGradient id="cop-foot-route" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#9bed9c"/><stop offset=".5" stopColor="#80e4cc"/><stop offset="1" stopColor="#72b6ff"/></linearGradient>
                </defs>
                <g fill="url(#cop-foot-dots)">
                  <ellipse cx="72" cy="20" rx="8" ry="11" transform="rotate(8 72 20)"/>
                  <ellipse cx="88.5" cy="24" rx="5.5" ry="8.5" transform="rotate(3 88.5 24)"/>
                  <ellipse cx="101" cy="31" rx="4.8" ry="7" transform="rotate(-5 101 31)"/>
                  <ellipse cx="111" cy="40" rx="4" ry="6" transform="rotate(-12 111 40)"/>
                  <ellipse cx="117" cy="50" rx="3.2" ry="5" transform="rotate(-18 117 50)"/>
                  <path d="M65 36 C72 32 81 35 88 37 C99 40 109 47 113 54 C119 65 114 80 110 91 C106 104 106 117 105 130 C104 144 99 154 88 154 C77 154 70 146 70 135 C70 123 75 112 75 101 C75 88 71 80 67 70 C62 59 60 47 65 36Z"/>
                </g>
                <path d="M82 144 C75 119 92 92 86 69 L80 42" fill="none" stroke="url(#cop-foot-route)" strokeWidth="1.6" strokeDasharray="3 3" strokeLinecap="round"/>
                <circle cx="80" cy="42" r="3.5" fill="none" stroke="#a0ef9f" strokeWidth="1.8"/>
                <circle cx={72 + ((minX + maxX) / 2) * .25} cy={144 - ((minY + maxY) / 2) * 1.02} r="3.8" fill="#79bcff" stroke="#c7e7ff" strokeWidth=".7"/>
                <g fontFamily="inherit" fontSize="6" fill="#f0f4f1">
                  <text x="3" y="41">앞꿈치</text><text x="3" y="49" fill="#b7c2bc">(추진)</text>
                  <text x="3" y="91">발 중앙</text><text x="3" y="99" fill="#b7c2bc">(균형)</text>
                  <text x="3" y="142">뒤꿈치</text><text x="3" y="150" fill="#b7c2bc">(지지)</text>
                </g>
                <g stroke="#cbd6cf" strokeOpacity=".3" strokeWidth=".5"><path d="M28 42H69"/><path d="M28 92H72"/><path d="M28 143H71"/></g>
                <g fontSize="5" fill="#dce4df">
                  <circle cx="119" cy="116" r="2" fill="none" stroke="#a0ef9f" strokeWidth="1"/><text x="125" y="118">기준점</text>
                  <circle cx="119" cy="129" r="2" fill="#79bcff"/><text x="125" y="131">현재 위치</text>
                  <path d="M116 142H122" stroke="#bcd1c8" strokeDasharray="2 1"/><text x="125" y="144">기준 경로</text>
                </g>
              </svg>
              <div className="absolute bottom-2 inset-x-1 text-center text-[7px] text-white/60">{state.arduinoData ? '실시간 압력 중심' : '데모 압력 중심'} · 점선은 기준 경로</div>
            </div>
          </div>

          {/* Feature 7 & 8: 보행 속도 (Gait Speed) & 보폭 (Step Length) */}
          <div className="grid min-w-0 grid-rows-2 gap-3">
            {/* Feature 7: 보행 속도 */}
            <div className="analysis-card analysis-card-speed flex min-w-0 flex-col justify-center bg-white p-3 rounded-3xl border border-slate-200 shadow-sm text-left">
              <h4 className="text-[10px] font-black text-slate-900 uppercase block mb-1">보행 속도</h4>
              <span className="text-lg font-mono font-black text-indigo-600 block">{currentSpeedMs} m/s</span>
              <p className="text-[8.5px] text-slate-500 leading-tight mt-1 font-medium">
                정상 성인 대비 <strong className="text-indigo-600">{Math.round((currentSpeedMs/1.2)*100)}%</strong> 수준 달성
              </p>
            </div>

            {/* Feature 8: 보폭 */}
            <div className="analysis-card analysis-card-step flex min-w-0 flex-col justify-center bg-white p-3 rounded-3xl border border-slate-200 shadow-sm text-left">
              <h4 className="text-[10px] font-black text-slate-900 uppercase block mb-1">보폭 (Step Length)</h4>
              <div className="flex flex-wrap gap-x-3 gap-y-1 items-baseline mt-1">
                <span className="text-xs text-slate-600 block"><span className="font-bold">L:</span> 65cm</span>
                <span className="text-xs text-slate-600 block"><span className="font-bold">R:</span> {58 + Math.round((state.gaitMetrics.balanceScore - 80) * 0.5)}cm</span>
              </div>
              <p className="text-[8.5px] text-slate-500 leading-tight mt-1.5 font-medium">
                좌우 편차: <strong className="text-rose-500">{Math.abs(65 - (58 + Math.round((state.gaitMetrics.balanceScore - 80) * 0.5)))}cm</strong>
              </p>
            </div>
          </div>

          </div>

          {/* Feature 12: 정상 보행 유사도 */}
          <div className="analysis-card analysis-card-similarity bg-white p-4 rounded-3xl border border-slate-200 shadow-sm text-left">
            <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5 mb-2">
              정상 보행 유사도
            </h3>
            
            <div className="flex gap-3 items-center bg-slate-50 p-3 rounded-2xl border border-slate-100">
              {/* Mini Radial Indicator */}
              <div className="relative w-12 h-12 shrink-0 flex items-center justify-center bg-white rounded-full border border-slate-200">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-slate-100"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-emerald-500"
                    strokeDasharray={`${similarityVal}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute text-[10px] font-black font-mono text-emerald-600">{similarityVal}%</div>
              </div>

              <div>
                <span className="text-[10px] font-extrabold text-slate-700 block">정상 보행 패턴 대조</span>
                <p className="text-[9.5px] text-slate-500 mt-0.5 leading-tight font-medium">
                  정상 보행군 데이터베이스 대비 높은 유사도를 기록 중입니다.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      );

    // ----------------------------------------------------
    // SCREEN 3: COACH / CHAT (Exercises, Guides, AI Summary)
    // ----------------------------------------------------
    case "chat":
      return (
        <motion.div
          {...transitionConfig}
          className="glass screen-surface flex h-full flex-col overflow-hidden"
          style={{
            color: tokens.color.text,
            background: 'radial-gradient(ellipse at 105% 14%, #68afe0 0%, rgba(59,105,179,0.88) 16%, rgba(35,57,105,0.5) 34%, transparent 55%), radial-gradient(ellipse at -8% 82%, #b1a0ed 0%, rgba(114,103,201,0.9) 16%, rgba(64,62,121,0.55) 34%, transparent 55%), #0d1225'
          }}
        >
          <div className="flex items-center justify-between px-4 pt-3 pb-2 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/5 text-[10px] font-bold text-white">AI</div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em]" style={{ color: tokens.color.textMuted }}>Coach</p>
                <h1 className="text-lg font-semibold tracking-[-0.04em] text-white">AI 상담</h1>
              </div>
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[9px] font-medium" style={{ color: tokens.color.textSecondary }}>온라인</div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 pb-3">
            <div className="flex h-full flex-col gap-3 rounded-[28px] border border-white/8 bg-black/10 p-3">
              <div className="max-h-full flex-1 space-y-3 overflow-y-auto px-1">
                {chatMessages?.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[86%] rounded-[22px] px-3 py-2.5 text-[12px] leading-6 ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-[#b9d7ff] to-[#d9c9ff] text-[#141a29] shadow-lg shadow-[#8eb8ff]/20'
                        : 'border border-white/10 bg-white/5 text-white/90'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}

                {isAiLoading && (
                  <div className="flex justify-start">
                    <div className="rounded-[22px] border border-white/10 bg-white/5 px-3 py-2.5 text-[12px] text-white/80">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 animate-bounce rounded-full bg-[#d9c9ff]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-[#b9d7ff] [animation-delay:120ms]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-[#f2a7d7] [animation-delay:240ms]" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (chatInput && onSendMessage) {
                onSendMessage(chatInput);
              }
            }}
            className="shrink-0 px-3 pb-2 pt-3"
          >
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput && setChatInput(e.target.value)}
                placeholder="AI 코치에게 물어보세요"
                className="flex-1 bg-transparent px-2 text-[12px] text-white placeholder:text-white/40 focus:outline-none"
              />
              <button
                type="submit"
                className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-r from-[#d7c2ff] via-[#b9d7ff] to-[#f2a7d7] text-[14px] font-bold text-[#161b2d] shadow-lg shadow-[#d7c2ff]/20"
                aria-label="전송"
              >
                ↑
              </button>
            </div>
          </form>
        </motion.div>
      );

    // ----------------------------------------------------
    // SCREEN 4: TREND (Observation graph, LSI Weekly Index)
    // ----------------------------------------------------
    case "trend":
      return (
        <motion.div {...transitionConfig} className="glass screen-surface trend-screen flex flex-col h-full text-slate-800 space-y-4 overflow-y-auto pb-24 px-2" style={{ color: tokens.color.text, background: '#000000' }}>
          <div className="text-center pt-2">
            <h1 className="font-sans text-xl font-black tracking-widest leading-none" style={{ color: tokens.color.text }}>PROGRESS OBSERVER</h1>
          </div>

          {/* Feature 3: AI 지속 개선 관찰 */}
          <div className="trend-card trend-card-primary flex min-h-[330px] flex-col bg-white p-4 rounded-3xl border border-slate-200 shadow-sm text-left">
            <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5 mb-2.5">
              AI 지속 개선 관찰 (장기 치료 곡선)
            </h3>

            {/* Beautiful Custom SVG Line Chart */}
            <div className="trend-chart flex flex-1 flex-col bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
              <span className="text-[8.5px] text-indigo-300 block mb-2 font-mono">📈 RECOVERY SYMMETRY PROGRESS CHART</span>
              
              <svg className="w-full min-h-[260px] flex-1" viewBox="-16 0 296 230">
                <defs>
                  <linearGradient id="recovery-glass-line" x1="40" y1="175" x2="240" y2="51" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
                    <stop offset="35%" stopColor="#d9eaff" stopOpacity="0.55" />
                    <stop offset="65%" stopColor="#efe3ff" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity="0.95" />
                  </linearGradient>
                  <radialGradient id="recovery-glass-point" cx="30%" cy="25%" r="80%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                    <stop offset="45%" stopColor="#eee8ff" stopOpacity="0.65" />
                    <stop offset="100%" stopColor="#8e83ad" stopOpacity="0.4" />
                  </radialGradient>
                </defs>
                {/* Horizontal reference lines */}
                <line x1="40" y1="35" x2="260" y2="35" stroke="#1e293b" strokeWidth="1" strokeDasharray="3,3" />
                <line x1="40" y1="105" x2="260" y2="105" stroke="#1e293b" strokeWidth="1" strokeDasharray="3,3" />
                <line x1="40" y1="175" x2="260" y2="175" stroke="#1e293b" strokeWidth="1" />

                {/* Left labels */}
                <text x="35" y="38" fontSize="7" fill="#64748b" textAnchor="end" className="font-mono">95% (정상)</text>
                <text x="35" y="108" fontSize="7" fill="#64748b" textAnchor="end" className="font-mono">85% (보통)</text>
                <text x="35" y="178" fontSize="7" fill="#64748b" textAnchor="end" className="font-mono">70% (위험)</text>

                {/* Trend Lines: Ideal Reference Path (Green) */}
                <path d="M 40,172 L 100,138 L 160,88 L 240,43" fill="none" stroke="rgba(16,185,129,0.3)" strokeWidth="1.5" strokeDasharray="2,2" strokeLinecap="round" />
                
                {/* Translucent glass line with a soft edge and reflected highlight. */}
                <path d="M 40,175 L 100,145 L 160,99 L 240,51" fill="none" stroke="rgba(77,65,106,0.28)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M 40,175 L 100,145 L 160,99 L 240,51" fill="none" stroke="url(#recovery-glass-line)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M 40,175 L 100,145 L 160,99 L 240,51" transform="translate(0 -0.8)" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" />

                {/* Glass beads at each measurement. */}
                <g fill="url(#recovery-glass-point)" stroke="rgba(255,255,255,0.9)" strokeWidth="1.2">
                  <circle cx="40" cy="175" r="3.8" />
                  <circle cx="100" cy="145" r="3.8" />
                  <circle cx="160" cy="99" r="3.8" />
                  <circle cx="240" cy="51" r="4.8" />
                </g>

                {/* Chart Labels */}
                <text x="40" y="195" fontSize="8" fill="#94a3b8" textAnchor="middle" fontWeight="bold">1주차</text>
                <text x="100" y="195" fontSize="8" fill="#94a3b8" textAnchor="middle" fontWeight="bold">2주차</text>
                <text x="160" y="195" fontSize="8" fill="#94a3b8" textAnchor="middle" fontWeight="bold">3주차</text>
                <text x="240" y="195" fontSize="8" fill="#94a3b8" textAnchor="middle" fontWeight="bold">4주차 (현재)</text>

                {/* Point values */}
                <text x="40" y="161" fontSize="7.5" fill="#e2e8f0" textAnchor="middle" fontWeight="black" className="font-mono">72%</text>
                <text x="100" y="131" fontSize="7.5" fill="#e2e8f0" textAnchor="middle" fontWeight="black" className="font-mono">80%</text>
                <text x="160" y="85" fontSize="7.5" fill="#e2e8f0" textAnchor="middle" fontWeight="black" className="font-mono">88%</text>
                <text x="240" y="36" fontSize="8.5" fill="#818cf8" textAnchor="middle" fontWeight="black" className="font-mono">{lsiVal}%</text>
              </svg>

              <div className="flex shrink-0 flex-wrap justify-between items-center gap-x-3 gap-y-1 text-[7.5px] leading-relaxed text-slate-500 border-t border-white/5 pt-2 font-mono">
                <span>녹색 점선: 이상적 회복 선</span>
                <span className="text-indigo-400 font-bold">● 최근 주간 +6.5% 향상</span>
              </div>
            </div>
          </div>

          {/* Feature 4: 주차별 회복 대칭성 (LSI) */}
          <div className="trend-card trend-card-lsi flex min-h-[230px] flex-1 flex-col bg-white p-4 rounded-3xl border border-slate-200 shadow-sm text-left">
            <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5 mb-2.5">
              <span className="w-1.5 h-3.5 bg-indigo-600 rounded-full" />
              주차별 회복 대칭성 (LSI)
            </h3>

            <div className="grid flex-1 grid-cols-2 items-center gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-100">
              {/* LSI Gauge circular */}
              <div className="flex flex-col items-center justify-center">
                <div className="relative w-36 h-36 flex items-center justify-center bg-white rounded-full border-2 border-slate-200 shadow-sm">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-slate-100"
                      strokeWidth="3.5"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-indigo-600"
                      strokeDasharray={`${lsiVal}, 100`}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute text-center">
                    <span className="text-3xl font-black font-mono text-indigo-600 block">{lsiVal}%</span>
                    <span className="text-[10px] text-slate-400 block font-bold">LSI Index</span>
                  </div>
                </div>
              </div>

              {/* Recovery description */}
              <div className="flex flex-col justify-center text-left">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase block font-mono">복귀 지수</span>
                <span className="text-[12px] leading-relaxed text-emerald-600 font-bold block mt-1">✓ 평지 산책 가능</span>
                <span className="text-[12px] leading-relaxed text-slate-500 font-medium block mt-0.5">⚠️ 러닝: 95% 이상 시 권장</span>
              </div>
            </div>
          </div>
        </motion.div>
      );

    // ----------------------------------------------------
    // SCREEN 5: EXERCISE (Return recommendation guidelines)
    // ----------------------------------------------------
    case "exercise":
      return (
        <motion.div {...transitionConfig} className="glass screen-surface exercise-screen flex flex-col h-full text-slate-800 space-y-4 overflow-y-auto pb-24 px-3" style={{ color: tokens.color.text, background: 'linear-gradient(155deg, #17212C 0%, #0B0F14 48%, #06090D 100%)' }}>
          <div className="pt-3 px-1 text-left">
            <p className="text-[9px] font-bold uppercase tracking-[.2em] text-slate-400">Movement permission</p>
            <h1 className="mt-1 text-[22px] font-semibold tracking-[-.04em] text-white">운동 복귀 신호</h1>
          </div>

          <RecoverySignal lsi={lsiVal} balance={state.gaitMetrics.balanceScore} />

          {/* Feature 13: 운동 복귀 추천 */}
          <div className="hidden" aria-hidden="true">
            <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5 mb-2.5">
              <span className="w-1.5 h-3.5 bg-indigo-600 rounded-full" />
              운동 복귀 가이드
            </h3>

            {/* Recommendation Cards */}
            <div className="space-y-2.5">
              
              {/* 🟢 가벼운 산책 가능 (ACTIVE) */}
              <div className="flex gap-2.5 bg-emerald-50/60 p-3 rounded-2xl border border-emerald-100 items-start">
                <span className="text-lg shrink-0">🟢</span>
                <div className="text-left">
                  <h4 className="text-xs font-black text-emerald-900">평지 가벼운 산책 (30분 이내)</h4>
                  <p className="text-[9.5px] text-emerald-800 mt-0.5 font-medium leading-tight">
                    대칭성 {lsiVal}% 달성으로 완충화 착용 후 평지 산책이 가능합니다.
                  </p>
                </div>
              </div>

              {/* 🟡 실내 자전거 권장 (CAUTION) */}
              <div className="flex gap-2.5 bg-amber-50/60 p-3 rounded-2xl border border-amber-100 items-start">
                <span className="text-lg shrink-0">🟡</span>
                <div className="text-left">
                  <h4 className="text-xs font-black text-amber-900">실내 고정 자전거 (최저 강도)</h4>
                  <p className="text-[9.5px] text-amber-800 mt-0.5 font-medium leading-tight">
                    체중 부하가 적어 관절에 안전합니다. 1단계 저항으로 운동하세요.
                  </p>
                </div>
              </div>

              {/* 🔴 조깅/러닝머신 보류 (STOP) */}
              <div className="flex gap-2.5 bg-rose-50/60 p-3 rounded-2xl border border-rose-100 items-start">
                <span className="text-lg shrink-0">❌</span>
                <div className="text-left">
                  <h4 className="text-xs font-black text-rose-900">실외 조깅 & 러닝머신 금지</h4>
                  <p className="text-[9.5px] text-rose-800 mt-0.5 font-medium leading-tight">
                    수직 충격으로 재파열 위험이 있으니 당분간 자제해 주세요.
                  </p>
                </div>
              </div>

              {/* ⚠️ 계단 이용 주의 (WARNING) */}
              <div className="flex gap-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-200 items-start">
                <span className="text-lg shrink-0">⚠️</span>
                <div className="text-left">
                  <h4 className="text-xs font-black text-slate-800">계단 이용 시 난간 파지</h4>
                  <p className="text-[9.5px] text-slate-700 mt-0.5 font-medium leading-tight">
                    하강 시 발목 부담이 큽니다. 엘리베이터 이용을 권장합니다.
                  </p>
                </div>
              </div>

            </div>
          </div>

          {/* Interactive Pain Recorder */}
          <div className="hidden" aria-hidden="true">
            <div>
              <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <span className="w-1.5 h-3.5 bg-indigo-600 rounded-full" />
                통증 체크
              </h3>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[
                { name: "happy" as const, score: 0, emoji: "😀", desc: "통증없음" },
                { name: "neutral" as const, score: 3, emoji: "😐", desc: "뻐근함" },
                { name: "bad" as const, score: 6, emoji: "😣", desc: "통증발생" },
                { name: "cry" as const, score: 9, emoji: "😭", desc: "극심함" }
              ].map((item) => {
                const isSelected = state.painStatus === item.name;
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => {
                      if (onPainScoreChange && onPainStatusChange) {
                        onPainScoreChange(item.score);
                        onPainStatusChange(item.name);
                      }
                    }}
                    className={`flex flex-col items-center gap-1 p-2 rounded-2xl border transition-all active:scale-95 ${
                      isSelected 
                        ? "bg-[#D9C8FF] border-transparent text-[#171B25] shadow-md font-bold"
                        : "bg-white/5 border-white/10 hover:bg-white/10 text-white/80"
                    }`}
                  >
                    <span className="text-2xl">{item.emoji}</span>
                    <span className="text-[8px] block leading-none font-bold">{item.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>
      );

    // ----------------------------------------------------
    // SCREEN 6: MY PAGE / RECOVERY ARCHIVE (Data Storage)
    // ----------------------------------------------------
    case "my":
      return (
        <motion.div {...transitionConfig} className="glass screen-surface archive-screen flex h-full flex-col space-y-4 overflow-y-auto px-3 pb-24 text-slate-800" style={{ color: tokens.color.text, background: '#050507' }}>
          {/* Product-profile hero inspired by the supplied editorial reference. */}
          <section className="relative -mx-3 min-h-[500px] overflow-hidden rounded-b-[38px] border-b border-white/15 text-white">
            <img src={PROFILE_IMAGE} alt="김뭉스 프로필" className="absolute inset-0 h-full w-full object-cover object-[center_24%]" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(9,10,14,.24)_0%,rgba(18,13,10,.12)_38%,rgba(31,20,18,.84)_78%,#09090c_100%)]" aria-hidden />
            <div className="absolute inset-0 bg-[#d8c4aa]/20 mix-blend-color" aria-hidden />

            <div className="relative flex items-center justify-between px-5 pt-[max(18px,env(safe-area-inset-top))]">
              <button type="button" className="min-h-11 rounded-full border border-white/30 bg-black/15 px-4 text-[11px] font-semibold text-white backdrop-blur-xl" onClick={() => setScreenName('home')}>기기 설정</button>
              <button type="button" onClick={() => setScreenName('home')} aria-label="설정 닫기" className="grid h-11 w-11 place-items-center rounded-full border border-white/30 bg-black/15 text-xl font-light text-white backdrop-blur-xl">×</button>
            </div>

            <div className="absolute inset-x-0 bottom-6 flex flex-col items-center px-5 text-center">
              <div className="h-[76px] w-[76px] overflow-hidden rounded-full border border-white/60 bg-[#d5c2a9]/40 p-1 shadow-[0_12px_30px_rgba(0,0,0,.35)] backdrop-blur-md">
                <div className="grid h-full w-full place-items-center rounded-full bg-[radial-gradient(circle_at_30%_20%,#514039_0%,#241b19_65%,#171212_100%)] text-[#f5dfb9] shadow-[inset_0_1px_8px_rgba(255,224,182,.12)]">
                  <svg viewBox="0 0 100 100" role="img" aria-label="MOONGS 필기체 M" className="h-full w-full p-2">
                    <path d="M15 69C24 75 29 55 35 34C38 23 32 21 25 28C20 33 20 39 25 40" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M35 28C32 43 28 60 27 72C33 56 44 35 53 28C49 42 44 59 44 69C51 54 65 32 75 26C68 43 60 65 64 72C68 79 78 67 85 59" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M20 82C37 73 63 77 80 72" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
              <p className="mt-3 text-[10px] font-semibold tracking-[.14em] text-white/75">WEARABLE RECOVERY SYSTEM</p>
              <h1 className="mt-1 font-serif text-[38px] font-normal leading-none tracking-[-.045em] text-white">MOONGS Smart Cast</h1>
              <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                <span className="rounded-full border border-white/15 bg-white/15 px-3 py-1.5 text-[10px] font-semibold backdrop-blur-xl">✦ AI Recovery</span>
                <span className="rounded-full border border-white/15 bg-white/15 px-3 py-1.5 text-[10px] font-semibold backdrop-blur-xl">✦ 8 Sensors</span>
                <span className="rounded-full border border-white/15 bg-white/15 px-3 py-1.5 text-[10px] font-semibold backdrop-blur-xl">✦ Live Sync</span>
              </div>
              <div className="mt-5 grid w-full grid-cols-4 gap-1.5">
                <div className="rounded-2xl border border-white/10 bg-white/10 px-1 py-2 backdrop-blur-xl"><span className="block text-[8px] text-white/65">연결</span><strong className="mt-0.5 block text-[11px]">{state.isIoTConnected ? '온라인' : '데모'}</strong></div>
                <div className="rounded-2xl border border-white/10 bg-white/10 px-1 py-2 backdrop-blur-xl"><span className="block text-[8px] text-white/65">배터리</span><strong className="mt-0.5 block text-[11px]">{state.batteryLevel}%</strong></div>
                <div className="rounded-2xl border border-white/10 bg-white/10 px-1 py-2 backdrop-blur-xl"><span className="block text-[8px] text-white/65">조임</span><strong className="mt-0.5 block text-[11px]">{state.tightnessIntensity}%</strong></div>
                <div className="rounded-2xl border border-white/10 bg-white/10 px-1 py-2 backdrop-blur-xl"><span className="block text-[8px] text-white/65">재활</span><strong className="mt-0.5 block text-[11px]">4주차</strong></div>
              </div>
            </div>
          </section>

          <div className="px-1 pt-1 text-left">
            <p className="text-[9px] font-bold uppercase tracking-[.18em] text-slate-400">Recovery archive</p>
            <h2 className="mt-1 text-lg font-semibold text-white">김뭉스님의 회복 기록</h2>
          </div>

          {/* Feature 15: 데이터 저장 (날짜별, 주차별, 장기 회복 기록) */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm text-left">
            <div className="flex justify-between items-center mb-2.5">
              <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <span className="w-1.5 h-3.5 bg-indigo-600 rounded-full" />
                보행 데이터 저장소
              </h3>
              <div className="flex items-center gap-1.5">
                {onResetSampleData && (
                  <button 
                    onClick={onResetSampleData}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-[9px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 border border-slate-200"
                    title="기본 샘플 기록 초기화"
                  >
                    <Trash2 className="w-2.5 h-2.5 text-rose-500" />
                    샘플 초기화
                  </button>
                )}
                <button 
                  onClick={handleSaveActiveSession}
                  className="bg-[#D9C8FF] hover:bg-[#C5D9FF] text-[#171B25] text-[9px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm"
                >
                  <Save className="w-2.5 h-2.5" />
                  현 보행 저장
                </button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-xl mb-3 border border-slate-200">
              <button
                type="button"
                onClick={() => setRecordsTab("daily")}
                className={`flex-1 text-center py-1 rounded-lg text-[9.5px] font-bold transition-all ${
                  recordsTab === "daily" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                }`}
              >
                날짜별
              </button>
              <button
                type="button"
                onClick={() => setRecordsTab("weekly")}
                className={`flex-1 text-center py-1 rounded-lg text-[9.5px] font-bold transition-all ${
                  recordsTab === "weekly" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                }`}
              >
                주차별
              </button>
              <button
                type="button"
                onClick={() => setRecordsTab("longterm")}
                className={`flex-1 text-center py-1 rounded-lg text-[9.5px] font-bold transition-all ${
                  recordsTab === "longterm" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                }`}
              >
                장기 회복
              </button>
            </div>

            {/* Filtered Logs List */}
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-0.5">
              {savedRecords.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-[10px]">
                  저장된 보행 세션이 없습니다. 상단 '현 보행 저장'을 누르세요.
                </div>
              ) : (
                savedRecords
                  .filter(rec => {
                    if (recordsTab === "daily") return true; // Show all raw sessions
                    if (recordsTab === "weekly") return rec.id === "rec-1" || rec.id === "rec-2" || rec.id === "rec-3" || rec.id === "rec-4"; // Show summary endpoints
                    return rec.weekNumber >= 1; // Long-term shows all key week indices
                  })
                  .map((rec) => (
                    <div key={rec.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-150 text-left">
                      <div className="mb-1.5 flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] font-black text-slate-800 font-mono block">
                            {recordsTab === "weekly" ? `🏥 수술 제 ${rec.weekNumber}주차 종합` : `📅 ${rec.date}`}
                          </span>
                          <span className="text-[8px] text-slate-400 block mt-0.5">
                            수술 {rec.weekNumber}주차 • 걸음수: {rec.stepCount.toLocaleString()}보
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteRecord(rec.id)}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 transition-colors hover:text-rose-500"
                          aria-label="기록 삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex justify-end">
                        <span className={`text-[8.5px] font-bold font-mono px-1.5 py-0.5 rounded ${
                          rec.risk === "높음" ? "bg-rose-50 text-rose-700" : rec.risk === "보통" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
                        }`}>
                          위험: {rec.risk}
                        </span>
                      </div>

                      <div className="grid grid-cols-4 gap-2 text-center border-t border-slate-200/60 pt-2 font-mono text-[9px] text-slate-500">
                        <div>
                          <span className="text-[7.5px] text-slate-400 block">LSI 대칭성</span>
                          <strong className="text-indigo-600 block text-[10px]">{rec.lsi}%</strong>
                        </div>
                        <div>
                          <span className="text-[7.5px] text-slate-400 block">하중분포(L:R)</span>
                          <strong className="text-slate-700 block text-[9px]">{rec.leftRatio}:{rec.rightRatio}</strong>
                        </div>
                        <div>
                          <span className="text-[7.5px] text-slate-400 block">보행속도</span>
                          <strong className="text-indigo-650 block text-[10px]">{rec.speed.toFixed(2)} m/s</strong>
                        </div>
                        <div>
                          <span className="text-[7.5px] text-slate-400 block">보폭 (L:R)</span>
                          <strong className="text-slate-700 block text-[9px]">{rec.leftStepCm}:{rec.rightStepCm}</strong>
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>

        </motion.div>
      );

    default:
      return <div className="text-slate-500 p-4 text-center">선택된 화면을 로드할 수 없습니다.</div>;
  }
}
