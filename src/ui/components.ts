/** 创建 DOM 元素的便捷函数 */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = '',
  text = '',
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

/** 通用按钮 */
export function makeButton(label: string, className: string, onClick: () => void): HTMLButtonElement {
  const btn = el('button', className, label);
  btn.addEventListener('click', onClick);
  return btn;
}

/** 顶部栏:返回按钮 + 居中标题 */
export function topBar(title: string, onExit: () => void): HTMLElement {
  const bar = el('div', 'topbar');
  bar.append(makeButton('← 返回', 'btn btn-ghost', onExit));
  bar.append(el('div', 'topbar-title', title));
  return bar;
}

/** 1-3 星显示 */
function starRow(stars: number): HTMLElement {
  const row = el('div', 'stars');
  for (let i = 1; i <= 3; i++) {
    row.append(el('span', `star ${i <= stars ? 'star-on' : 'star-off'}`, i <= stars ? '★' : '☆'));
  }
  return row;
}

/** 结算弹窗:标题 + 成绩行 + 星级 + 操作按钮 */
export function resultPanel(opts: {
  title: string;
  subtitle?: string;
  stars?: number;
  rows: Array<[string, string]>;
  actions: Array<{ label: string; className: string; onClick: () => void }>;
}): HTMLElement {
  const overlay = el('div', 'overlay');
  const panel = el('div', 'panel');
  panel.append(el('div', 'panel-title', opts.title));
  if (opts.subtitle) panel.append(el('div', 'panel-sub', opts.subtitle));
  if (opts.stars !== undefined) panel.append(starRow(opts.stars));
  const rows = el('div', 'panel-rows');
  for (const [key, value] of opts.rows) {
    const row = el('div', 'panel-row');
    row.append(el('span', '', key), el('span', '', value));
    rows.append(row);
  }
  panel.append(rows);
  const actions = el('div', 'panel-actions');
  for (const action of opts.actions) {
    actions.append(makeButton(action.label, action.className, action.onClick));
  }
  panel.append(actions);
  overlay.append(panel);
  return overlay;
}
