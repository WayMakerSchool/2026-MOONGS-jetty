import React from 'react';

export const serialRates = [9600, 19200, 38400, 57600, 115200, 230400];

interface Props {
  baudRate: number;
  onBaudRateChange: (rate: number) => void;
  connected: boolean;
  onReconnect: () => void;
  diagnostic?: string;
}

export default function SerialConnectionOptions({ baudRate, onBaudRateChange, connected, onReconnect, diagnostic }: Props) {
  return <div className="mt-3 space-y-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-white">
    <label className="flex items-center justify-between gap-3 text-xs">USB / 시리얼 통신 속도
      <select aria-label="시리얼 통신 속도" value={baudRate} onChange={e => onBaudRateChange(Number(e.target.value))} className="rounded-lg border border-white/15 bg-[#171b22] px-2 py-2 text-white">
        {serialRates.map(rate => <option key={rate} value={rate}>{rate} baud</option>)}
      </select>
    </label>
    <p className="text-[11px] leading-5 text-white/60">펌웨어의 Serial.begin 값과 같게 맞춰 주세요. 연결 중 변경하면 아래 버튼으로 적용하세요.</p>
    {connected && <button type="button" onClick={onReconnect} className="min-h-10 w-full rounded-xl bg-white/10 text-xs font-semibold">선택한 속도로 다시 연결</button>}
    {diagnostic && <p role="status" className="break-all text-xs leading-5 text-[#B9F0EA]">{diagnostic}</p>}
  </div>;
}
