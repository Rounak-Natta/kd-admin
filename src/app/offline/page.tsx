"use client";

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <section className="w-full max-w-lg rounded-3xl border bg-card p-8 text-center shadow-xl">
        <h1 className="text-2xl font-bold">Kitchen Diaries is offline</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          The server is unavailable. Local data and queued POS operations remain safe.
          Reconnect when possible; synchronization will resume automatically.
        </p>
        <button type="button" onClick={() => window.location.reload()} className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground">
          Retry
        </button>
      </section>
    </main>
  );
}
