import { useEffect, useState } from "react";
import { subscribeInFlight } from "../api";

export function GlobalLoadingBar() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeInFlight((count) => setActive(count > 0));
    return () => {
      unsubscribe();
    };
  }, []);

  if (!active) return null;

  return (
    <div className="global-loading-bar">
      <div className="global-loading-bar-fill" />
    </div>
  );
}
