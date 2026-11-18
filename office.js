// 小島辦公室 · 任務產生器
// 每位夥伴把你填的素材整理成完整任務（含品牌資料），複製後貼到 Claude 執行。
const dialog = document.querySelector('dialog');
const material = document.querySelector('#material');
const materialLabel = document.querySelector('#material-label');
const lineField = document.querySelector('#line-field');
const line = document.querySelector('#line');
const preview = document.querySelector('#preview');
const status = document.querySelector('#status');
const openClaude = document.querySelector('#open-claude');
const copyOnly = document.querySelector('#copy');

// 品牌資料：每次複製都會附上。資料有變動時改這裡。
const BRAND = `【品牌資料｜曜你聊聊 Talk YAO】
・規則：不虛構服務資訊或案例。案例需經飼主同意並匿名，不寫可辨識的私人細節。
・如需品牌背景、發布節奏或內部數據規則，請從使用者提供的素材取得。`;

const roles = {
  owl: {
    title: '🦉 貓頭鷹｜選題規劃',
    desc: '排接下來的貼文：兩條內容線怎麼搭配、題材會不會太集中。',
    label: '要排的日期和手上的素材',
    placeholder: '例如：12/2、12/4、12/6 還空著。手上有：○○的案例、想聊預約前的準備……',
    task: `請擔任選題規劃。依下方日期與素材，排出每篇的日期、內容線（寵物翻譯語錄／寵物溝通師想說）、題材一句話、預計用「留住型」的第一段懸念。
請檢查兩條內容線的比例，以及離世相關題材是否太密集，有疑慮就指出、由我決定。素材不夠時直接說缺什麼，不要自己編案例。`
  },
  deer: {
    title: '🦌 鹿｜文案起草',
    desc: '把案例或親身經驗起草成 Threads 多段文，Yao 再用自己的聲音潤飾。',
    label: '案例或經驗（越具體越好）',
    placeholder: '例如：一隻貓搬家後整晚躲在床底，溝通時牠說……',
    line: true,
    task: `請依下方素材起草一篇 Threads 多段文。
・第一段用「留住型」：留下一個具體、未解的懸念，答案不要先給。
・分段清楚，每段標「1／」「2／」……，總長適合 Threads。
・只用素材裡有的情節，不要補劇情或對話；不確定的地方標【待確認】。
・這是草稿，我會用自己的聲音潤飾；如果我貼回已潤飾的版本，不要改劇情，只修錯字和數據分析支持的調整。`
  },
  strategist: {
    title: 'Claude 狐狸｜數據分析',
    desc: '貼上貼文數據，逐篇完整分析承接率和轉換，並檢查規則是否成立。',
    label: '貼文數據（可一次貼多篇）',
    placeholder: '日期／內容線／瀏覽／1→2 承接率／個人檔案瀏覽／追蹤／LINE@ 新增／詢問／預約，以及第一段最後三行',
    task: `請擔任數據分析。下方是貼文數據：
・逐篇完整分析，不要簡略。
・用素材指定的時間窗口歸因。
・依素材預先指定的 1→2 承接率門檻判讀，不要事後調整。
・標出每篇是「留住型」還是「交出型」，依素材提供的判定規則更新前瞻驗證進度。
・兩條內容線分開看，不要只用瀏覽數互比。
・結論都標明是探索性，不是因果。`
  },
  copywriter: {
    title: 'Claude 水獺｜預約與私訊',
    desc: '預約公告的限時貼文版本，以及私訊回覆範本。',
    label: '這次要處理的內容',
    placeholder: '例如：12/10 開放預約、12/15 截止，想要限時貼文文字；或貼上一則私訊問題',
    task: `請處理預約與私訊相關的文字：
・預約公告：做成限時貼文版本，簡短、引導到私訊。請依下方日期和發布頻率提出建議。
・私訊回覆：語氣溫和、清楚，只用我提供的服務資訊；我沒給的價格、時段或流程，標【請補上】，不要自己編。`
  },
  team: {
    title: '🦉🦌 兩位一起工作',
    desc: '貓頭鷹先決定內容線和懸念，再交給鹿起草，一次貼給 Claude 就完成。',
    label: '案例或想寫的主題',
    placeholder: '例如：一位飼主想知道狗狗為什麼每天傍晚都在門口等……',
    line: true,
    task: `請分兩步完成：
第一步（貓頭鷹｜選題）：判斷這個素材適合哪條內容線、為什麼；寫出「留住型」第一段要留下的具體懸念；指出素材缺少什麼。
第二步（鹿｜起草）：依第一步寫一篇 Threads 多段文，每段標「1／」「2／」……；第一段不先給答案；只用素材裡有的情節，不確定處標【待確認】。這是草稿，我會用自己的聲音潤飾。`
  }
};

let role = 'team';

function buildTask() {
  const r = roles[role];
  const value = material.value.trim();
  const lineText = r.line ? `\n指定內容線：${line.value}` : '';
  return `${BRAND}\n\n【任務｜${r.title.replace(/^[^\p{L}]+/u, '')}】\n${r.task}${lineText}\n\n【素材】\n${value || '（尚未填寫）'}`;
}
function refresh() {
  preview.textContent = buildTask();
}

document.querySelectorAll('[data-role]').forEach(button => {
  button.addEventListener('click', () => {
    if (button.classList.contains('actor') && !button.classList.contains('revealed')) {
      document.querySelectorAll('.actor.revealed').forEach(actor => actor.classList.remove('revealed'));
      button.classList.add('revealed');
      return;
    }
    button.classList.remove('revealed');
    role = button.dataset.role;
    const r = roles[role];
    document.querySelector('#title').textContent = r.title;
    document.querySelector('#description').textContent = r.desc;
    materialLabel.textContent = r.label;
    material.placeholder = r.placeholder;
    lineField.hidden = !r.line;
    if (r.line) line.selectedIndex = role === 'team' ? 2 : 0;
    status.textContent = '';
    refresh();
    dialog.showModal();
  });
});
material.addEventListener('input', refresh);
line.addEventListener('change', refresh);

function copyTask(event) {
  if (!material.value.trim()) {
    event?.preventDefault();
    material.focus();
    status.textContent = '先填寫素材。';
    return false;
  }
  const task = buildTask();
  // 不等待結果，讓「打開 Claude」的連結能在同一次點擊中開啟
  const showManualCopy = () => {
    status.textContent = '無法自動複製，請從下方預覽手動複製。';
    preview.parentElement.open = true;
  };
  if (!navigator.clipboard?.writeText) {
    showManualCopy();
    return true;
  }
  navigator.clipboard.writeText(task).then(
    () => { status.textContent = '已複製。到 Claude 的對話裡貼上就能開始。'; },
    showManualCopy
  );
  return true;
}
openClaude.addEventListener('click', copyTask);
copyOnly.addEventListener('click', () => copyTask());
