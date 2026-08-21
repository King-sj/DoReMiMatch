import { el, makeButton, resultPanel, topBar } from '../ui/components';
import { playFeedback, playFreq } from '../audio/tone';
import { NOTES } from '../data/notes';
import type { Route } from '../main';

/** 方向:看数字点唱名 / 看唱名点数字 */
type Direction = 'numToSyl' | 'sylToNum';

const ROUNDS = 8;
const BEST_KEY = 'drm-chain-best';

/** 关卡长度:第 1 关 3 个音,逐关加长到 7 个后保持 */
function levelLength(round: number): number {
  return Math.min(2 + round, 7);
}

function randInt(max: number): number {
  return Math.floor(Math.random() * max);
}

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function loadBest(): number | null {
  try {
    const raw = localStorage.getItem(BEST_KEY);
    if (raw === null) return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

export function renderChain(root: HTMLElement, go: (r: Route) => void): () => void {
  const timers: number[] = [];

  let round = 0;
  let score = 0;
  let combo = 0;
  let maxCombo = 0;
  let perfectRounds = 0;
  /** 目标序列(内部始终存数字 1-7,显示时按方向转换) */
  let target: number[] = [];
  let direction: Direction = 'numToSyl';
  let progress = 0;
  let perfect = true;
  let settled = false;

  root.append(topBar('序列转换', () => go('home')));

  const prevBest = loadBest();
  const hud = el('div', 'hud');
  const roundEl = el('span', 'hud-item', `第 1/${ROUNDS} 关`);
  const scoreEl = el('span', 'hud-item', '得分 0');
  hud.append(roundEl, scoreEl, el('span', 'hud-item', prevBest === null ? '最佳 —' : `最佳 ${prevBest}`));
  root.append(hud);

  const stage = el('div', 'chain-stage');
  const dirHint = el('div', 'chain-dir', '');
  stage.append(dirHint);
  const targetRow = el('div', 'chain-target');
  stage.append(targetRow);
  const slots = el('div', 'slots');
  stage.append(slots);
  const pad = el('div', 'chain-pad');
  stage.append(pad);
  root.append(stage);

  function newRound(): void {
    settled = false;
    round++;
    progress = 0;
    perfect = true;
    target = Array.from({ length: levelLength(round) }, () => randInt(7) + 1);
    direction = randInt(2) === 0 ? 'numToSyl' : 'sylToNum';
    roundEl.textContent = `第 ${round}/${ROUNDS} 关`;
    dirHint.textContent =
      direction === 'numToSyl' ? '看数字,按顺序点击对应的唱名' : '看唱名,按顺序点击对应的数字';

    // 目标序列展示(一直可见,不用记忆)
    targetRow.replaceChildren();
    for (const n of target) {
      const chip = el('span', 'chain-chip');
      chip.dataset.n = String(n);
      chip.textContent = direction === 'numToSyl' ? String(n) : NOTES[n - 1].syllable;
      targetRow.append(chip);
    }

    // 答案槽位
    slots.replaceChildren();
    for (let i = 0; i < target.length; i++) slots.append(el('span', 'slot'));

    // 按钮盘:唱名 或 数字(顺序打乱,避免纯靠位置对应)
    pad.replaceChildren();
    if (direction === 'numToSyl') {
      const btns = NOTES.map((note) => {
        const btn = makeButton(note.syllable, 'syl-btn', () => onPick(btn, note.num));
        return btn;
      });
      for (const btn of shuffle(btns)) pad.append(btn);
    } else {
      const btns: HTMLButtonElement[] = [];
      for (let n = 1; n <= 7; n++) {
        const btn = makeButton(String(n), 'num-btn', () => onPick(btn, n));
        btns.push(btn);
      }
      for (const btn of shuffle(btns)) pad.append(btn);
    }
  }

  function onPick(btn: HTMLButtonElement, n: number): void {
    if (settled || progress >= target.length) return;
    if (n === target[progress]) {
      // 按对位置:填入槽位并回放该音
      playFreq(NOTES[n - 1].freq, 0.45);
      const slot = slots.children[progress];
      if (slot) {
        slot.textContent = direction === 'numToSyl' ? NOTES[n - 1].syllable : String(n);
        slot.classList.add('filled');
      }
      progress++;
      if (progress === target.length) {
        settled = true;
        if (perfect) {
          combo++;
          perfectRounds++;
          maxCombo = Math.max(maxCombo, combo);
        } else {
          combo = 0;
        }
        score += target.length * 10 + (perfect ? 5 + Math.min(combo - 1, 5) * 2 : 0);
        scoreEl.textContent = `得分 ${score}`;
        playFeedback(true);
        timers.push(window.setTimeout(() => (round >= ROUNDS ? finish() : newRound()), 1000));
      }
    } else {
      // 按错:抖动提示,本轮不再计入全对
      perfect = false;
      playFeedback(false);
      btn.classList.add('shake');
      timers.push(window.setTimeout(() => btn.classList.remove('shake'), 450));
    }
  }

  function finish(): void {
    const isRecord = prevBest === null || score > prevBest;
    if (isRecord) {
      try {
        localStorage.setItem(BEST_KEY, String(score));
      } catch {
        /* 忽略存储失败 */
      }
    }
    root.append(
      resultPanel({
        title: '序列挑战完成!',
        subtitle: isRecord ? '🎉 新纪录!' : '转换越来越快了',
        rows: [
          ['得分', String(score)],
          ['全对关数', `${perfectRounds}/${ROUNDS}`],
          ['最佳连击', String(maxCombo)],
        ],
        actions: [
          { label: '再闯一轮', className: 'btn btn-primary', onClick: () => go('chain') },
          { label: '返回主页', className: 'btn btn-ghost', onClick: () => go('home') },
        ],
      }),
    );
  }

  newRound();

  return () => {
    for (const t of timers) window.clearTimeout(t);
  };
}
