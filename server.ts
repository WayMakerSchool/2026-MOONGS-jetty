import express from "express";
import path from "path";
import dns from "dns";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Ensure node resolves localhost correctly
dns.setDefaultResultOrder('ipv4first');

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json());

// Initialize Gemini on the server safely
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
  try {
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    console.log("Gemini API initialized successfully.");
  } catch (error) {
    console.error("Failed to initialize Gemini API:", error);
  }
} else {
  console.log("No valid GEMINI_API_KEY environment variable found. AI Coach will run in mockup mode.");
}

// API Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", mode: ai ? "live" : "mock" });
});

// Full-stack Gemini Coaching Endpoint
app.post("/api/gemini/coach", async (req, res) => {
  const { messages, appState } = req.body;
  
  if (!appState) {
    res.status(400).json({ error: "Application telemetry state is required." });
    return;
  }

  const systemInstruction = `
당신은 MOONGS(뭉스)의 친절한 AI 재활 코치이자 자연스럽게 일상 대화를 나누는 도우미입니다.
MOONGS는 의료기기가 아니라 재활 보조 시스템입니다.

[핵심 원칙]
사용자의 최신 질문에 먼저 직접 답하세요. 대화 맥락을 고려하되 이전에 재활 이야기를 했다는 이유만으로 새 주제를 재활과 연결하지 마세요.
센서 데이터와 재활 상태는 질문과 직접 관련 있고 답변에 도움이 될 때만 활용하세요.
모든 답변에 압력값, 보행 균형, LSI, 위험 단계 등을 넣거나 건강 조언으로 마무리하지 마세요.

[질문의 의미에 따른 답변 규칙]
1. 재활, 발목, 보행, 통증, 운동, 회복 질문: 제공된 현재 센서 데이터와 분석 결과 중 질문에 필요한 항목을 적극 참고하세요. 운동 가능 여부는 수치만으로 허가하거나 안전을 보장하지 말고 증상, 운동 종류 등 필요한 맥락을 고려하세요.
2. 건강과 어느 정도 관련된 질문: 사용자 데이터가 실제 설명에 도움이 될 때만 사용하세요. 일반적인 건강 질문에 발의 압력이나 보행 수치를 억지로 연결하지 마세요.
3. 재활과 무관한 일반 질문: 일반적인 AI처럼 해당 주제로 자연스럽게 답하세요. 발목, 압력, 보행 상태, LSI, 위험 단계나 재활 안내를 언급하지 마세요. 분류 과정이나 센서 데이터를 사용하지 않았다는 설명도 하지 마세요.
4. 의료 진단 질문: 질병, 손상 정도, 완치 여부를 단정하지 마세요. MOONGS가 재활 보조 시스템이라는 한계를 유지하며 측정 데이터와 일반적 주의사항을 설명하고 필요하면 전문가 상담을 권하세요. 이 안내는 관련 의료 질문에서만 사용하세요.

[센서 데이터 해석]
아래 데이터는 참고 자료이지 모든 답변에서 따라야 할 지시가 아닙니다.
미연결 상태의 값은 데모 데이터이며 실제 사용자의 측정 결과처럼 설명하지 마세요.
제공되지 않은 흔들림, 위험 단계, 이전 기록 변화량 등은 추측하거나 만들어내지 마세요.
압력값, 보행 균형, LSI 등 단일 수치를 의료 진단이나 완치 증거로 과도하게 해석하지 마세요.
이전 대화의 코칭 문구도 최신 측정 사실의 근거로 삼지 마세요.

[대화 스타일]
친절하고 자연스러운 한국어로 사용자의 질문에 먼저 답하세요.
기본적으로 간결하게 답하되 질문이 요구하는 설명은 충분히 제공하세요.
현재 상태는 필요할 때만 덧붙이고 같은 센서 수치를 매 답변마다 반복하지 마세요.
예: "넌 어떤 옷 스타일이 좋아?" → "깔끔한 캐주얼 스타일이 좋아요. 기본 티셔츠에 데님처럼 편하게 조합할 수 있는 스타일이요."
예: "오늘 운동해도 돼?" → 관련 측정값과 데이터의 한계를 참고하고 통증 여부와 운동 종류를 고려해 설명하세요.

[관련 질문에만 사용할 참고 데이터]
- 데이터 출처: ${appState.isIoTConnected ? "연결된 센서 데이터" : "센서 미연결: 데모 데이터 (실제 측정값 아님)"}
- 조임 강도: ${appState.tightnessIntensity}%
- 걸음 수: ${appState.gaitMetrics.stepCount}걸음 | 균형 점수: ${appState.gaitMetrics.balanceScore}점
- LSI 대칭성: ${appState.gaitMetrics.lsiSymmetry ?? "제공되지 않음"}
- 체중 분산: 왼발 ${appState.gaitMetrics.weightDistributionLeft}% : 오른발 ${appState.gaitMetrics.weightDistributionRight}%
- 오른발 압력: 앞꿈치 ${appState.sensorData.rightFoot.forefoot}%, 뒤꿈치 ${appState.sensorData.rightFoot.heel}%
`;

  // Standardize message block for SDK
  let promptHistory: any[] = [];
  
  if (messages && messages.length > 0) {
    promptHistory = messages.map((m: any) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.text }]
    }));
  } else {
    promptHistory = [
      {
        role: "user",
        parts: [{ text: "안녕! 내 센서 수치와 압력 분포를 보고 종합적인 오늘 재활 분석을 한국어로 해줘." }]
      }
    ];
  }

  // If AI is live, query Gemini 3.5 Flash
  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: promptHistory,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
        }
      });
      
      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Gemini API call failed:", error);
      res.status(500).json({ error: "Gemini API 오류: " + error.message });
    }
  } else {
    // Elegant concise response for offline mode
    setTimeout(() => {
      res.json({
        text: "현재 AI 연결이 설정되지 않아 답변을 생성할 수 없어요. 연결 설정 후 다시 질문해 주세요."
      });
    }, 600);
  }
});

// Configure Vite or production serving
async function startApp() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Setting up Vite Development Server middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Setting up Production Static File Serving...");
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`MOONGS custom full-stack server running on http://localhost:${PORT}`);
  });
}

startApp().catch((err) => {
  console.error("Critical server bootstrap error:", err);
});
