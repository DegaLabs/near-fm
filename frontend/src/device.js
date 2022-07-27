module.exports = {
  isMobile: () => {
    return window.screen.width <= 1023;
  },
  isMobileExplorer: () => {
    return /Mobi|Android|iPhone/i.test(window.navigator.userAgent);
  },
};
