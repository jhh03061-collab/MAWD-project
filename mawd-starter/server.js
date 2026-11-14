// MAWD 해커톤 스타터 서버 — 의존성 없음 (Node 18+ 내장 http + fetch)
// 파트너사 API 연동 뼈대: 채널톡 / 스티비 / Vapi / Liner
// 각 API의 정확한 스펙은 README의 공식 문서 링크로 현장에서 한 번 더 확인할 것.

const http = require("http");
const fs = require("fs");
const path = require("path");

// 로컬에서 .env 읽기 (Render에서는 대시보드 환경변수 사용)
try {
  for (const line of fs.readFileSync(path.join(__dirname, ".env"), "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {}

const env = process.env;
const PORT = env.PORT || 3000;

// ---------- 파트너사 API 래퍼 ----------

// Liner: 웹 검색 (POST /api/v1/tools/search/web, x-api-key)
async function linerSearch(query, max_results = 5) {
  const r = await fetch("https://platform.liner.com/api/v1/tools/search/web", {
    method: "POST",
    headers: { "x-api-key": env.LINER_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ query, lang: "ko", max_results, include_knowledge: false }),
  });
  return { status: r.status, body: await r.json().catch(() => null) };
}

// 스티비: 주소록에 구독자 추가 (스탠다드 요금제 이상 필요 — 현장 지원 여부 확인)
// ※ 엔드포인트/필드는 developers.stibee.com 에서 확인
async function stibeeAddSubscriber(email, name) {
  const r = await fetch(`https://api.stibee.com/v1/lists/${env.STIBEE_LIST_ID}/subscribers`, {
    method: "POST",
    headers: { AccessToken: env.STIBEE_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      eventOccuredBy: "SUBSCRIBER",
      confirmEmailYN: "N",
      subscribers: [{ email, name }],
    }),
  });
  return { status: r.status, body: await r.json().catch(() => null) };
}

// 채널톡: 상담(user chat)에 메시지 보내기 (Open API는 유료 플랜 필요 — 현장 지원 여부 확인)
// ※ 2026-07 신버전 전환 공지 있음. api-doc.channel.io 에서 최신 엔드포인트 확인
async function channelSendMessage(userChatId, text) {
  const r = await fetch(`https://api.channel.io/open/v5/user-chats/${userChatId}/messages`, {
    method: "POST",
    headers: {
      "x-access-key": env.CHANNEL_ACCESS_KEY,
      "x-access-secret": env.CHANNEL_ACCESS_SECRET,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ blocks: [{ type: "text", value: text }] }),
  });
  return { status: r.status, body: await r.json().catch(() => null) };
}

// Vapi: 아웃바운드 전화 걸기 (전화번호는 E.164, 예: +821012345678)
async function vapiCall(customerNumber) {
  const r = await fetch("https://api.vapi.ai/call", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.VAPI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      assistantId: env.VAPI_ASSISTANT_ID,
      phoneNumberId: env.VAPI_PHONE_NUMBER_ID,
      customer: { number: customerNumber },
    }),
  });
  return { status: r.status, body: await r.json().catch(() => null) };
}

// ---------- 라우팅 ----------

function send(res, code, data, type = "application/json; charset=utf-8") {
  res.writeHead(code, { "Content-Type": type });
  res.end(typeof data === "string" ? data : JSON.stringify(data, null, 2));
}

function readBody(req) {
  return new Promise((resolve) => {
    let d = "";
    req.on("data", (c) => (d += c));
    req.on("end", () => {
      try { resolve(d ? JSON.parse(d) : {}); } catch { resolve({}); }
    });
  });
}

const routes = {
  // 헬스체크 + 어떤 키가 설정됐는지 확인 (값은 노출 안 함)
  "GET /health": async () => ({
    ok: true,
    keys: {
      liner: !!env.LINER_API_KEY,
      stibee: !!(env.STIBEE_API_KEY && env.STIBEE_LIST_ID),
      channel: !!(env.CHANNEL_ACCESS_KEY && env.CHANNEL_ACCESS_SECRET),
      vapi: !!env.VAPI_API_KEY,
    },
  }),

  // 랜딩 페이지 대기 신청 → 스티비 주소록 (스티비 키 없으면 로컬 파일에 저장)
  "POST /api/waitlist": async (body) => {
    if (!body.email) return [400, { error: "email 필요" }];
    if (env.STIBEE_API_KEY && env.STIBEE_LIST_ID) return stibeeAddSubscriber(body.email, body.name || "");
    fs.appendFileSync(path.join(__dirname, "waitlist.csv"), `${new Date().toISOString()},${body.email},${body.name || ""}\n`);
    return { saved: "local", note: "Render 무료 플랜은 재배포 시 파일이 지워짐 — 스티비 연동 권장" };
  },

  "POST /api/research": async (body) => linerSearch(body.query || "1인 창업 AI 자동화"),
  "POST /api/channel/send": async (body) => channelSendMessage(body.userChatId, body.text),
  "POST /api/vapi/call": async (body) => vapiCall(body.number),

  // 웹훅 수신: 채널톡 이벤트 (대시보드에서 URL = https://<앱>.onrender.com/webhooks/channel)
  "POST /webhooks/channel": async (body) => {
    console.log("[channel webhook]", JSON.stringify(body).slice(0, 500));
    // TODO: 여기서 AI로 문의 분류/답변 초안 → channelSendMessage(...)
    return { received: true };
  },

  // 웹훅 수신: Vapi server URL (통화 종료 리포트, tool call 등)
  "POST /webhooks/vapi": async (body) => {
    const type = body?.message?.type;
    console.log("[vapi webhook]", type);
    // TODO: type === "end-of-call-report" 이면 요약을 스티비/채널톡으로 후속 발송
    return { received: true };
  },
};

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, "http://x");
    const key = `${req.method} ${url.pathname}`;
    try {
      if (routes[key]) {
        const out = await routes[key](req.method === "POST" ? await readBody(req) : {});
        if (Array.isArray(out)) return send(res, out[0], out[1]);
        if (out && out.status && out.body !== undefined) return send(res, out.status, out.body);
        return send(res, 200, out);
      }
      if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
        return send(res, 200, fs.readFileSync(path.join(__dirname, "public", "index.html"), "utf8"), "text/html; charset=utf-8");
      }
      send(res, 404, { error: "not found" });
    } catch (e) {
      console.error(e);
      send(res, 500, { error: String(e.message || e) });
    }
  })
  .listen(PORT, () => console.log(`listening on :${PORT}`));
