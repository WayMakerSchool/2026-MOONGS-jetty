import assert from 'node:assert/strict';
import { test } from 'node:test';
import { openSerialPort, serialTextDiagnostic } from '../src/lib/serial';
import { applySensorLine, beginLiveSession } from '../src/lib/telemetry';
import { AppState } from '../src/types';

const initial = () => beginLiveSession({ notifications: [], tightnessHistory: [] } as AppState);

test('the selected baud rate is passed to the port instead of a fixed 9600', async () => {
  let options: any;
  await openSerialPort({ async open(value: any) { options = value; } }, 115200);
  assert.equal(options.baudRate, 115200);
  assert.equal(options.dataBits, 8);
  await assert.rejects(openSerialPort({}, 123), /통신 속도/);
});

test('the reported IMU_Y:0 IMU_Z:0 frame updates IMU without creating pressure readings', () => {
  const state = applySensorLine(initial(), 'IMU_Y:0 IMU_Z:0');
  assert.equal(state.imuData.y, 0);
  assert.equal(state.imuData.z, 0);
  assert.equal(state.telemetry.received, true);
  assert.equal(state.telemetry.hasPressure, false);
  assert.equal(state.telemetry.bilateral, false);
  assert.equal(state.gaitMetrics.balanceScore, 0);
  const next = applySensorLine(state, 'IMU_Y:-1.25 IMU_Z:2.5');
  assert.equal(next.imuData.y, -1.25);
  assert.equal(next.imuData.z, 2.5);
});

test('mixed labelled pressure and IMU frames and later IMU-only frames preserve both sensors', () => {
  const state = applySensorLine(initial(), 'P1:40 P2:50 P3:60 P4:70 IMU_Y:2 IMU_Z:3');
  assert.equal(state.sensorData.rightFoot.piezo1, 40);
  assert.equal(state.telemetry.hasPressure, true);
  assert.equal(state.imuData.y, 2);
  const next = applySensorLine(state, 'IMU_Y:4 IMU_Z:5');
  assert.equal(next.sensorData.rightFoot.piezo1, 40);
  assert.equal(next.telemetry.hasPressure, true);
  assert.equal(next.imuData.y, 4);
});

test('corrupt serial bytes produce a diagnostic and cannot become a pressure sample', () => {
  const state = initial();
  assert.match(serialTextDiagnostic('12\uFFFD\x00'), /통신 속도/);
  assert.equal(applySensorLine(state, '12\uFFFD\x00'), state);
  assert.equal(serialTextDiagnostic('IMU_Y:0 IMU_Z:0'), '');
});
