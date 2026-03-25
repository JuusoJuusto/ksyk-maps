import { useEffect } from 'react';

const KONAMI_CODE = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'KeyB',
  'KeyA'
];

export function useKonamiCode(callback: () => void) {
  useEffect(() => {
    let currentIndex = 0;

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.code;

      if (key === KONAMI_CODE[currentIndex]) {
        currentIndex++;
        if (currentIndex === KONAMI_CODE.length) {
          callback();
          currentIndex = 0;
        }
      } else {
        currentIndex = 0;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [callback]);
}
