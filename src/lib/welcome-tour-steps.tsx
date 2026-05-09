import * as React from "react";
import type { TourStep } from "@/components/feature-tour";

/**
 * Anchors used by the welcome-tutorial guided tour.
 *
 * The scenario runner attaches `data-tour="<this value>"` to each region.
 * Components free to relocate / restyle those regions, just keep the
 * `data-tour` attribute on the outermost wrapping element.
 */
export const WELCOME_TOUR_ANCHORS = {
  monitor: "welcome-monitor",
  equipment: "welcome-equipment",
  partner: "welcome-partner",
  log: "welcome-log",
  tabs: "welcome-actions",
  endSim: "welcome-end-sim",
} as const;

export const WELCOME_TOUR_STORAGE_KEY = "simupro_welcome_tour_v1";

export const WELCOME_TOUR_STEPS: TourStep[] = [
  {
    id: "intro",
    title: "Welcome to your first run",
    body: (
      <p>
        We will spend 30 seconds pointing out the major panels. Use{" "}
        <strong>Next</strong> or arrow keys to step through, or skip whenever
        you want.
      </p>
    ),
  },
  {
    id: "monitor",
    anchor: WELCOME_TOUR_ANCHORS.monitor,
    title: "Cardiac monitor",
    body: (
      <p>
        Your live HR, BP, SpO₂ and capnography display here. Tap the channel
        chips to toggle alarms and snapshot rhythm strips. The waveform
        responds in real time as you intervene.
      </p>
    ),
  },
  {
    id: "equipment",
    anchor: WELCOME_TOUR_ANCHORS.equipment,
    title: "Equipment bag",
    body: (
      <p>
        Open the Equipment drawer to apply a 4-lead, BP cuff, pulse-ox, EtCO₂
        sensor, or BVM/CPAP. Sensors must be applied before their channel
        appears live on the monitor.
      </p>
    ),
  },
  {
    id: "partner",
    anchor: WELCOME_TOUR_ANCHORS.partner,
    title: "AI partner",
    body: (
      <p>
        Your partner can answer quick clinical questions and take delegated
        tasks. For this orientation case, a 4-lead and a glucose check will
        get you most of the way.
      </p>
    ),
  },
  {
    id: "tabs",
    anchor: WELCOME_TOUR_ANCHORS.tabs,
    title: "Action tabs",
    body: (
      <>
        <p>
          Switch between <strong>Assessment</strong>,{" "}
          <strong>Treatment</strong>, <strong>Destination</strong> and{" "}
          <strong>Comms</strong> here. The patient and the AI partner respond
          after each Submit.
        </p>
      </>
    ),
  },
  {
    id: "log",
    anchor: WELCOME_TOUR_ANCHORS.log,
    title: "Simulation log",
    body: (
      <p>
        Every turn — your action, the patient response, hospital chatter, and
        partner advice — lands here. The grading auditor reads this log when
        you end the run.
      </p>
    ),
  },
  {
    id: "end",
    anchor: WELCOME_TOUR_ANCHORS.endSim,
    title: "Ending the run",
    body: (
      <p>
        Click <strong>End Simulation</strong> when you are ready. Completing
        this orientation marks the tutorial done on your profile, so we will
        not nag you again.
      </p>
    ),
  },
];
