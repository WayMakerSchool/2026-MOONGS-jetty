export interface FootSensorData {
  leftFoot: {
    forefoot: number; // 0-100 scale of pressure
    midfoot: number;
    heel: number;
    piezo1?: number;
    piezo2?: number;
    piezo3?: number;
    piezo4?: number;
    status: "normal" | "warning";
  };
  rightFoot: {
    forefoot: number;
    midfoot: number;
    heel: number;
    piezo1?: number; // 앞발 좌측 (센서 1)
    piezo2?: number; // 앞발 우측 (센서 2)
    piezo3?: number; // 뒤꿈치 좌측 (센서 3)
    piezo4?: number; // 뒤꿈치 우측 (센서 4)
    status: "normal" | "warning" | "danger";
  };
}

export interface GaitMetrics {
  stepCount: number;
  distanceKm: number;
  balanceScore: number;
  weightDistributionLeft: number; // percentage, e.g. 48 for 48%
  weightDistributionRight: number; // e.g. 52 for 52%
  walkingTimeMin: number; // walking time in minutes
  avgSpeedKmh: number; // speed in km/h
  exerciseTimeMin: number; // exercise time in minutes
  lsiSymmetry: number; // e.g. 94%
  gaitSimilarity: number; // e.g. 91%
}

export interface TightnessRecord {
  time: string; // e.g. "06:00", "12:00"
  intensity: number; // 0-100
}

export interface NotificationItem {
  id: string;
  timestamp: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "danger";
}

export interface ArduinoSensorData {
  piezo1: number;
  piezo2: number;
  piezo3: number;
  piezo4: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  updatedAt: string;
}

export interface AppState {
  tightnessIntensity: number;
  isSimulatingWalking: boolean;
  isIoTConnected: boolean;
  batteryLevel: number;
  sensorData: FootSensorData;
  gaitMetrics: GaitMetrics;
  tightnessHistory: TightnessRecord[];
  notifications: NotificationItem[];
  painScore: number; // 0 to 10
  painStatus: "happy" | "neutral" | "bad" | "cry"; // 😀 😐 😣 😭
  bluetoothDeviceName?: string; // connected bluetooth name
  isBluetoothScanning?: boolean; // scanning state
  scannedDevices?: { name: string; rssi: number; address: string }[]; // scanned devices
  arduinoData?: ArduinoSensorData; // Arduino live 8-parameter feedback
}

export interface ChatMessage {
  role: "user" | "model";
  text: string;
  timestamp: string;
}
