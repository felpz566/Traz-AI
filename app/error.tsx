"use client";

import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("TRAZ UI error", error); }, [error]);

  return (
    <main className="app-error">
      <div className="error-card">
        <span className="eyebrow">TRAZ</span>
        <h1>Something went wrong.</h1>
        <p>The workspace hit an unexpected error. Your saved conversations and files are safe.</p>
        <button className="primary" onClick={() => reset()}>Try again</button>
      </div>
    </main>
  );
}
