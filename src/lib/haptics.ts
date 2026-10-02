// A buzz where a native app gives a haptic: a tick for an action, a double one for a moment worth marking.
// Android only (iOS Safari has no vibration), and Chrome ignores it until you have tapped the page once.
export const tick = () => navigator.vibrate?.(10);
export const flourish = () => navigator.vibrate?.([10, 70, 20]);
