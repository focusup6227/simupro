// SimuPro Abbreviations — restyled to Mission Board visual language.
// Functionality preserved 1:1 from the original page:
//   - Renders <AbbreviationsSearch data={medicalAbbreviations} />
//   - Server component (no "use client") — same as original

import { medicalAbbreviations } from "@/lib/abbreviations-data";
import { AbbreviationsSearch } from "@/components/abbreviations-search";
import { Panel } from "@/components/app/app-primitives";

export default function AbbreviationsPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <div className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-mute)] font-mono mb-1.5">
          // QUICK REFERENCE · {medicalAbbreviations.length} ENTRIES
        </div>
        <h1 className="font-display font-bold text-[34px] text-white leading-none">
          Medical abbreviations
        </h1>
        <p className="text-[13.5px] text-[var(--text-mute)] mt-2">
          Common terms you might encounter in the field. Search by abbreviation or definition.
        </p>
      </div>

      <Panel
        title="Abbreviation list"
        sub="Type to filter — matches abbreviation, definition, and category"
      >
        <div className="p-5">
          <AbbreviationsSearch data={medicalAbbreviations} />
        </div>
      </Panel>
    </div>
  );
}
