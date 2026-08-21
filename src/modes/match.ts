import { el, resultPanel, topBar } from '../ui/components';
import { playFeedback, playNoteNum, playScale } from '../audio/tone';
import { NOTES } from '../data/notes';
import type { Route } from '../main';

/** 一张牌 */
interface CardData {
  id: number;
  /** 所属音组 1-7(数字牌与对应唱名牌同组) */
  group: number;
  kind: 'num' | 'syl';
  label: string;
}

interface Best {
  steps: number;
  time: number;
}

const BEST_KEY = 'drm-match-best';

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function makeCards(): CardData[] {
  const cards: CardData[] = [];
  NOTES.forEach((note, i) => {
    cards.push({ id: i * 2, group: note.num, kind: 'num', label: String(note.num) });
    cards.push({ id: i * 2 + 1, group: note.num, kind: 'syl', label: note.syllable });
  });
  return shuffle(cards);
}

function formatTime(sec: number): string {
  const s = Math.floor(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function loadBest(): Best | null {
  try {
    const raw = localStorage.getItem(BEST_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<Best>;
    if (typeof value.steps === 'number' && typeof value.time === 'number') {
      return { steps: value.steps, time: value.time };
    }
    return null;
  } catch {
    return null;
  }
}

function saveBest(best: Best): void {
  try {
    localStorage.setItem(BEST_KEY, JSON.stringify(best));
  } catch {
    /* 忽略存储失败 */
  }
}

export function renderMatch(root: HTMLElement, go: (r: Route) => void): () => void {
  const cards = makeCards();
  const cardEls = new Map<number, HTMLButtonElement>();
  const timers: number[] = [];

  let firstCard: CardData | null = null;
  let locked = false;
  let finished = false;
  let steps = 0;
  let matched = 0;
  const startAt = Date.now();

  root.append(topBar('翻牌配对', () => go('home')));

  const hud = el('div', 'hud');
  const stepsEl = el('span', 'hud-item', '步数 0');
  const timeEl = el('span', 'hud-item', '用时 0:00');
  const best = loadBest();
  hud.append(stepsEl, timeEl, el('span', 'hud-item', best === null ? '最佳 —' : `最佳 ${best.steps}步`));
  root.append(hud);

  const grid = el('div', 'grid');
  root.append(grid);

  const timerId = window.setInterval(() => {
    if (finished) return;
    timeEl.textContent = `用时 ${formatTime((Date.now() - startAt) / 1000)}`;
  }, 500);

  for (const card of cards) {
    const btn = el('button', 'card');
    btn.dataset.group = String(card.group);
    const inner = el('div', 'card-inner');
    inner.append(el('div', 'card-face card-back', '🎵'));
    inner.append(el('div', 'card-face card-front', card.label));
    btn.append(inner);
    btn.addEventListener('click', () => onCardClick(card, btn));
    cardEls.set(card.id, btn);
    grid.append(btn);
  }

  function onCardClick(card: CardData, btn: HTMLButtonElement): void {
    if (finished || locked) return;
    if (btn.classList.contains('flipped') || btn.classList.contains('matched')) return;

    // 翻开即播放该牌的音高,边玩边练音感
    playNoteNum(card.group, 0.5);
    btn.classList.add('flipped');

    if (firstCard === null) {
      firstCard = card;
      return;
    }

    steps++;
    stepsEl.textContent = `步数 ${steps}`;

    if (firstCard.group === card.group) {
      // 配对成功
      matched += 2;
      playFeedback(true);
      const firstEl = cardEls.get(firstCard.id);
      if (firstEl) firstEl.classList.add('matched');
      btn.classList.add('matched');
      firstCard = null;
      if (matched === cards.length) {
        finish();
      }
      return;
    }

    // 配对失败,短暂展示后翻回
    locked = true;
    playFeedback(false);
    const prev = firstCard;
    firstCard = null;
    timers.push(
      window.setTimeout(() => {
        const prevEl = cardEls.get(prev.id);
        if (prevEl) prevEl.classList.remove('flipped');
        btn.classList.remove('flipped');
        locked = false;
      }, 900),
    );
  }

  function finish(): void {
    finished = true;
    const timeSec = Math.round((Date.now() - startAt) / 1000);
    const stars = steps <= 12 ? 3 : steps <= 20 ? 2 : 1;
    playScale();
    const best = loadBest();
    const isRecord = best === null || steps < best.steps || (steps === best.steps && timeSec < best.time);
    if (isRecord) saveBest({ steps, time: timeSec });
    root.append(
      resultPanel({
        title: '全部配对成功!',
        subtitle: isRecord ? '🎉 新纪录!' : '边玩边听,音感越来越好',
        stars,
        rows: [
          ['步数', `${steps} 步`],
          ['用时', formatTime(timeSec)],
          ['理论最少', '7 步'],
        ],
        actions: [
          { label: '再玩一局', className: 'btn btn-primary', onClick: () => go('match') },
          { label: '返回主页', className: 'btn btn-ghost', onClick: () => go('home') },
        ],
      }),
    );
  }

  return () => {
    window.clearInterval(timerId);
    for (const t of timers) window.clearTimeout(t);
  };
}
