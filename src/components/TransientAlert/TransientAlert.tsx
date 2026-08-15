import { useEffect, useRef, useState } from "react";
import styles from "./TransientAlert.module.css";

const DEFAULT_DURATION_MS = 4000;
const EXIT_DURATION_MS = 300;

type Props = {
  active: boolean;
  message: string | null;
  onDismiss: () => void;
  durationMs?: number;
  className?: string;
};

export function TransientAlert({
  active,
  message,
  onDismiss,
  durationMs = DEFAULT_DURATION_MS,
  className,
}: Props) {
  const [displayMessage, setDisplayMessage] = useState<string | null>(null);
  const [isExiting, setIsExiting] = useState(false);
  const showingRef = useRef(false);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (active && message) {
      showingRef.current = true;
      setDisplayMessage(message);
      setIsExiting(false);
      return;
    }

    if (showingRef.current) {
      setIsExiting(true);
    }
  }, [active, message]);

  useEffect(() => {
    if (!displayMessage || isExiting) return;

    const timer = window.setTimeout(() => setIsExiting(true), durationMs);
    return () => window.clearTimeout(timer);
  }, [displayMessage, isExiting, durationMs]);

  useEffect(() => {
    if (!isExiting) return;

    const timer = window.setTimeout(() => {
      showingRef.current = false;
      setDisplayMessage(null);
      setIsExiting(false);
      onDismissRef.current();
    }, EXIT_DURATION_MS);

    return () => window.clearTimeout(timer);
  }, [isExiting]);

  if (!displayMessage) return null;

  return (
    <p
      className={[styles.alert, isExiting ? styles.exit : styles.enter, className]
        .filter(Boolean)
        .join(" ")}
      role="alert"
    >
      {displayMessage}
    </p>
  );
}
