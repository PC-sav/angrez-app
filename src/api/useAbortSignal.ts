import { useEffect, useRef } from 'react';

export function useAbortSignal(): AbortSignal {
  const controllerRef = useRef<AbortController>(new AbortController());

  useEffect(() => {
    const controller = controllerRef.current;
    return () => controller.abort();
  }, []);

  return controllerRef.current.signal;
}
