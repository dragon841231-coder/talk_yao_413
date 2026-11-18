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
  run.disabled = false;
});
run.addEventListener('click', () => {
  result.replaceChildren();
  if (role !== 'team') {
    status.textContent = '固定主題範例';
    addCard(role);
    return;
  }
  run.disabled = true;
  status.textContent = '貓頭鷹正把分析交給鹿…';
  addCard('owl');
  timer = setTimeout(() => {
    addCard('deer');
    status.textContent = '交接完成 · 固定主題範例';
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
