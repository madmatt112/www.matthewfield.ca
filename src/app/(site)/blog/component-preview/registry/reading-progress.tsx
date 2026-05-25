import { ReadingProgress } from "@/components/blog/reading-progress";

import type { RegistryEntry } from "./index";

// Fixture: enough <p> blocks (paragraphs in a min-h-[300vh] wrapper)
// to guarantee the page scrolls in the Playwright smoke. The
// ReadingProgress client component queries document.querySelector("article")
// so the fixture renders the bar AND its scroll target together.
const PARAGRAPH_COUNT = 60;

const entry: RegistryEntry = {
  kind: "component",
  component: () => (
    <>
      <ReadingProgress />
      <article className="min-h-[300vh] space-y-4">
        {Array.from({ length: PARAGRAPH_COUNT }, (_, i) => (
          <p key={i}>
            Fixture paragraph {i + 1}. Lorem ipsum dolor sit amet, consectetur
            adipiscing elit. Sed do eiusmod tempor incididunt ut labore et
            dolore magna aliqua. Ut enim ad minim veniam, quis nostrud
            exercitation ullamco laboris nisi ut aliquip ex ea commodo
            consequat.
          </p>
        ))}
      </article>
    </>
  ),
};
export default entry;
