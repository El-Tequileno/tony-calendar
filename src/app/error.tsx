"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="error-page">
      <h1>The calendar could not load.</h1>
      <p>
        Please try again. If this continues, check the server configuration.
      </p>
      <button className="button button-primary" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
