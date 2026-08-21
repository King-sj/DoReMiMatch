import './styles.css';
import { renderHome } from './modes/home';
import { renderMatch } from './modes/match';
import { renderQuiz } from './modes/quiz';
import { renderListen } from './modes/listen';
import { renderChain } from './modes/chain';

export type Route = 'home' | 'match' | 'quiz' | 'listen' | 'chain';

type Cleanup = () => void;

function getApp(): HTMLDivElement {
  const app = document.querySelector<HTMLDivElement>('#app');
  if (!app) {
    throw new Error('#app 容器不存在');
  }
  return app;
}

const app = getApp();

const renderers: Record<Route, (root: HTMLElement, go: (r: Route) => void) => Cleanup> = {
  home: renderHome,
  match: renderMatch,
  quiz: renderQuiz,
  listen: renderListen,
  chain: renderChain,
};

let cleanup: Cleanup | null = null;

/** 切换模式:先清理上一个模式的定时器,再渲染新模式 */
export function navigate(route: Route): void {
  cleanup?.();
  app.replaceChildren();
  cleanup = renderers[route](app, navigate);
}

navigate('home');
