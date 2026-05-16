"use client";

import { Icon } from "./svgs";

export function LandingTestimonials() {
  const quotes = [
    {
      quote:
        "Pacing forces you to think like you're en route. Far less sterile than textbook quizzes — I caught myself anchoring on a diagnosis and the case let me sit in it.",
      who: "Paramedic student",
      where: "Pilot cohort",
    },
    {
      quote:
        "We ran SimuPro scenarios before an accreditation audit and surfaced gaps we hadn't rehearsed out loud in years. The replay timeline is the unlock.",
      who: "Training supervisor",
      where: "County EMS agency",
    },
    {
      quote:
        "Structured coaching after each call beats guessing whether my rationale matched protocol. Feels closer to a real debrief than anything else online.",
      who: "AEMT",
      where: "Field clinician",
    },
  ];

  return (
    <section
      className="relative py-28 lg:py-32"
      style={{
        background:
          "linear-gradient(180deg, #061a42 0%, #04102b 100%)",
      }}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="text-center mb-14">
          <div className="text-[11px] uppercase tracking-[0.22em] text-orange-300/90 font-mono mb-3">
            // FROM THE FIELD
          </div>
          <h2 className="font-display font-bold text-white text-[32px] sm:text-[40px] leading-[1.05]">
            Learners running the calls
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {quotes.map((t, i) => (
            <div
              key={i}
              className="panel-navy rounded-2xl p-7 flex flex-col gap-4"
            >
              <div
                className="w-8 h-8"
                style={{ color: "rgba(143,220,246,0.55)" }}
              >
                <Icon.Quote />
              </div>
              <p className="text-[14.5px] leading-relaxed text-white/75 flex-1">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="pt-2 border-t border-white/[0.06]">
                <div className="text-[13px] font-semibold text-white">
                  {t.who}
                </div>
                <div className="text-[11px] uppercase tracking-[0.16em] text-white/40 font-mono mt-0.5">
                  {t.where}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
