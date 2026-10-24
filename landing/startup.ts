// Paint the finished composition once, without swapping the font or artwork.
const artwork = new Image();
artwork.src = '/landing/powerhouse-v1.webp';
await Promise.allSettled([
  artwork.decode(),
  document.fonts.load('500 48px Manrope'),
  document.fonts.load('750 58px Manrope'),
]);
performance.mark('landing-ready');
