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
import BottomNavigation from "./components/ui/BottomNavigation";

const GEN_BOOT_IMAGE_PATH = "/src/assets/images/moongs_smart_boot_1779337373219.png";
const heatLabels = ["OFF", "38°C", "41°C", "45°C"];

export default function App() {
  const bluetoothDeviceRef = useRef<any>(null);
  
  // Web Serial API state & refs
  const [isSerialConnected, setIsSerialConnected] = useState<boolean>(false);
  const [serialError, setSerialError] = useState<string | null>(null);
  const [latestRawSerialData, setLatestRawSerialData] = useState<string>("");
  const serialPortRef = useRef<any>(null);
  const serialReaderRef = useRef<any>(null);
  const serialKeepReadingRef = useRef<boolean>(true);
  const lastUpdateTimeRef = useRef<number>(0);

  const [viewMode, setViewMode] = useState<"simulator" | "grid">("simulator");
  const [activeScreen, setActiveScreen] = useState<string>("home");

  // Telemetry state
  const [state, setState] = useState<AppState>({
    tightnessIntensity: 70,
    isSimulatingWalking: false,
    isIoTConnected: false,
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

  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { 
      role: "model", 
      text: "안녕하세요! MOONGS AI 코치입니다. 오른발 앞발에 과압력이 감지되었으니 발바닥 전체로 체중을 균등히 분산해 주세요!",
      timestamp: "현재"
    }
  ]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [heatTherapy, setHeatTherapy] = useState<number>(2); 
  const [muscleStim, setMuscleStim] = useState<boolean>(false);
  const [stimIntensity, setStimIntensity] = useState<number>(40);

  // walking physics loop
  useEffect(() => {
    let interval: any = null;
    if (state.isSimulatingWalking) {
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
  }, [state.isSimulatingWalking]);

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

  const startBluetoothScan = () => {
    setState(prev => ({
      ...prev,
      isBluetoothScanning: true,
      scannedDevices: []
    }));

    const isBleSupported = typeof navigator !== "undefined" && (navigator as any).bluetooth;

    if (isBleSupported) {
      setState(prev => {
        let newLogs = [...prev.notifications];
        newLogs.unshift({
          id: `ble-info-${Date.now()}`,
          timestamp: "방금 전",
          title: "📡 브라우저 블루투스 연동 활성화",
          message: "브라우저의 실제 스마트 기기 탐색 창이 열렸습니다. 연결할 스마트 깁스 또는 건강 측정 BLE 하드웨어를 선택해 주세요.",
          type: "info"
        });
        return { ...prev, notifications: newLogs.slice(0, 5) };
      });

      (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          'battery_service',
          'device_information',
          '0000ffe0-0000-1000-8000-00805f9b34fb',
          '0000180d-0000-1000-8000-00805f9b34fb'
        ]
      })
      .then((device: any) => {
        bluetoothDeviceRef.current = device;
        
        device.addEventListener('gattserverdisconnected', () => {
          setState(prev => {
            let newLogs = [...prev.notifications];
            newLogs.unshift({
              id: `ble-disc-${Date.now()}`,
              timestamp: "방금 전",
              title: "⚪ 블루투스 연결 해제됨",
              message: `'${device.name || "Bluetooth 장치"}'와의 통신 연결이 중단되었습니다.`,
              type: "warning"
            });
            return {
              ...prev,
              isIoTConnected: false,
              bluetoothDeviceName: undefined,
              notifications: newLogs.slice(0, 5)
            };
          });
        });

        setState(prev => {
          let newLogs = [...prev.notifications];
          newLogs.unshift({
            id: `ble-conn-${Date.now()}`,
            timestamp: "방금 전",
            title: "🔵 GATT 서버 연결 수립 중...",
            message: `'${device.name || "스마트 하드웨어"}' 장비의 GATT 서버 인스턴스 전진 연결을 전개합니다.`,
            type: "info"
          });
          return { ...prev, notifications: newLogs.slice(0, 5) };
        });

        return device.gatt.connect();
      })
      .then((server: any) => {
        // Try to get primary service for Serial-over-BLE (FFE0/FFE1) and run characteristic listener
        server.getPrimaryService('0000ffe0-0000-1000-8000-00805f9b34fb')
          .then((service: any) => service.getCharacteristic('0000ffe1-0000-1000-8000-00805f9b34fb'))
          .then((characteristic: any) => {
            characteristic.startNotifications();
            let bleAccumulator = "";
            characteristic.addEventListener('characteristicvaluechanged', (event: any) => {
              const value = event.target.value;
              const decoder = new TextDecoder();
              const chunk = decoder.decode(value);
              setLatestRawSerialData(chunk.trim() + " (BLE)");
              
              bleAccumulator += chunk;
              const lines = bleAccumulator.split(/\r?\n/);
              bleAccumulator = lines.pop() || "";
              
              for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed) {
                  parseAndApplySensorLine(trimmed, "Bluetooth");
                }
              }
            });
          })
          .catch((e: any) => {
            console.log("FFE0/FFE1 BLE Serial service is not available or bypassed on this device:", e);
          });

        return server.getPrimaryService('battery_service')
          .then((service: any) => service.getCharacteristic('battery_level'))
          .then((characteristic: any) => {
            characteristic.startNotifications();
            characteristic.addEventListener('characteristicvaluechanged', (event: any) => {
              const val = event.target.value.getUint8(0);
              setState(prev => ({ ...prev, batteryLevel: val }));
            });
            return characteristic.readValue();
          })
          .then((value: any) => {
            const batteryVal = value.getUint8(0);
            setState(prev => ({ ...prev, batteryLevel: batteryVal }));
          })
          .catch((e: any) => {
            console.log("Battery service read bypassed or unsupported on this BLE device:", e);
          })
          .then(() => {
            setState(prev => {
              let newLogs = [...prev.notifications];
              newLogs.unshift({
                id: `ble-success-${Date.now()}`,
                timestamp: "방금 전",
                title: "🟢 실제 블루투스 연결 수립 완료!",
                message: `기기 '${bluetoothDeviceRef.current?.name || "Moongs-Cast-Real"}'와 실제 물리 무선 채널 세션이 바인딩되었습니다.`,
                type: "success"
              });
              return {
                ...prev,
                isIoTConnected: true,
                isBluetoothScanning: false,
                bluetoothDeviceName: bluetoothDeviceRef.current?.name || "MOONGS-Cast-Real",
                notifications: newLogs.slice(0, 5)
              };
            });
          });
      })
      .catch((err: any) => {
        console.warn("Web Bluetooth error or pairing cancelled:", err);
        
        setState(prev => {
          let newLogs = [...prev.notifications];
          newLogs.unshift({
            id: `ble-err-${Date.now()}`,
            timestamp: "방금 전",
            title: "⚠️ 블루투스 검색 제한/취소됨",
            message: `물리 환경 무선 수색 대기 중: ${err.message || "사용자 취소 또는 브라우저 제한"}. 대신 예비 장치 목록에서 선택하세요!`,
            type: "warning"
          });
          return { ...prev, notifications: newLogs.slice(0, 5) };
        });
      });
    }

    setTimeout(() => {
      setState(prev => {
        if (!prev.isBluetoothScanning) return prev;
        const testDevices = [
          { name: "[실제 BLE 검색 재시도] 스마트폰/PC 무선 검색창 띄우기", rssi: -30, address: "PHYSICAL:BLE:REQUEST" },
          { name: "MOONGS-Cast-04F (테스트 에뮬레이터)", rssi: -45, address: "EMULATOR:01" },
          { name: "MOONGS-AirBoot-X (테스트 에뮬레이터)", rssi: -62, address: "EMULATOR:02" },
          { name: "MediCast-Sensor-V3", rssi: -89, address: "EMULATOR:03" }
        ];
        
        let newLogs = [...prev.notifications];
        newLogs.unshift({
          id: `ble-scan-${Date.now()}`,
          timestamp: "방금 전",
          title: "📡 장치 수색 완료",
          message: `주변 무선 대역 수색 결과 총 ${testDevices.length}개의 정형계 하드웨어 타겟이 식별되었습니다.`,
          type: "info"
        });

        return {
          ...prev,
          isBluetoothScanning: false,
          scannedDevices: testDevices,
          notifications: newLogs.slice(0, 5)
        };
      });
    }, 1800);
  };

  const connectBluetoothDevice = (deviceName: string) => {
    if (deviceName.includes("PHYSICAL:BLE:REQUEST") || deviceName.includes("물리 무선") || deviceName.includes("실제 BLE 경고")) {
      startBluetoothScan();
      return;
    }

    setState(prev => {
      let newLogs = [...prev.notifications];
      newLogs.unshift({
        id: `pairing-${Date.now()}`,
        timestamp: "방금 전",
        title: "🔵 무선 페어링 활성화",
        message: `'${deviceName}' 의료 동기화 및 온도 제어 패킷 채널 세션이 수립되었습니다.`,
        type: "success"
      });

      return {
        ...prev,
        isIoTConnected: true,
        bluetoothDeviceName: deviceName,
        batteryLevel: 98,
        notifications: newLogs.slice(0, 5)
      };
    });
  };

  const disconnectBluetooth = () => {
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
        bluetoothDeviceName: undefined,
        notifications: newLogs.slice(0, 5)
      };
    });
  };

  // --- Web Serial API (Wired Cable Link with Arduino Uno) handlers ---
  const connectSerial = async () => {
    setSerialError(null);
    if (typeof navigator === "undefined" || !("serial" in navigator)) {
      setSerialError("브라우저가 Web Serial API를 지원하지 않거나 보안상 차단되었습니다. 우측 상단의 '새 창으로 열기' 버튼을 클릭해 새 탭에서 열어주세요!");
      return;
    }

    try {
      const port = await (navigator as any).serial.requestPort();
      serialPortRef.current = port;
      await port.open({ baudRate: 9600 });
      setIsSerialConnected(true);
      serialKeepReadingRef.current = true;

      setState(prev => {
        let newLogs = [...prev.notifications];
        newLogs.unshift({
          id: `serial-conn-${Date.now()}`,
          timestamp: "방금 전",
          title: "🔌 아두이노 유선 연결 성공!",
          message: "USB 시리얼 포트를 통해 아두이노 우노와 유선 연동을 수립했습니다. 실시간 발바닥 하중 센서 수신을 개시합니다.",
          type: "success"
        });
        return {
          ...prev,
          isIoTConnected: true,
          bluetoothDeviceName: "Arduino Uno (USB Serial)",
          notifications: newLogs.slice(0, 5)
        };
      });

      readSerialLoop(port);
    } catch (err: any) {
      console.error("Serial port opening error:", err);
      setSerialError(err.message || "시리얼 포트를 열지 못했습니다. 장치 연결 상태 및 권한을 확인하고 새 탭(공유 링크)에서 다시 시도해 주세요.");
    }
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
    if (serialPortRef.current) {
      try {
        await serialPortRef.current.close();
      } catch (e) {
        console.warn(e);
      }
      serialPortRef.current = null;
    }
    setIsSerialConnected(false);
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
        bluetoothDeviceName: undefined,
        notifications: newLogs.slice(0, 5)
      };
    });
  };

  // --- Common Sensor Data Parser with Ultra-Fast 50ms Throttling ---
  const parseAndApplySensorLine = (line: string, source: "Serial" | "Bluetooth") => {
    if (!line || !line.trim()) return;
    const trimmed = line.trim();

    // 50ms 스로틀링: 실시간 압력 변화를 0.05초 만에 연동하여 사용자 터치 및 압전소자 변화를 즉각 반영
    const now = Date.now();
    if (now - lastUpdateTimeRef.current < 50) {
      return;
    }
    lastUpdateTimeRef.current = now;

    // 1) Key-Value 포맷 처리 (예: "F:45, M:30, H:85" 또는 "RF:45, RM:30, RH:85" 또는 "P:45,30,85")
    let extractedFore: number | null = null;
    let extractedMid: number | null = null;
    let extractedHeel: number | null = null;

    if (trimmed.includes(":") || trimmed.toUpperCase().includes("F") || trimmed.toUpperCase().includes("H")) {
      const kvPairs = trimmed.split(/[,;\s]+/);
      for (const pair of kvPairs) {
        const [k, v] = pair.split(":").map(s => s.trim().toUpperCase());
        const numVal = parseFloat(v || k);
        if (!isNaN(numVal)) {
          if (k === "F" || k === "RF" || k === "FORE") extractedFore = numVal;
          if (k === "M" || k === "RM" || k === "MID") extractedMid = numVal;
          if (k === "H" || k === "RH" || k === "HEEL") extractedHeel = numVal;
        }
      }
    }

    const parts = trimmed.split(",").map(p => parseFloat(p.trim())).filter(p => !isNaN(p));

    setState(prev => {
      let leftFore = prev.sensorData.leftFoot.forefoot;
      let leftMid = prev.sensorData.leftFoot.midfoot;
      let leftHeel = prev.sensorData.leftFoot.heel;
      let rightFore = prev.sensorData.rightFoot.forefoot;
      let rightMid = prev.sensorData.rightFoot.midfoot;
      let rightHeel = prev.sensorData.rightFoot.heel;
      let stepCount = prev.gaitMetrics.stepCount;

      let minX = parts.length >= 5 ? parts[4] : 0;
      let maxX = parts.length >= 6 ? parts[5] : 0;
      let minY = parts.length >= 7 ? parts[6] : 0;
      let maxY = parts.length >= 8 ? parts[7] : 0;

      const scaleVal = (v: number) => {
        if (v > 100) {
          return Math.min(Math.round((v / 1023) * 100), 100);
        }
        return Math.min(Math.max(Math.round(v), 0), 100);
      };

      let rPiezo1 = prev.sensorData.rightFoot.piezo1 ?? prev.sensorData.rightFoot.forefoot;
      let rPiezo2 = prev.sensorData.rightFoot.piezo2 ?? prev.sensorData.rightFoot.forefoot;
      let rPiezo3 = prev.sensorData.rightFoot.piezo3 ?? prev.sensorData.rightFoot.heel;
      let rPiezo4 = prev.sensorData.rightFoot.piezo4 ?? prev.sensorData.rightFoot.heel;

      if (extractedFore !== null || extractedMid !== null || extractedHeel !== null) {
        if (extractedFore !== null) { rightFore = scaleVal(extractedFore); rPiezo1 = rightFore; rPiezo2 = rightFore; }
        if (extractedMid !== null) rightMid = scaleVal(extractedMid);
        if (extractedHeel !== null) { rightHeel = scaleVal(extractedHeel); rPiezo3 = rightHeel; rPiezo4 = rightHeel; }
      } else if (parts.length >= 7) {
        const p1 = scaleVal(parts[0]);
        const p2 = scaleVal(parts[1]);
        const p3 = scaleVal(parts[2]);
        const p4 = scaleVal(parts[3]);
        
        rPiezo1 = p1;
        rPiezo2 = p2;
        rPiezo3 = p3;
        rPiezo4 = p4;

        rightFore = Math.round((p1 + p2) / 2);
        rightMid = Math.round((p1 + p2 + p3 + p4) / 4);
        rightHeel = Math.round((p3 + p4) / 2);

        const rightTotal = rightFore + rightMid + rightHeel;
        if (rightTotal > 10) {
          leftFore = Math.min(Math.max(100 - rightFore, 35), 65);
          leftMid = Math.min(Math.max(100 - rightMid, 40), 60);
          leftHeel = Math.min(Math.max(100 - rightHeel, 30), 55);
        }
      } else if (parts.length >= 6) {
        leftFore = scaleVal(parts[0]);
        leftMid = scaleVal(parts[1]);
        leftHeel = scaleVal(parts[2]);
        rightFore = scaleVal(parts[3]);
        rightMid = scaleVal(parts[4]);
        rightHeel = scaleVal(parts[5]);
        rPiezo1 = rightFore;
        rPiezo2 = rightFore;
        rPiezo3 = rightHeel;
        rPiezo4 = rightHeel;
        if (parts.length >= 7) {
          stepCount = Math.round(parts[6]);
        }
      } else if (parts.length === 4) {
        // 4채널 압전소자 센서 전용 매핑 (센서1: 앞발L, 센서2: 앞발R, 센서3: 뒤꿈치L, 센서4: 뒤꿈치R)
        rPiezo1 = scaleVal(parts[0]);
        rPiezo2 = scaleVal(parts[1]);
        rPiezo3 = scaleVal(parts[2]);
        rPiezo4 = scaleVal(parts[3]);
        
        rightFore = Math.round((rPiezo1 + rPiezo2) / 2);
        rightMid = Math.round((rPiezo1 + rPiezo2 + rPiezo3 + rPiezo4) / 4);
        rightHeel = Math.round((rPiezo3 + rPiezo4) / 2);

        const rightTotal = rightFore + rightMid + rightHeel;
        if (rightTotal > 10) {
          leftFore = Math.min(Math.max(100 - rightFore, 35), 65);
          leftMid = Math.min(Math.max(100 - rightMid, 40), 60);
          leftHeel = Math.min(Math.max(100 - rightHeel, 30), 55);
        }
      } else if (parts.length === 3) {
        rightFore = scaleVal(parts[0]);
        rightMid = scaleVal(parts[1]);
        rightHeel = scaleVal(parts[2]);
        rPiezo1 = rightFore;
        rPiezo2 = rightFore;
        rPiezo3 = rightHeel;
        rPiezo4 = rightHeel;
      } else if (parts.length === 2) {
        leftHeel = scaleVal(parts[0]);
        rightHeel = scaleVal(parts[1]);
        rPiezo3 = rightHeel;
        rPiezo4 = rightHeel;
      } else if (parts.length === 1) {
        rightHeel = scaleVal(parts[0]);
        rPiezo3 = rightHeel;
        rPiezo4 = rightHeel;
      }

        // 오른발 뒤꿈치 접지(Heel Strike) 변화에 근거한 걸음수 계산
        let addedStep = false;
        if (rightHeel > 65 && prev.sensorData.rightFoot.heel <= 65) {
          addedStep = true;
        }

        const finalStepCount = addedStep ? stepCount + 1 : stepCount;
        const finalDistance = parseFloat((prev.gaitMetrics.distanceKm + (addedStep ? 0.001 : 0)).toFixed(3));

        const leftTotal = leftFore + leftMid + leftHeel;
        const rightTotal = rightFore + rightMid + rightHeel;
        const totalPressure = leftTotal + rightTotal;

        let leftWeight = prev.gaitMetrics.weightDistributionLeft;
        let rightWeight = prev.gaitMetrics.weightDistributionRight;
        if (totalPressure > 10) {
          leftWeight = Math.round((leftTotal / totalPressure) * 100);
          rightWeight = 100 - leftWeight;
        }

        const balanceScore = leftWeight === 50 ? 98 : Math.max(98 - Math.abs(50 - leftWeight) * 3, 60);
        const lsiSymmetry = Math.min(Math.max(Math.round(balanceScore - 1), 60), 98);
        const gaitSimilarity = Math.min(Math.max(Math.round(balanceScore - 3), 58), 96);

        let newNotifications = [...prev.notifications];
        if (rightHeel > 80 && prev.sensorData.rightFoot.heel <= 80) {
          newNotifications.unshift({
            id: `serial-warn-${Date.now()}`,
            timestamp: "방금 전",
            title: `🚨 ${source} 압력 한계 임계값 초과`,
            message: `스마트 깁스 실시간 감지 압력(${rightHeel}%)이 부상 회복 안전 기준(80%)을 침범했습니다. 발을 조금 더 디디거나 좌측 정상발로 이동 분산을 권장합니다!`,
            type: "danger"
          });
          newNotifications = newNotifications.slice(0, 5);
        }

        return {
          ...prev,
          sensorData: {
            leftFoot: { forefoot: leftFore, midfoot: leftMid, heel: leftHeel, status: leftHeel > 80 ? "warning" : "normal" },
            rightFoot: {
              forefoot: rightFore,
              midfoot: rightMid,
              heel: rightHeel,
              piezo1: rPiezo1,
              piezo2: rPiezo2,
              piezo3: rPiezo3,
              piezo4: rPiezo4,
              status: rightHeel > 80 || rPiezo4 > 80 || rPiezo3 > 80 ? "danger" : rightHeel > 70 ? "warning" : "normal"
            }
          },
          gaitMetrics: {
            ...prev.gaitMetrics,
            stepCount: finalStepCount,
            distanceKm: finalDistance,
            weightDistributionLeft: leftWeight,
            weightDistributionRight: rightWeight,
            balanceScore: Math.round(balanceScore),
            lsiSymmetry,
            gaitSimilarity
          },
          arduinoData: parts.length >= 7 ? {
            piezo1: parts[0],
            piezo2: parts[1],
            piezo3: parts[2],
            piezo4: parts[3],
            minX,
            maxX,
            minY,
            maxY,
            updatedAt: new Date().toLocaleTimeString("ko-KR", { hour12: false })
          } : prev.arduinoData,
          notifications: newNotifications
        };
      });
  };

  const readSerialLoop = async (port: any) => {
    while (port.readable && serialKeepReadingRef.current) {
      try {
        const textDecoder = new TextDecoderStream();
        const readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
        const reader = textDecoder.readable.getReader();
        serialReaderRef.current = reader;

        let accumulator = "";

        while (serialKeepReadingRef.current) {
          const { value, done } = await reader.read();
          if (done) break;
          if (value) {
            setLatestRawSerialData(value.trim());
            accumulator += value;
            const lines = accumulator.split(/\r?\n/);
            accumulator = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed) {
                parseAndApplySensorLine(trimmed, "Serial");
              }
            }
          }
        }

        reader.releaseLock();
        await readableStreamClosed.catch(() => {});
      } catch (err) {
        console.error("Serial stream read error:", err);
        await new Promise(resolve => setTimeout(resolve, 1000));
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
                  <HomeV2 state={state} setScreenName={setActiveScreen} onStartBluetoothScan={startBluetoothScan} onDisconnectBluetooth={disconnectBluetooth} />
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
                onToggleSimulateWalking={() => setState(prev => ({ ...prev, isSimulatingWalking: !prev.isSimulatingWalking }))}
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
                onStartBluetoothScan={startBluetoothScan}
                onConnectBluetoothDevice={connectBluetoothDevice}
                onDisconnectBluetooth={disconnectBluetooth}
                isSerialSupported={typeof navigator !== "undefined" && "serial" in navigator}
                isSerialConnected={isSerialConnected}
                onConnectSerial={connectSerial}
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
