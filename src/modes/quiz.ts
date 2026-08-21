import { el, makeButton, resultPanel, topBar } from '../ui/components';
import { playFeedback, playNoteNum } from '../audio/tone';
import { NOTES, type Note } from '../data/notes';
import type { Route } from '../main';

/** 出题方向:数字选唱名 / 唱名选数字 / 听音选数字 */
type QType = 'numToSyl' | 'sylToNum' | 'listenToNum';

interface Question {
  note: Note;
  type: QType;
  prompt: string;
  options: string[];
  correct: string;
}

const TOTAL = 10;
const BEST_KEY = 'drm-quiz-best';

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

function makeQuestion(): Question {
  const note = NOTES[randInt(NOTES.length)];
  const type: QType = (['numToSyl', 'sylToNum', 'listenToNum'] as const)[randInt(3)];
  if (type === 'numToSyl') {
    return {
      note,
      type,
      prompt: `“${note.num}” 是哪个唱名?`,
      options: shuffle(NOTES.map((n) => n.syllable)),
      correct: note.syllable,
    };
  }
  if (type === 'sylToNum') {
    return {
      note,
      type,
      prompt: `“${note.syllable}” 是数字几?`,
      options: shuffle(NOTES.map((n) => String(n.num))),
      correct: String(note.num),
    };
  }
  return {
    note,
    type,
    prompt: '听!这个音是数字几?',
    options: shuffle(NOTES.map((n) => String(n.num))),
    correct: String(note.num),
  };
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

export function renderQuiz(root: HTMLElement, go: (r: Route) => void): () => void {
  const questions: Question[] = Array.from({ length: TOTAL }, makeQuestion);
  const timers: number[] = [];

  let qi = 0;
  let score = 0;
  let combo = 0;
  let maxCombo = 0;
  let correctCount = 0;
  let answered = false;

  root.append(topBar('问答测验', () => go('home')));

  const prevBest = loadBest();
  const hud = el('div', 'hud');
  const scoreEl = el('span', 'hud-item', '得分 0');
  const comboEl = el('span', 'hud-item', '连击 0');
  hud.append(scoreEl, comboEl, el('span', 'hud-item', prevBest === null ? '最佳 —' : `最佳 ${prevBest}`));
  root.append(hud);

  const progress = el('div', 'quiz-progress');
  const fill = el('div', 'quiz-progress-fill');
  progress.append(fill);
  root.append(progress);

  const promptEl = el('div', 'quiz-prompt');
  root.append(promptEl);

  const optionsEl = el('div', 'quiz-options');
  root.append(optionsEl);

  function renderQuestion(): void {
    answered = false;
    const q = questions[qi];
    promptEl.textContent = `第 ${qi + 1}/${TOTAL} 题 · ${q.prompt}`;
    fill.style.width = `${(qi / TOTAL) * 100}%`;
    optionsEl.replaceChildren();
    for (const opt of q.options) {
      const btn = makeButton(opt, 'option-btn', () => onAnswer(btn, opt));
      btn.dataset.value = opt;
      optionsEl.append(btn);
    }
    // 出题同时播放该音,音画结合
    playNoteNum(q.note.num, 0.6);
  }

  function onAnswer(btn: HTMLButtonElement, value: string): void {
    if (answered) return;
    answered = true;
    const q = questions[qi];
    if (value === q.correct) {
      combo++;
      maxCombo = Math.max(maxCombo, combo);
      correctCount++;
      score += 10 + Math.min(combo - 1, 5) * 2;
      playFeedback(true);
      btn.classList.add('correct');
    } else {
      combo = 0;
      playFeedback(false);
      btn.classList.add('wrong');
      for (const b of optionsEl.querySelectorAll<HTMLButtonElement>('.option-btn')) {
        if (b.dataset.value === q.correct) b.classList.add('correct');
      }
    }
    for (const b of optionsEl.querySelectorAll<HTMLButtonElement>('.option-btn')) b.disabled = true;
    scoreEl.textContent = `得分 ${score}`;
    comboEl.textContent = `连击 ${combo}`;
    timers.push(window.setTimeout(next, 1200));
  }

  function next(): void {
    qi++;
    if (qi >= TOTAL) {
      finish();
    } else {
      renderQuestion();
    }
  }

  function finish(): void {
    fill.style.width = '100%';
    const isRecord = prevBest === null || score > prevBest;
    if (isRecord) {
      try {
        localStorage.setItem(BEST_KEY, String(score));
      } catch {
        /* 忽略存储失败 */
      }
    }
    const grade = score >= 140 ? '🏆 乐理大师!' : score >= 100 ? '🎖️ 小小音乐家!' : '💪 继续练习,再来一轮!';
    root.append(
      resultPanel({
        title: '测验完成!',
        subtitle: `${grade}${isRecord ? ' 🎉 新纪录!' : ''}`,
        rows: [
          ['得分', String(score)],
          ['答对', `${correctCount}/${TOTAL}`],
          ['最高连击', String(maxCombo)],
        ],
        actions: [
          { label: '再来一轮', className: 'btn btn-primary', onClick: () => go('quiz') },
          { label: '返回主页', className: 'btn btn-ghost', onClick: () => go('home') },
        ],
      }),
    );
  }

  renderQuestion();

  return () => {
    for (const t of timers) window.clearTimeout(t);
  };
}
