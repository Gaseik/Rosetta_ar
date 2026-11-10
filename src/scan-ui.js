// 掃描提示：取代 MindAR 內建的 loading / scanning / error 畫面。
export function createScanUI(root = document.querySelector('#scan')) {
  const text = root.querySelector('#scan-text');
  const set = (state, message) => {
    root.classList.remove('is-loading', 'is-scanning', 'is-error', 'is-hidden');
    root.classList.add(state);
    if (message !== undefined) text.textContent = message;
  };
  return {
    loading: () => set('is-loading', 'Starting camera…'),
    scanning: () => set('is-scanning', 'Point your camera at the Rosetta Stone'),
    hide: () => set('is-hidden'),
    error: (message) => set('is-error', message),
  };
}
