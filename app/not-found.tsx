import Link from "next/link";

export default function NotFound() {
  return (
    <main className="app-error">
      <div className="error-card">
        <span className="eyebrow">TRAZ</span>
        <h1>Page not found.</h1>
        <p>This route does not exist in the TRAZ workspace.</p>
        <Link className="primary" href="/">Return to TRAZ</Link>
      </div>
    </main>
  );
}
