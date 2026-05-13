import { useState, useEffect, useRef, useCallback } from "react";

export interface CountdownResult {
  display: string;
  isUrgent: boolean;
  isClosed: boolean;
  totalSeconds: number;
}

function computeCountdown(target: number): CountdownResult {
  const diff = target - Date.now();

  if (diff <= 0) {
    return { display: "Closed", isUrgent: false, isClosed: true, totalSeconds: 0 };
  }

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);

  let display: string;
  if (days > 0) display = `${days}d ${hours}h ${minutes}m`;
  else if (hours > 0) display = `${hours}h ${minutes}m`;
  else if (minutes > 0) display = `${minutes}m ${seconds}s`;
  else display = `${seconds}s`;

  return { display, isUrgent: diff < 3600000, isClosed: false, totalSeconds };
}

export function useCountdown(expiresAt: string): CountdownResult {
  const targetRef = useRef(0);

  const getResult = useCallback((): CountdownResult => computeCountdown(targetRef.current), []);

  const [result, setResult] = useState<CountdownResult>(() =>
    computeCountdown(new Date(expiresAt).getTime()),
  );

  useEffect(() => {
    targetRef.current = new Date(expiresAt).getTime();

    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      const r = getResult();
      setResult(r);
      if (!r.isClosed) {
        const interval = targetRef.current - Date.now() < 3600000 ? 1000 : 60000;
        timer = setTimeout(tick, interval);
      }
    };

    timer = setTimeout(tick, 0);
    return () => clearTimeout(timer);
  }, [expiresAt, getResult]);

  return result;
}
