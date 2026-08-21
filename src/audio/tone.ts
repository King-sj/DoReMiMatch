import { NOTES } from '../data/notes';

let ctx: AudioContext | null = null;

/** 获取(惰性创建)AudioContext,并确保处于 running 状态 */
function getCtx(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
  }
  if (ctx.state === 'suspended') {
    void ctx.resume();
  }
  return ctx;
}

/** 在指定时刻调度一个音:正弦主音 + 柔和的高八度泛音,指数衰减包络 */
function scheduleTone(ac: AudioContext, freq: number, when: number, duration: number, volume: number): void {
  // 主音
  const osc = ac.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = freq;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(0, when);
  gain.gain.linearRampToValueAtTime(volume, when + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, when + duration);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(when);
  osc.stop(when + duration + 0.05);

  // 高八度泛音,让音色更明亮
  const overtone = ac.createOscillator();
  overtone.type = 'triangle';
  overtone.frequency.value = freq * 2;
  const oGain = ac.createGain();
  oGain.gain.setValueAtTime(0, when);
  oGain.gain.linearRampToValueAtTime(volume * 0.18, when + 0.02);
  oGain.gain.exponentialRampToValueAtTime(0.001, when + duration * 0.55);
  overtone.connect(oGain);
  oGain.connect(ac.destination);
  overtone.start(when);
  overtone.stop(when + duration * 0.55 + 0.05);
}

/** 按频率立即播放一个音 */
export function playFreq(freq: number, duration = 0.8): void {
  const ac = getCtx();
  scheduleTone(ac, freq, ac.currentTime + 0.01, duration, 0.35);
}

/** 按数字(1-7)播放对应音高 */
export function playNoteNum(num: number, duration = 0.8): void {
  playFreq(NOTES[num - 1].freq, duration);
}

/** 依次播放一组频率(旋律/序列) */
export function playSequence(freqs: readonly number[], gap = 0.3, duration = 0.6): void {
  const ac = getCtx();
  const t0 = ac.currentTime + 0.02;
  freqs.forEach((freq, i) => {
    scheduleTone(ac, freq, t0 + i * gap, duration, 0.35);
  });
}

/** 播放 do-re-mi 完整音阶 */
export function playScale(): void {
  playSequence(NOTES.map((n) => n.freq), 0.28, 0.5);
}

/** 正确/错误的反馈音 */
export function playFeedback(ok: boolean): void {
  if (ok) {
    // 上行 do-mi(C5 → E5)
    playSequence([523.25, 659.25], 0.13, 0.3);
  } else {
    // 低沉的短促双音
    playSequence([196.0, 146.83], 0.12, 0.25);
  }
}
