import { SensorTextBuffer } from './sensorStream';

export const sensorServices = [
  '0000ffe0-0000-1000-8000-00805f9b34fb',
  '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
];
const sensorCharacteristics = [
  '0000ffe1-0000-1000-8000-00805f9b34fb',
  '6e400003-b5a3-f393-e0a9-e50e24dcca9e',
];

export async function subscribeSensor(server: any, onChunk: (chunk: string) => void, onLine: (line: string) => void) {
  let lastError: unknown;
  for (let i = 0; i < sensorServices.length; i++) {
    let characteristic: any;
    let timer: ReturnType<typeof setTimeout>;
    let handler: (event: any) => void;
    try {
      const service = await server.getPrimaryService(sensorServices[i]);
      characteristic = await service.getCharacteristic(sensorCharacteristics[i]);
      if (!characteristic.properties.notify && !characteristic.properties.indicate) throw new Error('센서가 알림 수신을 지원하지 않습니다.');
      const buffer = new SensorTextBuffer(onLine);
      const decoder = new TextDecoder();
      handler = event => {
        const chunk = decoder.decode(event.target.value, { stream: true });
        onChunk(chunk);
        clearTimeout(timer);
        buffer.pushNotification(chunk);
        timer = setTimeout(() => buffer.flush(), 120);
      };
      characteristic.addEventListener('characteristicvaluechanged', handler);
      await characteristic.startNotifications();
      // A failed optional initial read must not discard a working subscription.
      if (characteristic.properties.read) {
        try {
          const chunk = decoder.decode(await characteristic.readValue());
          onChunk(chunk);
          if (chunk.trim()) onLine(chunk.trim());
        } catch { /* Notifications remain active. */ }
      }
      return () => {
        clearTimeout(timer);
        characteristic.removeEventListener('characteristicvaluechanged', handler);
      };
    } catch (error) {
      clearTimeout(timer);
      if (characteristic && handler) characteristic.removeEventListener('characteristicvaluechanged', handler);
      lastError = error;
    }
  }
  throw new Error(`센서 데이터 채널을 열지 못했습니다. 기기의 BLE 서비스 규격을 확인해 주세요. ${lastError instanceof Error ? lastError.message : ''}`);
}

export function bluetoothError(error: any, stage: string) {
  if (/unsupported device/i.test(error?.message || '')) return '브라우저가 선택한 기기의 BLE 연결을 지원하지 않습니다. 센서 수신을 시작하기 전 GATT 연결 단계에서 실패했습니다. 보드·블루투스 모듈 또는 펌웨어 연결 규격을 확인해야 합니다. (Unsupported device)';
  if (error?.name === 'NotFoundError' && stage === '기기 선택') return '기기를 선택하지 못했습니다. 검색 창에서 MOONGS-Cast를 선택해 주세요. 목록에 없다면 기기의 전원과 광고 상태를 확인해 주세요.';
  if (error?.name === 'SecurityError' || error?.name === 'NotAllowedError') return '브라우저 또는 운영체제에서 블루투스 접근을 차단했습니다. 이 사이트의 블루투스 권한을 확인해 주세요.';
  if (error?.name === 'NetworkError') return `${stage} 실패: 기기가 응답하지 않습니다. 다른 앱의 연결을 해제하고 기기 전원을 다시 켜 주세요. (${error.message})`;
  return `${stage} 실패: ${error?.message || String(error)}`;
}

export async function forgetSensorDevices(bluetooth: any, selected?: any) {
  const devices = new Map<string, any>();
  if (selected) devices.set(selected.id || 'selected', selected);
  if (typeof bluetooth?.getDevices === 'function') {
    for (const device of await bluetooth.getDevices()) {
      if (/^MOONGS/i.test(device.name || '') || (selected?.id && device.id === selected.id)) devices.set(device.id, device);
    }
  }
  let forgotten = 0, manual = 0;
  for (const device of devices.values()) {
    if (device.gatt?.connected) device.gatt.disconnect();
    if (typeof device.forget !== 'function') { manual++; continue; }
    try { await device.forget(); forgotten++; } catch { manual++; }
  }
  return { forgotten, manual, supported: typeof bluetooth?.getDevices === 'function' || !!selected };
}
