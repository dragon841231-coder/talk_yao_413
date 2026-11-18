const sceneStatus = document.querySelector('#scene-status');
const roam = document.querySelector('#roam');
const breaks = document.querySelector('#breaks');
const handoff = document.querySelector('#handoff');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

function employee(id, route) {
  const button = document.getElementById(id);
  const portrait = button.querySelector('.sprite');
  const sprite = document.createElement('span');
  sprite.className = 'sprite';
  sprite.setAttribute('aria-hidden', 'true');
  portrait.replaceWith(sprite);
  portrait.className = 'sprite-body';
  sprite.append(portrait);
  for (const className of ['sprite-leg-near', 'sprite-leg-far']) {
    const leg = portrait.cloneNode();
    leg.className = className;
    sprite.append(leg);
  }
  return { button, route, index: 0 };
}
// Waypoints follow the open aisles around the outside of the sofa.
const owl = employee('owl', [[29,55],[32,59],[28,64],[32,71],[39,80],[43,82],[45,80]]);
const deer = employee('deer', [[74,65],[72,70],[69,74],[63,81],[59,83],[56,80]]);
const claudeFox = employee('claude-fox', [[54,46],[56,48],[57,45]]);
const claudeOtter = employee('claude-otter', [[84,55],[86,56],[87,53]]);
const place = (actor, [x,y]) => {
  actor.button.style.setProperty('--x', x + '%');
  actor.button.style.setProperty('--y', y + '%');
};
place(owl,owl.route[0]);
place(deer,deer.route[0]);
place(claudeFox,claudeFox.route[0]);
place(claudeOtter,claudeOtter.route[0]);
function sit(actor,seated) {
  actor.button.classList.toggle('seated',seated);
}
sit(owl,true);
sit(deer,true);
sit(claudeFox,true);
sit(claudeOtter,true);
async function walk(actor,destination) {
  if (actor.index === destination) return;
  sit(actor,false);
  actor.button.classList.add('walking');
  while (actor.index !== destination) {
    const next = actor.index + Math.sign(destination - actor.index);
    const [x,y] = actor.route[next];
    const [oldX,oldY] = actor.route[actor.index];
    const duration = reducedMotion.matches ? 0 : Math.hypot(x-oldX,y-oldY)*85;
    actor.button.style.setProperty('--facing',x<oldX ? -1 : 1);
    actor.button.style.transition = duration + 'ms left linear,' + duration + 'ms top linear';
    place(actor,[x,y]);
    await pause(duration);
    actor.index = next;
  }
  actor.button.classList.remove('walking');
  if (destination === 0) sit(actor,true);
}
let busy = false;
let idleTimer;
let requestQueued = false;
function schedule() {
  clearTimeout(idleTimer);
  if (requestQueued && !busy) {
    requestQueued = false;
    void playHandoff();
  } else if (roam.checked && !busy) idleTimer = setTimeout(idle, 6500);
}
async function idle() {
  if (busy || !roam.checked) return;
  if (document.hidden || document.querySelector('dialog').open || document.querySelector('.actor.revealed, .actor:focus-visible, .actor:hover')) {
    schedule();
    return;
  }
  busy = true;
  const atDesk = owl.index === 0 && deer.index === 0;
  const resting = atDesk && breaks.checked;
  sceneStatus.textContent = atDesk ? (resting ? '夥伴去沙發區休息' : '夥伴在辦公室散步') : '夥伴正在回工作桌';
  await Promise.all([
    ...[owl,deer].map(actor => walk(actor, atDesk ? (resting ? actor.route.length - 1 : 2) : 0)),
    ...[claudeFox,claudeOtter].map(actor => walk(actor, actor.index === 0 ? 2 : 0))
  ]);
  if (resting) {
    sceneStatus.textContent = '沙發區休息 · 一起玩桌遊';
    sit(owl,true);
    sit(deer,true);
    owl.button.dataset.activity = '🎲';
    deer.button.dataset.activity = '🎲';
    await pause(2400);
    delete owl.button.dataset.activity;
    delete deer.button.dataset.activity;
  }
  busy = false;
  schedule();
}
roam.checked = !reducedMotion.matches;
roam.addEventListener('change',schedule);
async function playHandoff() {
  if (busy) {
    requestQueued = true;
    handoff.disabled = true;
    sceneStatus.textContent = '已排入交接，夥伴到定位後開始。';
    return;
  }
  busy = true;
  clearTimeout(idleTimer);
  handoff.disabled = true;
  sceneStatus.textContent = '貓頭鷹和鹿前往休憩區碰面…';
  await Promise.all([walk(owl,owl.route.length-1),walk(deer,deer.route.length-1)]);
  sceneStatus.textContent = '貓頭鷹把行銷分析交給鹿';
  sit(owl,false);
  sit(deer,false);
  const documentCard = document.createElement('span');
  documentCard.className = 'handoff-document';
  documentCard.textContent = '📄';
  documentCard.setAttribute('aria-hidden','true');
  document.querySelector('.scene').append(documentCard);
  if (typeof documentCard.animate === 'function' && !reducedMotion.matches) {
    await documentCard.animate([
      {left:'45%',top:'77%'},{left:'50%',top:'74%'},{left:'56%',top:'77%'}
    ],{duration:850,easing:'ease-in-out',fill:'forwards'}).finished;
  }
  documentCard.remove();
  deer.button.dataset.activity = '📄';
  sceneStatus.textContent = '鹿帶著分析回工作桌寫稿';
  await Promise.all([walk(owl,0),walk(deer,0)]);
  delete deer.button.dataset.activity;
  sceneStatus.textContent = '交接完成';
  handoff.disabled = false;
  busy = false;
  schedule();
}
handoff.addEventListener('click',playHandoff);
document.addEventListener('pointerdown',event => {
  if (!event.target.closest('.actor')) {
    document.querySelectorAll('.actor.revealed').forEach(actor=>actor.classList.remove('revealed'));
  }
});
schedule();
