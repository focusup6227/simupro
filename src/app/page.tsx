import { LandingClient } from "./_landing-client";
import { getPublishedScenarioCount } from "@/lib/landing-stats";

/** Re-fetch the scenario count every 10 minutes; new scenarios show up on the next render. */
export const revalidate = 600;

export default async function HomePage() {
  const scenarioCount = await getPublishedScenarioCount();
  return <LandingClient scenarioCount={scenarioCount} />;
}
