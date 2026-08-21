/** 音阶音符:简谱数字 ↔ 唱名 ↔ 音高频率 */
export interface Note {
  /** 简谱数字 1-7 */
  num: number;
  /** 唱名(do re mi fa so la ti) */
  syllable: string;
  /** 音名(C 大调中音区) */
  name: string;
  /** 频率 (Hz) */
  freq: number;
}

/** C 大调中音区音阶,频率基于 A4 = 440Hz 十二平均律 */
export const NOTES: readonly Note[] = [
  { num: 1, syllable: 'do', name: 'C4', freq: 261.63 },
  { num: 2, syllable: 're', name: 'D4', freq: 293.66 },
  { num: 3, syllable: 'mi', name: 'E4', freq: 329.63 },
  { num: 4, syllable: 'fa', name: 'F4', freq: 349.23 },
  { num: 5, syllable: 'so', name: 'G4', freq: 392.0 },
  { num: 6, syllable: 'la', name: 'A4', freq: 440.0 },
  { num: 7, syllable: 'ti', name: 'B4', freq: 493.88 },
];
