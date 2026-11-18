// 小島辦公室 · Claude 串接後端
// 貓頭鷹（行銷分析）→ 鹿（文案撰寫），由 Claude API 真的完成任務。
//
// 需要設定的環境變數（放在部署平台的「密鑰 / Secrets」，不要寫進程式碼或 GitHub）：
//   ANTHROPIC_API_KEY  Anthropic API 金鑰
//   ACCESS_CODE        只有你知道的通行碼，網頁送出任務時要輸入
//   ALLOWED_ORIGIN     （選填）允許呼叫的網站網址，例如 https://talk-yao-island-office.sunsetcoil6.chatgpt.site
//   CLAUDE_MODEL       （選填）預設 claude-sonnet-5-5
//
// 這支檔案是 Cloudflare Workers 的格式（export default { fetch }）。
// 其他平台只要把收到的 Request 交給 handle(request, env) 即可。

const OWL_SYSTEM = `你是「Talk YAO 寵物溝通工作室」的行銷分析師貓頭鷹。
請用繁體中文（台灣用語）分析使用者給的主題，內容包含：
1. 目標受眾：誰最需要這篇內容、他們的處境與疑問
2. 切角：一個具體、有溫度的切入點
3. 建議形式：適合的社群形式（例如 IG 輪播）與原因
4. 觀察指標：上線後可以看哪個數字判斷反應
語氣專業但親切，總長控制在 250 字以內，不要使用 Markdown 標題符號。`;

const DEER_SYSTEM = `你是「Talk YAO 寵物溝通工作室」的文案撰寫鹿。
請用繁體中文（台灣用語），以「寵物溝通師想說」的溫柔口吻，寫一組 IG 輪播文案。
格式固定為五行：
封面｜（一句吸引人的標題）
第 2 張｜……
第 3 張｜……
第 4 張｜……
第 5 張｜……
每張 1～3 句、具體生活化，不誇大療效、不做醫療承諾。只輸出這五行。`;

const STRATEGIST_SYSTEM = `你是 Talk YAO 寵物溝通工作室的行銷分析師。請以台灣繁體中文，根據使用者提供的活動或主題，依序列出行銷目標、優先受眾、渠道與具體內容建議、可小量執行的測試、成效指標。提供數據時只依實際資料判讀，並註明比較基準與限制。資料不足時，列出待驗證假設及需要補充的資訊，勿捏造數據、預算、訪談或成效。先給最重要的一項行動建議，維持可實作、精簡。`;

const COPYWRITER_SYSTEM = `你是 Talk YAO 寵物溝通工作室的文案撰寫專員。用台灣繁體中文，寫具體、溫柔、自然且可直接發布的社群貼文。依使用者指定的平台、受眾、語氣與行動指引撰寫。未指定平台時，各輸出一版 IG 與 Threads，清楚標示版本。從生活片段或一句提問切入，結尾給一個自然的互動邀請。可以使用少量表情符號。勿使用 Markdown 粗體或分隔線，勿捏造客戶故事、價格、活動、服務結果或醫療承諾。`;

const individualRoles = {
  owl: OWL_SYSTEM,
  deer: DEER_SYSTEM,
  strategist: STRATEGIST_SYSTEM,
  copywriter: COPYWRITER_SYSTEM
};

const MAX_TOPIC_LENGTH = 300;

function corsHeaders(env, request) {
  const origin = request.headers.get('Origin') || '';
  const allowed = env.ALLOWED_ORIGIN || new URL(request.url).origin;
  return {
    ...(origin === allowed ? { 'Access-Control-Allow-Origin': allowed } : {}),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Access-Code',
    'Vary': 'Origin'
  };
}

function json(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers }
  });
}

// 避免用「===」比對通行碼時洩漏長度/時間資訊
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function askClaude(env, system, userText) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal: AbortSignal.timeout(35000),
    headers: {
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: env.CLAUDE_MODEL || 'claude-sonnet-5-5',
      max_tokens: 1024,
      system,
      messages: [{ role: 'user', content: userText }]
    })
  });
  if (!res.ok) {
    throw new Error(`Claude API ${res.status}`);
  }
  const data = await res.json();
  const text = data.content?.filter(part => part.type === 'text').map(part => part.text).join('\n').trim();
  if (!text) throw new Error('Claude returned no text');
  return text;
}

export async function handle(request, env) {
  const cors = corsHeaders(env, request);
  const origin = request.headers.get('Origin');
  if (origin && !cors['Access-Control-Allow-Origin']) return json({ error: '來源未獲授權' }, 403, cors);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (request.method !== 'POST') return json({ error: '只接受 POST' }, 405, cors);

  if (!env.ANTHROPIC_API_KEY || !env.ACCESS_CODE) {
    return json({ error: '後端尚未設定金鑰或通行碼' }, 503, cors);
  }
  if (!safeEqual(request.headers.get('X-Access-Code') || '', env.ACCESS_CODE)) {
    return json({ error: '通行碼不正確' }, 401, cors);
  }

  let payload;
  try { payload = await request.json(); } catch { return json({ error: '格式錯誤' }, 400, cors); }
  const role = payload?.role;
  if (role !== 'team' && (typeof role !== 'string' || !Object.hasOwn(individualRoles, role))) return json({ error: '角色不正確' }, 400, cors);
  const topic = typeof payload.topic === 'string' ? payload.topic.trim() : '';
  if (!topic || [...topic].length > MAX_TOPIC_LENGTH) {
    return json({ error: '主題須為 1 到 300 字' }, 400, cors);
  }

  try {
    const brief = `主題與需求：${topic}`;
    if (role !== 'team') {
      const text = await askClaude(env, individualRoles[role], brief);
      return json({ [role]: text }, 200, cors);
    }
    const owl = await askClaude(env, OWL_SYSTEM, brief);
    const deer = await askClaude(env, DEER_SYSTEM, `${brief}\n\n貓頭鷹交給你的行銷分析：\n${owl}\n\n請依照這份分析寫輪播。`);
    return json({ owl, deer }, 200, cors);
  } catch (err) {
    console.warn('Island Claude request failed:', err.message);
    return json({ error: '夥伴暫時無法完成任務，請稍後再試' }, 502, cors);
  }
}

export default { fetch: handle };
