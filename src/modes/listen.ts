import { el, makeButton, resultPanel, topBar } from '../ui/components';
import { playFeedback, playFreq, playSequence } from '../audio/tone';
import { NOTES } from '../data/notes';
import type { Route } from '../main';

/** 难度:单音 / 双音 / 三音 */
type Level = 1 | 2 | 3;

interface LevelInfo {
  level: Level;
  name: string;
  desc: string;
}

const LEVELS: LevelInfo[] = [
  { level: 1, name: 'Lv1 · 单音', desc: '听一个音,选出它是数字几' },
  { level: 2, name: 'Lv2 · 双音', desc: '听两个音,按顺序选出两个数字' },
  { level: 3, name: 'Lv3 · 三音', desc: '听三个音,按顺序选出三个数字' },
];

const ROUNDS = 8;

function randInt(max: number): number {
  return Math.floor(Math.random() * max);
}

function loadBest(key: string): number | null {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

export function renderListen(root: HTMLElement, go: (r: Route) => void): () => void {
  const timers: number[] = [];

  root.append(topBar('听音辨名', () => go('home')));

  // ---- 阶段一:选择难度 ----
  const picker = el('div', 'listen-levels');
  for (const info of LEVELS) {
    const card = makeButton('', 'level-card', () => startGame(info.level));
    card.append(el('div', 'level-name', info.name));
    card.append(el('div', 'level-desc', info.desc));
    picker.append(card);
  }
  root.append(picker);

  // ---- 阶段二:游戏 ----
  function startGame(level: Level): void {
    picker.remove();

    let round = 0;
    let score = 0;
    let combo = 0;
    let maxCombo = 0;
    let perfectRounds = 0;
    let target: number[] = [];
    let progress = 0;
    let perfect = true;
    let settled = false;

    const bestKey = `drm-listen-best-${level}`;
    const prevBest = loadBest(bestKey);

    const hud = el('div', 'hud');
    const roundEl = el('span', 'hud-item', `第 1/${ROUNDS} 轮`);
    const scoreEl = el('span', 'hud-item', '得分 0');
    hud.append(
      roundEl,
      scoreEl,
      el('span', 'hud-item', prevBest === null ? `Lv${level} 最佳 —` : `Lv${level} 最佳 ${prevBest}`),
    );
    root.append(hud);

    const stage = el('div', 'listen-stage');
    stage.append(makeButton('🔊', 'play-big', replay));
    const hint = el('div', 'listen-hint', '');
    stage.append(hint);
    const slots = el('div', 'slots');
    stage.append(slots);
    const pad = el('div', 'num-pad');
    for (let n = 1; n <= 7; n++) {
      pad.append(makeButton(String(n), 'num-btn', () => onPick(n)));
    }
    stage.append(pad);
    root.append(stage);

    function newRound(): void {
      settled = false;
      round++;
      progress = 0;
      perfect = true;
      target = Array.from({ length: level }, () => randInt(7) + 1);
      roundEl.textContent = `第 ${round}/${ROUNDS} 轮`;
      hint.textContent = `听一听,按顺序选出 ${level} 个音`;
      slots.replaceChildren();
      for (let i = 0; i < level; i++) slots.append(el('span', 'slot'));
      replay();
    }

    function replay(): void {
      playSequence(
        target.map((n) => NOTES[n - 1].freq),
        0.35,
        0.5,
      );
    }

    function onPick(n: number): void {
      if (settled || progress >= target.length) return;
      if (n === target[progress]) {
        // 按对位置:填入槽位并回放该音
        playFreq(NOTES[n - 1].freq, 0.45);
        const slot = slots.children[progress];
        if (slot) {
          slot.textContent = String(n);
          slot.classList.add('filled');
        }
        progress++;
        hint.textContent = `还差 ${target.length - progress} 个音`;
        if (progress === target.length) {
          settled = true;
          if (perfect) {
            combo++;
            perfectRounds++;
            maxCombo = Math.max(maxCombo, combo);
          } else {
            combo = 0;
          }
          score += level * 10 + (perfect ? 5 + Math.min(combo - 1, 5) * 2 : 0);
          scoreEl.textContent = `得分 ${score}`;
          playFeedback(true);
          timers.push(window.setTimeout(() => (round >= ROUNDS ? finish() : newRound()), 1100));
        }
      } else {
        // 按错:抖动提示,本轮不再计入全对
        perfect = false;
        playFeedback(false);
        for (const b of pad.querySelectorAll<HTMLButtonElement>('.num-btn')) {
          if (b.textContent === String(n)) {
            b.classList.add('shake');
            timers.push(window.setTimeout(() => b.classList.remove('shake'), 450));
            break;
          }
        }
      }
    }

    function finish(): void {
      const isRecord = prevBest === null || score > prevBest;
      if (isRecord) {
        try {
          localStorage.setItem(bestKey, String(score));
        } catch {
          /* 忽略存储失败 */
        }
      }
      root.append(
        resultPanel({
          title: `Lv${level} 挑战完成!`,
          subtitle: isRecord ? '🎉 新纪录!' : '试试更高难度吧',
          rows: [
            ['得分', String(score)],
            ['全对轮数', `${perfectRounds}/${ROUNDS}`],
            ['最佳连击', String(maxCombo)],
          ],
          actions: [
            { label: '选难度再来', className: 'btn btn-primary', onClick: () => go('listen') },
            { label: '返回主页', className: 'btn btn-ghost', onClick: () => go('home') },
          ],
        }),
      );
    }

    newRound();
  }

  return () => {
    for (const t of timers) window.clearTimeout(t);
  };
}
