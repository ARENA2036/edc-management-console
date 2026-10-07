import { useEffect } from 'react';

export function useLockBodyScroll(locked: boolean) {
  useEffect(() => {
    if (!locked) {
      return;
    }

    const { body } = document;
    const previousOverflow = body.style.overflow;

    body.style.overflow = 'hidden';

    return () => {
      body.style.overflow = previousOverflow;
    };
  }, [locked]);
}
