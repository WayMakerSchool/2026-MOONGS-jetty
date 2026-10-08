import { AppState } from '../types';

const emptyFoot = () => ({ forefoot: 0, midfoot: 0, heel: 0, status: 'normal' as const });
export function beginLiveSession(state: AppState): AppState {
  return { ...state, isSimulatingWalking: false, telemetry: { received: false, bilateral: false, hasMotion: false, hasPressure: false },
    sensorData: { leftFoot: emptyFoot(), rightFoot: emptyFoot() }, arduinoData: undefined, imuData: undefined,
    gaitMetrics: { stepCount: 0, distanceKm: 0, walkingTimeMin: 0, avgSpeedKmh: 0, exerciseTimeMin: 0,
      balanceScore: 0, weightDistributionLeft: 0, weightDistributionRight: 0, lsiSymmetry: 0, gaitSimilarity: 0 },
    notifications: [], tightnessHistory: [] };
}

export function applySensorLine(prev: AppState, line: string, source: "Serial" | "Bluetooth" = "Serial"): AppState {
    if (!line || !line.trim()) return prev;
    if (/[\uFFFD\x00-\x08\x0B\x0C\x0E-\x1F]/.test(line)) return prev;
    const imuMatches = [...line.matchAll(/\bIMU_([XYZ])\s*[:=]\s*(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/gi)];
    if (imuMatches.length) {
      const imuData = { ...prev.imuData, updatedAt: new Date().toLocaleTimeString('ko-KR') };
      imuMatches.forEach(match => { imuData[match[1].toLowerCase() as 'x' | 'y' | 'z'] = Number(match[2]); });
      prev = { ...prev, imuData, isSimulatingWalking: false,
        telemetry: { ...prev.telemetry, received: true, hasPressure: prev.telemetry?.hasPressure ?? !!prev.telemetry?.received,
          bilateral: prev.telemetry?.bilateral ?? false, hasMotion: true } };
    }
    let trimmed = line.replace(/\bIMU_[XYZ]\s*[:=]\s*-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/gi, '').trim().replace(/^[,;\s]+|[,;\s]+$/g, '').replace(/^P\s*:/i, '');
    if (!trimmed) return prev;
    // Common labelled four-channel packets can accompany the IMU fields.
    const piezos = [...trimmed.matchAll(/\b(?:P(?:IEZO)?|S|FSR)_?([1-4])\s*[:=]\s*(-?\d+(?:\.\d+)?)/gi)];
    if (new Set(piezos.map(match => match[1])).size === 4) {
      trimmed = [1, 2, 3, 4].map(index => piezos.find(match => Number(match[1]) === index)![2]).join(',');
    }

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

    for (const match of trimmed.matchAll(/(?:^|[,;\s])R?(F|FORE|M|MID|H|HEEL)\s*:\s*(-?\d+(?:\.\d+)?)/gi)) {
      const v = Number(match[2]);
      if (match[1][0].toUpperCase() === 'F') extractedFore = v;
      if (match[1][0].toUpperCase() === 'M') extractedMid = v;
      if (match[1][0].toUpperCase() === 'H') extractedHeel = v;
    }
    const parts = trimmed.split(",").map(p => parseFloat(p.trim()));
    if (extractedFore === null && extractedMid === null && extractedHeel === null && !parts.every(Number.isFinite)) return prev;
    if (parts.length === 0 && extractedFore === null && extractedMid === null && extractedHeel === null) return prev;

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

      const adc = parts.length === 8 || !!prev.telemetry?.adc || parts.slice(0, parts.length >= 7 ? 4 : parts.length).some(v => v > 100);
      const scaleVal = (v: number) => {
        if (adc) {
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

        if (prev.telemetry?.received && Math.abs(leftWeight - prev.gaitMetrics.weightDistributionLeft) < 2) {
          leftWeight = prev.gaitMetrics.weightDistributionLeft;
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
          isSimulatingWalking: false,
          telemetry: { ...prev.telemetry, received: true, hasPressure: true, bilateral: true, hasMotion: parts.length >= 7 || !!prev.imuData, hasSteps: true, adc, estimated: parts.length !== 6 && parts.length !== 2 },
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
  }

