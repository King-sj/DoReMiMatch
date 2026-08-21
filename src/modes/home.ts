import { el, makeButton } from '../ui/components';
import { playSequence } from '../audio/tone';
import { NOTES } from '../data/notes';
import type { Route } from '../main';

interface ModeInfo {
  id: Exclude<Route, 'home'>;
  icon: string;
  title: string;
  desc: string;
}

const MODES: ModeInfo[] = [
  { id: 'match', icon: '🃏', title: '翻牌配对', desc: '翻开卡片,把数字和唱名配成一对' },
  { id: 'chain', icon: '🎹', title: '序列转换', desc: '看 1234 点 do re mi fa,反向也练' },
  { id: 'quiz', icon: '⚡', title: '问答测验', desc: '10 题挑战:看数字、看唱名、听声音' },
  { id: 'listen', icon: '🎧', title: '听音辨名', desc: '听音选数字,从单音到三音循序渐进' },
];

export function renderHome(root: HTMLElement, go: (r: Route) => void): () => void {
  const wrap = el('div', 'home');
  wrap.append(el('h1', 'home-logo', '🎵 DoReMiMatch'));
  wrap.append(el('p', 'home-sub', '数字 1-7 ↔ 唱名 do re mi fa so la ti,边玩边记'));

  const grid = el('div', 'mode-grid');
  for (const mode of MODES) {
    const card = makeButton('', 'mode-card', () => {
      // 欢迎音 do-mi-so(顺带激活 AudioContext)
      playSequence([NOTES[0].freq, NOTES[2].freq, NOTES[4].freq], 0.15, 0.3);
      go(mode.id);
    });
    card.append(el('div', 'mode-icon', mode.icon));
    card.append(el('div', 'mode-title', mode.title));
    card.append(el('div', 'mode-desc', mode.desc));
    grid.append(card);
  }
  wrap.append(grid);

  // 唱名对照表,随时温习
  const table = el('div', 'home-table');
  for (const note of NOTES) {
    const chip = el('span', 'home-chip');
    chip.dataset.n = String(note.num);
    chip.append(el('b', '', String(note.num)));
    chip.append(document.createTextNode(` ${note.syllable}`));
    table.append(chip);
  }
  wrap.append(table);

  root.append(wrap);
  return () => {};
}
