export const getCurrentWindow = () => ({
  setAlwaysOnTop: () => Promise.resolve(),
  hide: () => Promise.resolve(),
  show: () => Promise.resolve(),
  setFocus: () => Promise.resolve(),
  isVisible: () => Promise.resolve(true),
});
