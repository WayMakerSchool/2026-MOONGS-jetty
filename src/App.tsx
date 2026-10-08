import React, { useState, useEffect, useRef } from "react";
import { 
  ChevronLeft, 
  Home, 
  Bell, 
  FileText, 
  Activity, 
  Battery, 
  Layers, 
  Bluetooth, 
  Cpu, 
  Flame, 
  AlertTriangle, 
  TrendingUp, 
  Sparkles, 
  Send, 
  Compass,
  Play, 
  Pause, 
  RefreshCw,
  Info,
  Sliders,
  Database
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { AppState, ChatMessage, FootSensorData } from "./types";
import SmartCastScreen from "./components/SmartCastScreen";
import HomeV2 from "./components/HomeV2";
import { applySensorLine, beginLiveSession } from "./lib/telemetry";
import { SensorTextBuffer } from "./lib/sensorStream";
import { defaultBaudRate, openSerialPort, serialTextDiagnostic } from "./lib/serial";
import { sensorServices, subscribeSensor, bluetoothError, forgetSensorDevices } from "./lib/bluetooth";
import BottomNavigation from "./components/ui/BottomNavigation";

const GEN_BOOT_IMAGE_PATH = "/src/assets/images/moongs_smart_boot_1779337373219.png";
const heatLabels = ["OFF", "38°C", "41°C", "45°C"];

export default function App() {
  const bluetoothDeviceRef = useRef<any>(null);
  const bluetoothCleanupRef = useRef<(() => void) | null>(null);
  const bluetoothConnectingRef = useRef(false);
  const bluetoothAttemptRef = useRef(0);
  const [bluetoothStatus, setBluetoothStatus] = useState("");
  
  // Web Serial API state & refs
  const [isSerialConnected, setIsSerialConnected] = useState<boolean>(false);
  const [serialError, setSerialError] = useState<string | null>(null);
  const [latestRawSerialData, setLatestRawSerialData] = useState<string>("");
  const serialPortRef = useRef<any>(null);
  const serialReaderRef = useRef<any>(null);
  const serialKeepReadingRef = useRef<boolean>(true);
  const serialReadTaskRef = useRef<Promise<void> | null>(null);
  const [serialBaudRate, setSerialBaudRate] = useState(() => {
    const saved = Number(localStorage.getItem('moongs_serial_baud'));
    return [9600, 19200, 38400, 57600, 115200, 230400].includes(saved) ? saved : defaultBaudRate;
  });
  const [serialDiagnostic, setSerialDiagnostic] = useState("");
  const serialModeRef = useRef<'usb' | 'bluetooth'>('usb');
  const changeSerialBaudRate = (rate: number) => {
    setSerialBaudRate(rate);
    localStorage.setItem('moongs_serial_baud', String(rate));
  };

  const [viewMode, setViewMode] = useState<"simulator" | "grid">("simulator");
  const [activeScreen, setActiveScreen] = useState<string>("home");

  // Telemetry state
  const [state, setState] = useState<AppState>({
    tightnessIntensity: 70,
    isSimulatingWalking: false,
    isIoTConnected: false,
        telemetry: undefined,
    batteryLevel: 87,
    sensorData: {
      leftFoot: { forefoot: 35, midfoot: 42, heel: 38, piezo1: 35, piezo2: 38, piezo3: 40, piezo4: 38, status: "normal" },
      rightFoot: { forefoot: 88, midfoot: 62, heel: 35, piezo1: 88, piezo2: 85, piezo3: 38, piezo4: 32, status: "danger" }
    },
    gaitMetrics: {
      stepCount: 5421,
      distanceKm: 3.8,
      balanceScore: 85,
      weightDistributionLeft: 48,
      weightDistributionRight: 52,
      walkingTimeMin: 45,
      avgSpeedKmh: 4.2,
      exerciseTimeMin: 20,
      lsiSymmetry: 94,
      gaitSimilarity: 91
    },
    tightnessHistory: [
      { time: "06시", intensity: 65 },
      { time: "10시", intensity: 68 },
      { time: "12시", intensity: 75 },
      { time: "18시", intensity: 70 },
      { time: "24시", intensity: 70 }
    ],
    notifications: [
      { 
         id: "1", 
         timestamp: "오전 09:30", 
         title: "🔴 보상 보행 감지", 
         message: "부상 방지로 인해 오른발 디딤이 조심스러워지는 비정상적 보상 보행(LSI 불균형)이 검출되었습니다.", 
         type: "danger" 
      },
      { 
         id: "2", 
         timestamp: "오전 10:15", 
         title: "⚠️ 오른발 앞발(전족부) 과도 하중 쏠림 경고", 
         message: "전체 체중 대비 오른발(부상발) 앞쪽(전족부 S1, S2)에 하중이 쏠리고 있습니다. 뒤꿈치 쪽으로 완충 균형 조절을 추천합니다.", 
         type: "warning" 
      },
      { 
         id: "3", 
         timestamp: "오전 11:00", 
         title: "⚠️ 방향 전환 운동 부적합 알림", 
         message: "현재 무릎 골관절 지지 회복율 대비, 방향 전환이 급한 격렬한 운동은 자제하시기 바랍니다.", 
         type: "warning" 
      }
    ],
    painScore: 3,
    painStatus: "neutral",
    bluetoothDeviceName: undefined,
    isBluetoothScanning: false,
    scannedDevices: []
  });

  useEffect(() => {
    if (!isSerialConnected || !state.telemetry?.received) return;
    if (state.telemetry.hasPressure) setSerialDiagnostic('압력 센서 데이터 수신 중');
    else if (state.imuData) setSerialDiagnostic('IMU 데이터 수신 중 · 압력 센서 데이터는 아직 없습니다.');
  }, [isSerialConnected, state.telemetry?.received, state.telemetry?.hasPressure, state.imuData]);

  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { 
      role: "model", 
      text: "안녕하세요! MOONGS AI 코치입니다. 오른발 앞발에 과압력이 감지되었으니 발바닥 전체로 체중을 균등히 분산해 주세요!",
      timestamp: "현재"
    }
  ]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  useEffect(() => {
    if (state.telemetry) setChatMessages([{ role: "model", text: "기기가 연결되었습니다. 수신한 압력 데이터를 기준으로 안내합니다. 보행 대칭성과 운동 복귀 상태는 추가 측정이 필요합니다.", timestamp: "현재" }]);
  }, [!!state.telemetry]);
  const [heatTherapy, setHeatTherapy] = useState<number>(2); 
  const [muscleStim, setMuscleStim] = useState<boolean>(false);
  const [stimIntensity, setStimIntensity] = useState<number>(40);

  // walking physics loop
  useEffect(() => {
    let interval: any = null;
    if (state.isSimulatingWalking && !state.telemetry) {
      interval = setInterval(() => {
        setState(prev => {
          const nextSteps = prev.gaitMetrics.stepCount + Math.floor(Math.random() * 3) + 1;
          const nextDist = parseFloat((prev.gaitMetrics.distanceKm + 0.002).toFixed(3));
          
          const deviation = Math.floor(Math.sin(Date.now() / 1500) * 4);
          const leftWeight = Math.min(Math.max(48 + deviation, 43), 55);
          const rightWeight = 100 - leftWeight;
          
          const baseBalance = leftWeight === 50 ? 98 : Math.max(98 - Math.abs(50 - leftWeight) * 4, 75);

          const isSteppingLeft = deviation > 0;
          const leftFore = Math.floor(30 + Math.random() * 15 + (isSteppingLeft ? 20 : 0));
          const leftMid = Math.floor(35 + Math.random() * 10 + (isSteppingLeft ? 15 : 0));
          const leftHeel = Math.floor(30 + Math.random() * 15 + (isSteppingLeft ? 25 : 0));

          // Right foot: Forefoot (front) heavy
          const rightFore = Math.floor(82 + Math.random() * 8 + (!isSteppingLeft ? 6 : 0));
          const rightMid = Math.floor(55 + Math.random() * 8);
          const rightHeel = Math.floor(32 + Math.random() * 8);
          const rP1 = Math.min(98, rightFore + Math.floor(Math.random() * 4 - 2));
          const rP2 = Math.min(98, rightFore - 3 + Math.floor(Math.random() * 4 - 2));
          const rP3 = Math.max(20, rightHeel + Math.floor(Math.random() * 4 - 2));
          const rP4 = Math.max(20, rightHeel - 3 + Math.floor(Math.random() * 4 - 2));

          const nextWalkingTime = parseFloat((prev.gaitMetrics.walkingTimeMin + 0.05).toFixed(2));
          const nextSpeed = parseFloat((prev.gaitMetrics.avgSpeedKmh + (Math.random() * 0.2 - 0.1)).toFixed(2));
          const boundedSpeed = Math.min(Math.max(nextSpeed, 3.8), 4.8);
          const nextLsi = Math.min(Math.max(Math.round(baseBalance - 1), 75), 98);
          const nextSimilarity = Math.min(Math.max(Math.round(baseBalance - 3), 73), 96);

          return {
            ...prev,
            gaitMetrics: {
              ...prev.gaitMetrics,
              stepCount: nextSteps,
              distanceKm: nextDist,
              balanceScore: Math.round(baseBalance),
              weightDistributionLeft: leftWeight,
              weightDistributionRight: rightWeight,
              walkingTimeMin: nextWalkingTime,
              avgSpeedKmh: boundedSpeed,
              lsiSymmetry: nextLsi,
              gaitSimilarity: nextSimilarity
            },
            sensorData: {
              leftFoot: {
                forefoot: leftFore,
                midfoot: leftMid,
                heel: leftHeel,
                piezo1: leftFore,
                piezo2: leftFore,
                piezo3: leftHeel,
                piezo4: leftHeel,
                status: leftHeel > 80 ? "danger" : leftHeel > 70 ? "warning" : "normal"
              },
              rightFoot: {
                forefoot: rightFore,
                midfoot: rightMid,
                heel: rightHeel,
                piezo1: rP1,
                piezo2: rP2,
                piezo3: rP3,
                piezo4: rP4,
                status: rightFore > 80 ? "danger" : rightFore > 70 ? "warning" : "normal"
              }
            }
          };
        });
      }, 800);
    } else {
      if (interval) clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [state.isSimulatingWalking, state.telemetry]);

  const handleTightnessChange = (value: number) => {
    setState(prev => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
      const newHistory = [...prev.tightnessHistory.slice(1), { time: timeStr, intensity: value }];
      
      let newLogs = [...prev.notifications];
      newLogs.unshift({
        id: `tight-${Date.now()}`,
        timestamp: "방금 전",
        title: "⚙️ 조임 압력 제어 완료",
        message: `스마트 깁스 에어 백 팽창률이 ${value}%로 실시간 변경 및 동기화 되었습니다.`,
        type: "success"
      });

      return {
        ...prev,
        tightnessIntensity: value,
        tightnessHistory: newHistory,
        notifications: newLogs.slice(0, 5)
      };
    });
  };

  const triggerPressureAlert = () => {
    setState(prev => {
      let newLogs = [...prev.notifications];
      newLogs.unshift({
        id: `alert-manual-${Date.now()}`,
        timestamp: "방금 전",
        title: "🚨 체중 불균형 및 위험 한계 감지",
        message: "계도되지 않은 위험 보행 자세가 수집되었습니다. 좌측 발목 외측 이탈 각도가 우측에 비해 12% 틀어졌습니다.",
        type: "danger"
      });

      return {
        ...prev,
        notifications: newLogs.slice(0, 5),
        gaitMetrics: {
          ...prev.gaitMetrics,
          balanceScore: 68,
          weightDistributionLeft: 30,
          weightDistributionRight: 70
        }
      };
    });
  };

  const startBluetoothScan = async () => {
    if (bluetoothConnectingRef.current) return;
    setSerialError(null);
    if (!(navigator as any).bluetooth) {
      setSerialError("이 브라우저에서 블루투스 연결을 지원하지 않습니다. Chrome 또는 Edge에서 앱을 열어 주세요.");
      return;
    }
    bluetoothConnectingRef.current = true;
    const attempt = ++bluetoothAttemptRef.current;
    const current = () => attempt === bluetoothAttemptRef.current;
    let stage = "기기 선택";
    setBluetoothStatus(stage);
    setState(prev => ({ ...prev, isBluetoothScanning: true, scannedDevices: [] }));
    let device: any;
    try {
      // Keep requestDevice directly inside the user's click activation.
      device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [...sensorServices, 'battery_service', 'device_information']
      });
      if (!current()) return;
      if (serialPortRef.current) await disconnectSerial();
      if (!current()) return;
      bluetoothCleanupRef.current?.();
      const previous = bluetoothDeviceRef.current;
      bluetoothDeviceRef.current = device;
      if (previous && previous !== device && previous.gatt?.connected) previous.gatt.disconnect();
      device.addEventListener('gattserverdisconnected', () => {
        if (!current() || bluetoothDeviceRef.current !== device) return;
        bluetoothCleanupRef.current?.();
        bluetoothCleanupRef.current = null;
        setBluetoothStatus("연결 해제됨");
        setState(prev => ({ ...prev, isIoTConnected: false, bluetoothDeviceName: undefined }));
      }, { once: true });
      if (!device.gatt) throw new Error("BLE 데이터 연결을 지원하지 않는 기기입니다.");
      stage = "기기에 연결 중";
      setBluetoothStatus(`${device.name || '센서'} · ${stage}`);
      const server = device.gatt.connected ? device.gatt : await device.gatt.connect();
      if (!current()) { server.disconnect(); return; }
      setLatestRawSerialData("");
      setState(prev => ({ ...beginLiveSession(prev), isIoTConnected: false, bluetoothDeviceName: device.name }));
      stage = "센서 수신 설정";
      setBluetoothStatus(stage);
      const cleanup = await subscribeSensor(server,
        chunk => { if (current()) setLatestRawSerialData(chunk.trim() + " (BLE)"); },
        line => { if (current()) parseAndApplySensorLine(line, "Bluetooth"); });
      if (!current()) { cleanup(); server.disconnect(); return; }
      bluetoothCleanupRef.current = cleanup;
      if (!server.connected) throw new Error("센서 설정 중 연결이 해제되었습니다.");
      setState(prev => ({ ...prev, isIoTConnected: true, bluetoothDeviceName: device.name || "MOONGS 센서" }));
      setBluetoothStatus("센서 연결 완료 · 데이터 수신 대기");
      // Battery is optional and cannot block sensor connection success.
      try {
        const service = await server.getPrimaryService('battery_service');
        const characteristic = await service.getCharacteristic('battery_level');
        const battery = (await characteristic.readValue()).getUint8(0);
        if (!current()) return;
        setState(prev => ({ ...prev, batteryLevel: battery, telemetry: { ...prev.telemetry!, hasBattery: true } }));
      } catch { /* The prototype may not implement a battery service. */ }
    } catch (error) {
      if (!current()) return;
      const message = bluetoothError(error, stage);
      setSerialError(message);
      setBluetoothStatus("연결 실패");
      bluetoothCleanupRef.current?.();
      bluetoothCleanupRef.current = null;
      if (bluetoothDeviceRef.current === device) bluetoothDeviceRef.current = null;
      if (device?.gatt?.connected) device.gatt.disconnect();
      setState(prev => ({ ...prev, isIoTConnected: !!serialPortRef.current, bluetoothDeviceName: serialPortRef.current ? prev.bluetoothDeviceName : undefined }));
    } finally {
      if (current()) {
        bluetoothConnectingRef.current = false;
        setState(prev => ({ ...prev, isBluetoothScanning: false, scannedDevices: [] }));
      }
    }
  };

  const connectBluetoothDevice = () => { void startBluetoothScan(); };

  const disconnectBluetooth = () => {
    bluetoothAttemptRef.current++;
    bluetoothConnectingRef.current = false;
    bluetoothCleanupRef.current?.();
    bluetoothCleanupRef.current = null;
    setBluetoothStatus("");
    if (bluetoothDeviceRef.current) {
      try {
        if (bluetoothDeviceRef.current.gatt && bluetoothDeviceRef.current.gatt.connected) {
          bluetoothDeviceRef.current.gatt.disconnect();
        }
      } catch (err) {
        console.log("Disconnection action complete:", err);
      }
      bluetoothDeviceRef.current = null;
    }

    setState(prev => {
      let newLogs = [...prev.notifications];
      newLogs.unshift({
        id: `unpair-${Date.now()}`,
        timestamp: "방금 전",
        title: "⚪ 블루투스 통신 종료",
        message: `'${prev.bluetoothDeviceName || "스마트 깁스"}' 기기와의 데이터 수집 및 안전 전송 커넥션이 정상 중단되었습니다.`,
        type: "warning"
      });

      return {
        ...prev,
        isIoTConnected: false,
        telemetry: undefined,
        bluetoothDeviceName: undefined,
        notifications: newLogs.slice(0, 5)
      };
    });
  };

  const resetBluetooth = async () => {
    bluetoothAttemptRef.current++;
    bluetoothConnectingRef.current = false;
    bluetoothCleanupRef.current?.();
    bluetoothCleanupRef.current = null;
    const device = bluetoothDeviceRef.current;
    bluetoothDeviceRef.current = null;
    if (device?.gatt?.connected) device.gatt.disconnect();
    if (serialPortRef.current && serialModeRef.current === 'bluetooth') await disconnectSerial();
    setSerialError(null);
    setBluetoothStatus('앱 연결 초기화 완료 · 브라우저 기기 권한 삭제 중');
    try {
      const result = await forgetSensorDevices((navigator as any).bluetooth, device);
      if (result.manual || !result.supported) {
        setBluetoothStatus('앱 연결 초기화 완료 · 저장된 권한은 Chrome 사이트 설정에서 MOONGS 기기를 삭제해 주세요.');
      } else if (result.forgotten) {
        setBluetoothStatus('앱 연결과 MOONGS 기기 접근 권한 삭제 완료 · 다시 기기를 선택해 주세요.');
      } else {
        setBluetoothStatus('앱 연결 초기화 완료 · 삭제할 브라우저 기기 권한이 없습니다. 운영체제 페어링은 Mac 블루투스 설정에서 삭제해 주세요.');
      }
    } catch {
      setBluetoothStatus('앱 연결 초기화 완료 · 브라우저 권한 삭제 실패: Chrome 사이트 설정에서 MOONGS 기기를 삭제해 주세요.');
    }
    if (!serialPortRef.current) {
      setLatestRawSerialData('');
      setState(prev => ({ ...beginLiveSession(prev), isIoTConnected: false, bluetoothDeviceName: undefined,
        isBluetoothScanning: false, scannedDevices: [] }));
    } else {
      setState(prev => ({ ...prev, isBluetoothScanning: false, scannedDevices: [] }));
    }
  };

  const startSerialPort = async (port: any, mode: 'usb' | 'bluetooth') => {
    await openSerialPort(port, serialBaudRate);
    serialPortRef.current = port;
    serialModeRef.current = mode;
    serialKeepReadingRef.current = true;
    setIsSerialConnected(true);
    setLatestRawSerialData("");
    setSerialDiagnostic(`${serialBaudRate} baud · 포트 연결 완료, 센서 데이터 수신 대기`);
    setBluetoothStatus("");
    setState(prev => ({ ...beginLiveSession(prev), isIoTConnected: true,
      bluetoothDeviceName: mode === 'bluetooth' ? 'Bluetooth Serial' : 'USB Serial' }));
    serialReadTaskRef.current = readSerialLoop(port);
  };

  const connectSerial = async (mode: 'usb' | 'bluetooth' = 'usb') => {
    setSerialError(null);
    if (!('serial' in navigator)) {
      setSerialError("이 브라우저는 시리얼 연결을 지원하지 않습니다. 데스크톱 Chrome에서 열어 주세요.");
      return;
    }
    try {
      const port = await (navigator as any).serial.requestPort();
      if (serialPortRef.current) await disconnectSerial();
      if (bluetoothDeviceRef.current?.gatt?.connected) disconnectBluetooth();
      await startSerialPort(port, mode);
    } catch (err: any) {
      setSerialError(err.name === 'NotFoundError' ? '포트를 선택하지 않았습니다. 일반 블루투스 시리얼 기기는 운영체제에서 먼저 페어링하고 포트 목록에서 선택해 주세요.' : `시리얼 연결 실패: ${err.message || err}`);
    }
  };

  const reconnectSerial = async () => {
    const port = serialPortRef.current;
    const mode = serialModeRef.current;
    if (!port) return;
    setSerialError(null);
    try {
      await disconnectSerial();
      await startSerialPort(port, mode);
    } catch (err: any) { setSerialError(`재연결 실패: ${err.message || err}`); }
  };

  const disconnectSerial = async () => {
    serialKeepReadingRef.current = false;
    if (serialReaderRef.current) {
      try {
        await serialReaderRef.current.cancel();
      } catch (e) {
        console.warn(e);
      }
    }
    await serialReadTaskRef.current?.catch(() => {});
    serialReadTaskRef.current = null;
    if (serialPortRef.current) {
      try {
        await serialPortRef.current.close();
      } catch (e) {
        console.warn(e);
      }
      serialPortRef.current = null;
    }
    setIsSerialConnected(false);
    setSerialDiagnostic("");
    setLatestRawSerialData("");

    setState(prev => {
      let newLogs = [...prev.notifications];
      newLogs.unshift({
        id: `serial-disc-${Date.now()}`,
        timestamp: "방금 전",
        title: "🔌 아두이노 유선 연결 종료",
        message: "아두이노 USB 시리얼 포트 연동이 해제되었습니다.",
        type: "warning"
      });
      return {
        ...prev,
        isIoTConnected: false,
        telemetry: undefined,
        bluetoothDeviceName: undefined,
        notifications: newLogs.slice(0, 5)
      };
    });
  };

  const parseAndApplySensorLine = (line: string, source: "Serial" | "Bluetooth") => {
    setState(prev => applySensorLine(prev, line, source));
  };

  const readSerialLoop = async (port: any) => {
    const reader = port.readable.getReader();
    serialReaderRef.current = reader;
    const decoder = new TextDecoder();
    const buffer = new SensorTextBuffer(line => parseAndApplySensorLine(line, "Serial"));
    let flushTimer: ReturnType<typeof setTimeout>;
    try {
      while (serialKeepReadingRef.current) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setLatestRawSerialData(prev => (prev + chunk).slice(-600));
        const diagnostic = serialTextDiagnostic(chunk);
        if (diagnostic) setSerialDiagnostic(diagnostic);
        clearTimeout(flushTimer);
        buffer.push(chunk);
        flushTimer = setTimeout(() => buffer.flush(), 120);
      }
      if (serialKeepReadingRef.current) {
        buffer.push(decoder.decode());
        buffer.flush();
      }
    } catch (err: any) {
      if (serialKeepReadingRef.current) setSerialError(`USB 센서 수신 실패: ${err.message || err}`);
    } finally {
      clearTimeout(flushTimer);
      reader.releaseLock();
      serialReaderRef.current = null;
      if (serialKeepReadingRef.current) {
        serialKeepReadingRef.current = false;
        setIsSerialConnected(false);
        setState(prev => ({ ...prev, isIoTConnected: false }));
      }
    }
  };

  useEffect(() => {
    return () => {
      serialKeepReadingRef.current = false;
    };
  }, []);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;
    
    const userMsg: ChatMessage = {
      role: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
    };

    setChatMessages(prev => [...prev, userMsg]);
    setChatInput("");
    setIsAiLoading(true);

    try {
      const response = await fetch("/api/gemini/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...chatMessages, userMsg].map(m => ({ role: m.role, text: m.text })),
          appState: state
        })
      });

      if (!response.ok) {
        throw new Error("서버와의 통신이 원활하지 않습니다.");
      }

      const data = await response.json();
      setChatMessages(prev => [
        ...prev,
        {
          role: "model",
          text: data.text || "죄송합니다, 답변을 생성하지 못했습니다.",
          timestamp: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
        }
      ]);
    } catch (error: any) {
      setChatMessages(prev => [
        ...prev,
        {
          role: "model",
          text: "지금은 AI 응답을 받지 못했어요. 잠시 후 다시 질문해 주세요.",
          timestamp: "방금 전"
        }
      ]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const presetQuestions = [
    { label: "뒤꿈치 과압력 위험 대처요령", q: "오른발 뒤꿈치 과압력 위험이 뜨는데 보행습관을 어떻게 고쳐야 하나요?" },
    { label: "현재 보행 상태 분석", q: "현재 내 보행 상태와 정상 보행과의 유사도를 상세히 분석해 줘." },
    { label: "재부상 위험 진단", q: "현재 보행 데이터를 바탕으로 재부상 위험과 운동 복귀 가능 여부를 판단해 줘." },
    { label: "재활 운동 복귀 조언", q: "오늘 걸음 수랑 무릎 상태를 봤을 때, 걷기 운동이나 가벼운 자전거 운동을 해도 괜찮을까?" }
  ];

  return (
    <div className="moongs-shell h-[100dvh] max-h-[100dvh] w-full flex items-center justify-center relative overflow-hidden font-sans selection:bg-[#6688ff]/35 selection:text-white">
      {/* Background Decorative organic floating silver & light blobs for Glassmorphism depth */}
      <div className="absolute inset-0 bg-black" aria-hidden />
      <div className="absolute top-[-10%] left-[-15%] w-[60%] h-[60%] bg-black rounded-full blur-[100px] pointer-events-none floating-background-dot" style={{ animationDuration: "14s" }} />
      <div className="absolute bottom-[5%] right-[-15%] w-[65%] h-[65%] bg-black rounded-full blur-[110px] pointer-events-none floating-background-dot" style={{ animationDuration: "18s", animationDelay: "2s" }} />
      <div className="absolute top-[35%] right-[5%] w-[45%] h-[45%] bg-black rounded-full blur-[90px] pointer-events-none floating-background-dot" style={{ animationDuration: "16s", animationDelay: "4s" }} />
      <div className="absolute bottom-[35%] left-[-10%] w-[40%] h-[40%] bg-black rounded-full blur-[80px] pointer-events-none floating-background-dot" style={{ animationDuration: "12s", animationDelay: "1s" }} />

      {/* Primary Simulator Smartphone Outline Frameless Body with rich glass backdrop-filter */}
      <div className="moongs-device flex w-full max-w-[430px] flex-col relative overflow-hidden md:rounded-[42px] md:border md:border-white/10 md:shadow-2xl">
        
        {/* Keep scrollable screen content above the navigation. */}
        <div className="relative min-h-0 flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {activeScreen === 'home' ? (
              // New redesigned Home screen (phase 1)
              <div key="home-v2" className="w-full h-full">
                {/* Lazy-load HomeV2 to avoid touching other screens' logic */}
                <React.Suspense fallback={<div />}>
                  <HomeV2 onResetBluetooth={resetBluetooth} serialBaudRate={serialBaudRate} onSerialBaudRateChange={changeSerialBaudRate} isSerialConnected={isSerialConnected} onReconnectSerial={reconnectSerial} serialDiagnostic={serialDiagnostic} bluetoothStatus={bluetoothStatus} onConnectSerial={() => connectSerial()} latestRawSerialData={latestRawSerialData} serialError={serialError} state={state} setScreenName={setActiveScreen} onStartBluetoothScan={startBluetoothScan} onDisconnectBluetooth={isSerialConnected ? disconnectSerial : disconnectBluetooth} />
                </React.Suspense>
              </div>
            ) : (
              <SmartCastScreen 
                key={activeScreen}
                screenName={activeScreen}
                state={state}
                onTightnessChange={handleTightnessChange}
                setScreenName={setActiveScreen}
                heatTherapy={heatTherapy}
                setHeatTherapy={setHeatTherapy}
                muscleStim={muscleStim}
                setMuscleStim={setMuscleStim}
                stimIntensity={stimIntensity}
                setStimIntensity={setStimIntensity}
                onPainScoreChange={(score: number) => setState(prev => ({ ...prev, painScore: score }))}
                onPainStatusChange={(status: "happy" | "neutral" | "bad" | "cry") => setState(prev => ({ ...prev, painStatus: status }))}
                chatMessages={chatMessages}
                chatInput={chatInput}
                setChatInput={setChatInput}
                onSendMessage={handleSendMessage}
                isAiLoading={isAiLoading}
                presetQuestions={presetQuestions}
                onToggleSimulateWalking={() => setState(prev => prev.telemetry ? prev : ({ ...prev, isSimulatingWalking: !prev.isSimulatingWalking }))}
                onTriggerPressureAlert={triggerPressureAlert}
                onAddManualSteps={() => setState(prev => ({
                  ...prev,
                  gaitMetrics: {
                    ...prev.gaitMetrics,
                    stepCount: prev.gaitMetrics.stepCount + 500,
                    distanceKm: parseFloat((prev.gaitMetrics.distanceKm + 0.35).toFixed(2)),
                    walkingTimeMin: prev.gaitMetrics.walkingTimeMin + 4
                  }
                }))}
                onToggleIoTConnection={() => setState(prev => ({ ...prev, isIoTConnected: !prev.isIoTConnected }))}
                onUpdateManualPressure={(fore: number, mid: number, heel: number) => {
                  setState(prev => {
                    const leftFore = Math.min(Math.max(100 - fore, 30), 65);
                    const leftMid = Math.min(Math.max(100 - mid, 35), 60);
                    const leftHeel = Math.min(Math.max(100 - heel, 25), 55);
                    const leftTotal = leftFore + leftMid + leftHeel;
                    const rightTotal = fore + mid + heel;
                    const total = leftTotal + rightTotal;
                    const rightWeight = total > 0 ? Math.round((rightTotal / total) * 100) : 50;
                    const leftWeight = 100 - rightWeight;
                    const balanceScore = leftWeight === 50 ? 98 : Math.max(98 - Math.abs(50 - leftWeight) * 3, 55);
                    return {
                      ...prev,
                      sensorData: {
                        leftFoot: { forefoot: leftFore, midfoot: leftMid, heel: leftHeel, status: "normal" },
                        rightFoot: { forefoot: fore, midfoot: mid, heel: heel, status: heel > 80 ? "danger" : heel > 70 ? "warning" : "normal" }
                      },
                      gaitMetrics: {
                        ...prev.gaitMetrics,
                        balanceScore,
                        weightDistributionLeft: leftWeight,
                        weightDistributionRight: rightWeight,
                        lsiSymmetry: Math.min(Math.max(balanceScore - 1, 55), 98),
                        gaitSimilarity: Math.min(Math.max(balanceScore - 3, 50), 96)
                      }
                    };
                  });
                }}
                onResetSampleData={() => {
                  setState(prev => ({
                    ...prev,
                    gaitMetrics: {
                      stepCount: 0,
                      distanceKm: 0,
                      balanceScore: 100,
                      weightDistributionLeft: 50,
                      weightDistributionRight: 50,
                      walkingTimeMin: 0,
                      avgSpeedKmh: 0,
                      exerciseTimeMin: 0,
                      lsiSymmetry: 100,
                      gaitSimilarity: 100
                    },
                    sensorData: {
                      leftFoot: { forefoot: 0, midfoot: 0, heel: 0, status: "normal" },
                      rightFoot: { forefoot: 0, midfoot: 0, heel: 0, status: "normal" }
                    }
                  }));
                }}
                onResetBluetooth={resetBluetooth}
                onStartBluetoothScan={startBluetoothScan}
                onConnectBluetoothDevice={connectBluetoothDevice}
                onDisconnectBluetooth={isSerialConnected ? disconnectSerial : disconnectBluetooth}
                serialBaudRate={serialBaudRate}
                onSerialBaudRateChange={changeSerialBaudRate}
                onReconnectSerial={reconnectSerial}
               
                serialDiagnostic={serialDiagnostic}
                isSerialSupported={typeof navigator !== "undefined" && "serial" in navigator}
                isSerialConnected={isSerialConnected}
                onConnectSerial={() => connectSerial()}
                onDisconnectSerial={disconnectSerial}
                serialError={serialError || undefined}
                latestRawSerialData={latestRawSerialData}
              />
            )}
          </AnimatePresence>
        </div>

        <BottomNavigation activeScreen={activeScreen} onNavigate={setActiveScreen} />
      </div>
    </div>
  );
}
