"use client";

export function LandingHowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Pick a scenario",
      body:
        "Browse the library, filter by chief complaint, age, scope, or rhythm family. Run free cases forever; physiology-engine cases on Premium.",
    },
    {
      n: "02",
      title: "Run the call",
      body:
        "Talk to your patient. Get vitals. Order interventions. Watch real consequences propagate through the physiology layer.",
    },
    {
      n: "03",
      title: "Get the after-action",
      body:
        "Instant report — judgment, sequencing, protocol fit, time-to-decision. Replay the timeline frame-by-frame.",
    },
    {
      n: "04",
      title: "Sharpen the gaps",
      body:
        "ECG trainer, drug calc, references, and streaks keep the in-between hours productive. Re-run with one tap.",
    },
  ];

  return (
    <section
      id="how"
      className="relative py-28 lg:py-36"
      style={{
        background:
          "linear-gradient(180deg, #04102b 0%, #061a42 100%)",
      }}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="text-center mb-16">
          <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-300/90 font-mono mb-3">
            // THE LOOP
          </div>
          <h2 className="font-display font-bold text-white text-[36px] sm:text-[44px] lg:text-[52px] leading-[1.02]">
            Four steps. Endless reps.
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 relative">
          <div
            className="hidden lg:block absolute top-7 left-[8%] right-[8%] h-px pointer-events-none"
            style={{
              background:
                "linear-gradient(to right, transparent, rgba(255,122,24,0.4), rgba(63,184,229,0.4), transparent)",
            }}
          />
          {steps.map((s, i) => (
            <div key={i} className="panel-navy rounded-2xl p-6 relative">
              <div className="flex items-center gap-3 mb-5">
                <div
                  className="font-display font-bold text-[13px] tabular-nums px-2.5 py-1 rounded-full border"
                  style={{
                    color: i % 2 ? "var(--cyan-soft)" : "var(--orange-soft)",
                    borderColor:
                      i % 2 ? "rgba(143,220,246,0.35)" : "rgba(255,180,90,0.35)",
                    background:
                      i % 2 ? "rgba(63,184,229,0.08)" : "rgba(255,122,24,0.08)",
                  }}
                >
                  {s.n}
                </div>
                <div
                  className="flex-1 h-px"
                  style={{
                    background:
                      "linear-gradient(to right, rgba(255,255,255,0.12), transparent)",
                  }}
                />
              </div>
              <h3 className="font-display font-semibold text-white text-[17px] mb-2">
                {s.title}
              </h3>
              <p className="text-[13.5px] text-white/55 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
