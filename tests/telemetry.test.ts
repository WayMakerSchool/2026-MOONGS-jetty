import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beginLiveSession, applySensorLine } from '../src/lib/telemetry';
import { SensorTextBuffer } from '../src/lib/sensorStream';
import { createServer } from 'vite';
import { createServer as createHttpServer } from 'node:http';
import { AppState } from '../src/types';

const initial = () => beginLiveSession({ notifications: [], tightnessHistory: [], gaitMetrics: {} } as AppState);

test('USB chunks, CR/LF lines and packets without newline reach the same parser', () => {
  let state = initial();
  const buffer = new SensorTextBuffer(line => { state = applySensorLine(state, line); });
  buffer.push('512,51');
  assert.equal(state.telemetry.received, false);
  buffer.push('2,512,512,10,80,20,90\r\n');
  assert.equal(state.telemetry.received, true);
  assert.equal(state.sensorData.rightFoot.forefoot, 50);
  buffer.push('800,800,800,800,10,80,20,90');
  buffer.flush();
  assert.ok(state.sensorData.rightFoot.forefoot > 55);
  assert.equal(state.arduinoData.maxY, 90);
});

test('legacy percentage, named pressure and seven-field packets remain supported', () => {
  assert.equal(applySensorLine(initial(), '35,42,38').sensorData.rightFoot.forefoot, 35);
  assert.equal(applySensorLine(initial(), 'P:45,30,85').sensorData.rightFoot.heel, 85);
  assert.equal(applySensorLine(initial(), 'F:45, M:30, H:85').sensorData.rightFoot.heel, 85);
  const state = applySensorLine(initial(), '50,50,50,50,10,80,20');
  assert.equal(state.sensorData.rightFoot.piezo1, 50);
  assert.equal(state.arduinoData.minY, 20);
  assert.equal(state.telemetry.hasSteps, true);
});

test('ADC boundary is continuous and malformed packets do not overwrite readings', () => {
  const state = applySensorLine(initial(), '99,99,99,99,10,80,20,90');
  const next = applySensorLine(state, '101,101,101,101,10,80,20,90');
  assert.ok(Math.abs(next.sensorData.rightFoot.forefoot - state.sensorData.rightFoot.forefoot) < .1);
  for (const invalid of ['hello', '10,bad,20', '1,,3,4']) assert.equal(applySensorLine(next, invalid), next);
  assert.equal(next.telemetry.estimated, true);
});

test('continuous BLE notifications without newline immediately update legacy metrics', () => {
  let state = initial();
  const buffer = new SensorTextBuffer(line => { state = applySensorLine(state, line, 'Bluetooth'); });
  buffer.pushNotification('512,512,512,512,10,80,20,90');
  assert.equal(state.telemetry.received, true);
  const previous = state.gaitMetrics.weightDistributionRight;
  buffer.pushNotification('900,900,900,900,10,80,20,90');
  assert.ok(state.gaitMetrics.weightDistributionRight > previous);
  assert.ok(state.gaitMetrics.lsiSymmetry > 0);
  assert.ok(state.gaitMetrics.balanceScore > 0);
  assert.ok(state.gaitMetrics.gaitSimilarity > 0);
});

test('connected analysis, trend and exercise retain their existing cards', async () => {
  const host = createHttpServer();
  const server = await createServer({ configFile: false, cacheDir: '/tmp/moongs-telemetry-test-vite', server: { middlewareMode: true, hmr: { server: host }, watch: null }, appType: 'custom' });
  try {
  const { default: SmartCastScreen } = await server.ssrLoadModule('/src/components/SmartCastScreen.tsx');
  const state = applySensorLine(initial(), '512,512,512,512,10,80,20,90');
  const render = (screenName: string) => renderToStaticMarkup(React.createElement(SmartCastScreen, { screenName, state } as any));
  const analysis = render('analysis');
  for (const title of ['보행 분석', '보행 속도', '보폭 (Step Length)', '정상 보행 유사도']) assert.ok(analysis.includes(title));
  assert.ok(analysis.includes('— m/s'));
  assert.ok(!analysis.includes('65cm'));
  const trend = render('trend');
  assert.ok(trend.includes('RECOVERY SYMMETRY PROGRESS CHART'));
  assert.ok(trend.includes('LSI Index'));
  assert.ok(!trend.includes('+6.5% 향상'));
  assert.ok(render('exercise').includes('Recovery Signal'));
  const imuOnly = applySensorLine(initial(), 'IMU_Y:0 IMU_Z:0');
  const imuAnalysis = renderToStaticMarkup(React.createElement(SmartCastScreen, { screenName: 'analysis', state: imuOnly } as any));
  assert.ok(imuAnalysis.includes('Y: 0 · Z: 0'));
  assert.ok(imuAnalysis.includes('—점 / 100'));
  const { default: HomeV2 } = await server.ssrLoadModule('/src/components/HomeV2.tsx');
  const home = renderToStaticMarkup(React.createElement(HomeV2, { state: imuOnly } as any));
  assert.ok(home.includes('0 / 0'));
  assert.ok(home.includes('IMU Y / Z'));
  } finally { await server.close(); }
});

test('firmware frame (front1,front2,rear,rear + IMU) is parsed as pressure and motion, and survives 20-byte BLE chunking', () => {
  // Contract with firmware/moongs_cast/moongs_cast.ino: "front1,front2,rear,rear,IMU_X:..,IMU_Y:..,IMU_Z:..\n"
  // The board has two forefoot piezos and one heel piezo; the heel value fills app sensors 3 and 4.
  const frame = '120,340,980,980,IMU_X:0.12,IMU_Y:-0.03,IMU_Z:9.78';
  const state = applySensorLine(initial(), frame, 'Bluetooth');
  assert.equal(state.telemetry?.hasPressure, true);
  assert.equal(state.telemetry?.hasMotion, true);
  assert.equal(state.telemetry?.adc, true);
  // App maps forefoot = avg(sensor1, sensor2) and heel = avg(sensor3, sensor4).
  assert.equal(state.sensorData.rightFoot.piezo3, state.sensorData.rightFoot.piezo4);
  assert.equal(state.sensorData.rightFoot.heel, state.sensorData.rightFoot.piezo3);
  assert.ok(state.sensorData.rightFoot.heel > state.sensorData.rightFoot.forefoot);
  assert.deepEqual([state.imuData?.x, state.imuData?.y, state.imuData?.z], [0.12, -0.03, 9.78]);

  // The legacy "Piezo_X:" labelling must keep being rejected as pressure (it only carried IMU).
  const legacy = applySensorLine(initial(), 'Piezo_X:21\tPiezo_Y:20\tPiezo_Z:1114\tIMU_X:0\tIMU_Y:0\tIMU_Z:0');
  assert.equal(legacy.telemetry?.hasPressure, false);

  // Default BLE MTU (23) yields 20-byte notifications; the buffer must rebuild exactly one line.
  const lines: string[] = [];
  const buffer = new SensorTextBuffer(line => lines.push(line));
  const wire = frame + '\n';
  for (let i = 0; i < wire.length; i += 20) buffer.pushNotification(wire.slice(i, i + 20));
  assert.deepEqual(lines, [frame]);
});
