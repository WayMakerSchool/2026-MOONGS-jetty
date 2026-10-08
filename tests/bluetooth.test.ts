import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bluetoothError, forgetSensorDevices, sensorServices, subscribeSensor } from '../src/lib/bluetooth';

function characteristic(fail = false, readFails = false) {
  const listeners = new Map<string, (event: any) => void>();
  return {
    properties: { notify: true, read: readFails },
    addEventListener(name: string, handler: (event: any) => void) { listeners.set(name, handler); },
    removeEventListener(name: string) { listeners.delete(name); },
    async startNotifications() { if (fail) throw new Error('subscription rejected'); },
    async readValue() { throw new Error('read not supported'); },
    emit(line: string) { listeners.get('characteristicvaluechanged')?.({ target: { value: new DataView(new TextEncoder().encode(line).buffer) } }); },
    listeners,
  };
}

test('FFE0 subscription receives sensor packets and cleans up listeners', async () => {
  const char = characteristic();
  const lines: string[] = [];
  const server = { async getPrimaryService(uuid: string) {
    assert.equal(uuid, sensorServices[0]);
    return { async getCharacteristic() { return char; } };
  } };
  const cleanup = await subscribeSensor(server, () => {}, line => lines.push(line));
  char.emit('35,40,45,50');
  assert.deepEqual(lines, ['35,40,45,50']);
  cleanup();
  assert.equal(char.listeners.size, 0);
});

test('Nordic UART is tried when FFE0 is unavailable; optional read failure preserves notifications', async () => {
  const char = characteristic(false, true);
  const lines: string[] = [];
  const server = { async getPrimaryService(uuid: string) {
    if (uuid === sensorServices[0]) throw new Error('service not found');
    return { async getCharacteristic(uuid: string) {
      assert.equal(uuid, '6e400003-b5a3-f393-e0a9-e50e24dcca9e');
      return char;
    } };
  } };
  const cleanup = await subscribeSensor(server, () => {}, line => lines.push(line));
  char.emit('10,20,30,40');
  assert.deepEqual(lines, ['10,20,30,40']);
  cleanup();
});

test('subscription failures reject the connection instead of reporting success', async () => {
  const char = characteristic(true);
  const server = { async getPrimaryService() { return { async getCharacteristic() { return char; } }; } };
  await assert.rejects(subscribeSensor(server, () => {}, () => {}), /센서 데이터 채널/);
  assert.equal(char.listeners.size, 0);
});

test('cancelled chooser, denied access and GATT failures expose different reasons', () => {
  assert.match(bluetoothError({ name: 'NotFoundError' }, '기기 선택'), /선택하지 못/);
  assert.match(bluetoothError({ name: 'NotAllowedError' }, '기기 선택'), /권한/);
  assert.match(bluetoothError({ name: 'NetworkError', message: 'GATT failed' }, '기기에 연결 중'), /기기에 연결 중 실패/);
});

test('unsupported-device errors identify the failed GATT stage without guessing a transport', () => {
  const error = bluetoothError({ name: 'NetworkError', message: 'Unsupported device.' }, '기기에 연결 중');
  assert.match(error, /GATT 연결 단계/);
  assert.doesNotMatch(error, /시리얼 연결 버튼/);
  assert.doesNotMatch(error, /응답하지 않습니다/);
});

test('reset revokes only MOONGS device grants, preserving unrelated devices', async () => {
  const forgotten: string[] = [];
  const sensor = { id: 'sensor', name: 'MOONGS-Cast', async forget() { forgotten.push('sensor'); } };
  const other = { id: 'other', name: 'Headphones', async forget() { forgotten.push('other'); } };
  const result = await forgetSensorDevices({ async getDevices() { return [sensor, other]; } });
  assert.deepEqual(forgotten, ['sensor']);
  assert.equal(result.forgotten, 1);
});

test('reset reports when permission removal needs manual browser settings', async () => {
  const result = await forgetSensorDevices({ async getDevices() { return [{ id: 'sensor', name: 'MOONGS-Cast' }]; } });
  assert.equal(result.manual, 1);
  assert.equal(result.forgotten, 0);
});
