export const defaultBaudRate = 9600;
export function serialTextDiagnostic(text: string) {
  if (/[\uFFFD\x00-\x08\x0B\x0C\x0E-\x1F]/.test(text)) {
    return '수신 글자가 깨져 있습니다. 통신 속도를 Serial.begin 값에 맞춰 다시 연결해 주세요. 바이너리 전송이라면 데이터 규격 확인이 필요합니다.';
  }
  return '';
}

export async function openSerialPort(port: any, baudRate: number) {
  if (![9600, 19200, 38400, 57600, 115200, 230400].includes(baudRate)) throw new Error('지원하지 않는 통신 속도입니다.');
  await port.open({ baudRate, dataBits: 8, stopBits: 1, parity: 'none', flowControl: 'none' });
}
