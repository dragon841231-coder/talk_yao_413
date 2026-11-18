const dialog = document.querySelector('dialog');
const topic = document.querySelector('#topic');
const result = document.querySelector('#result');
const status = document.querySelector('#status');
const run = document.querySelector('#run');
const roles = {
  owl: ['🦉 貓頭鷹｜行銷分析','找出受眾、切角和適合的社群形式。','貓頭鷹，請分析這個主題的受眾、切角及建議形式'],
  deer: ['🦌 鹿｜文案撰寫','把主題寫成「寵物溝通師想說」輪播。','鹿，請用「寵物溝通師想說」的語氣寫 IG 輪播，給我封面和四張內頁'],
  team: ['🦉🦌 兩位一起工作','從貓頭鷹的選題分析，交接給鹿完成輪播。','兩位一起，先分析切角，再寫「寵物溝通師想說」IG 輪播的封面和四張內頁']
};
const sample = {
  owl: ['貓頭鷹・行銷分析','寫給第一次想預約、卻不知道要問什麼的飼主。用「把一個生活片段帶來」當切角，做成可收藏的 IG 輪播。這是選題假設，可以用貼文收藏數觀察反應。'],
  deer: ['鹿・IG 輪播','封面｜第一次做寵物溝通，可以準備什麼？\n第 2 張｜想一個最近一直放在心上的畫面。牠當時在做什麼？你在哪裡？\n第 3 張｜把「牠怎麼了？」寫得具體一些。例如搬家之後，牠開始整晚待在床底。\n第 4 張｜如果有一句想跟牠說的話，也可以先寫下來。\n第 5 張｜先帶一個你最想聊的問題就夠了。']
};
let role = 'team';
let timer;
let activeRequest;
function addCard(key) {
  const card = document.createElement('section');
  const heading = document.createElement('h3');
  const body = document.createElement('p');
  heading.textContent = sample[key][0];
  body.textContent = sample[key][1];
  card.append(heading, body);
  result.append(card);
}
document.querySelectorAll('[data-role]').forEach(button => {
  button.addEventListener('click', event => {
    if (button.classList.contains('actor') && event.detail && !matchMedia('(hover:hover) and (pointer:fine)').matches && !button.classList.contains('revealed')) {
      document.querySelectorAll('.actor.revealed').forEach(actor => actor.classList.remove('revealed'));
      button.classList.add('revealed');
      return;
    }
    button.classList.remove('revealed');
    role = button.dataset.role;
    document.querySelector('#title').textContent = roles[role][0];
    document.querySelector('#description').textContent = roles[role][1];
    result.replaceChildren();
    status.textContent = '';
    dialog.showModal();
  });
});
dialog.addEventListener('close', () => {
  clearTimeout(timer);
  activeRequest?.abort();
  activeRequest = undefined;
  access.value = '';
  run.disabled = false;
});
// Claude 後端網址：部署好後端後，把這裡改成後端的網址（例如 https://island-claude.xxx.workers.dev）
const API_URL = window.ISLAND_API_URL || '/api/run';
const access = document.querySelector('#access');
try { localStorage.removeItem('island-access'); } catch {}
function addText(title, text) {
  const card = document.createElement('section');
  const heading = document.createElement('h3');
  const body = document.createElement('p');
  heading.textContent = title;
  body.textContent = text;
  card.append(heading, body);
  result.append(card);
}
async function runClaude() {
  const value = topic.value.trim();
  if (!value) { topic.focus(); status.textContent = '先輸入主題。'; return true; }
  const code = access.value.trim();
  if (!code) return false;
  if ([...value].length > 300) { status.textContent = '主題最多 300 字。'; return true; }
  if (!/^[!-~]+$/.test(code)) { status.textContent = '通行碼請使用半形英數或符號。'; return true; }
  const request = new AbortController();
  activeRequest = request;
  run.disabled = true;
  status.textContent = role === 'deer' ? '鹿正在寫稿…' : (role === 'team' ? '貓頭鷹分析中，完成後交給鹿寫稿…' : '貓頭鷹分析中…');
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      signal: request.signal,
      headers: { 'Content-Type': 'application/json', 'X-Access-Code': code },
      body: JSON.stringify({ role, topic: value })
    });
    const data = await res.json().catch(() => ({}));
    if (request.signal.aborted) return true;
    if (res.status === 401) { status.textContent = '通行碼不正確。'; return true; }
    if (res.status === 503) {
      status.textContent = 'Claude 尚未啟用，以下是固定範例。';
      return false;
    }
    if (!res.ok || (!data.owl && !data.deer)) throw new Error();
    if (data.owl) addText('貓頭鷹・行銷分析', data.owl);
    if (data.deer) addText('鹿・IG 輪播', data.deer);
    status.textContent = role === 'team' ? '交接完成 · 由 Claude 完成' : '完成 · 由 Claude 完成';
    return true;
  } catch {
    if (request.signal.aborted) return true;
    status.textContent = 'Claude 暫時無法回應，以下是固定範例。';
    return false;
  } finally {
    if (activeRequest === request) {
      activeRequest = undefined;
      run.disabled = false;
    }
  }
}
run.addEventListener('click', async () => {
  result.replaceChildren();
  status.textContent = '';
  if (await runClaude()) return;
  const note = status.textContent;
  if (role !== 'team') {
    status.textContent = note || '示範模式 · 固定主題範例（輸入通行碼即可由 Claude 完成）';
    addCard(role);
    return;
  }
  run.disabled = true;
  status.textContent = '貓頭鷹正把分析交給鹿…';
  addCard('owl');
  timer = setTimeout(() => {
    addCard('deer');
    status.textContent = note || '交接完成 · 固定主題範例（輸入通行碼即可由 Claude 完成）';
    run.disabled = false;
  }, 850);
});
document.querySelector('#copy').addEventListener('click', async () => {
  const value = topic.value.trim();
  if (!value) { topic.focus(); status.textContent = '先輸入主題。'; return; }
  const task = roles[role][2] + '。主題是「' + value + '」。';
  try {
    await navigator.clipboard.writeText(task);
    status.textContent = '已複製，可貼到「ＡＩ辦公室」專案對話。';
  } catch {
    status.textContent = task;
  }
});
