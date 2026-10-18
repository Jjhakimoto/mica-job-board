"use client";

export function EmailSignup() {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
      <h2 className="font-sans text-lg font-semibold">Get new MiCA-firm jobs weekly</h2>
      <p className="mt-1 text-sm text-stone-600">A short email when licensed firms post roles in the EU and EEA.</p>
      {/* TODO: Connect this form to a form service (Buttondown, Mailchimp, Resend, or similar).
          It currently stores nothing and does not submit. */}
      <form
        className="mt-4 flex flex-col gap-2 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        <label className="sr-only" htmlFor="job-email">
          Email address
        </label>
        <input
          id="job-email"
          name="email"
          type="email"
          required
          placeholder="you@example.com"
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none ring-emerald-700 focus:ring-2"
        />
        <button
          type="submit"
          className="shrink-0 whitespace-nowrap rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
        >
          Notify me
        </button>
      </form>
      <p className="mt-2 font-sans text-xs text-stone-500">Signup is not connected yet. Nothing is stored.</p>
    </section>
  );
}
