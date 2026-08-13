/**
 * SearchTutorialSection — Chapter I. Search already has its live,
 * functional surface in the Hero above (the real search bar, not a
 * mockup) — this section teaches what happens once you use it, with an
 * illustrative preview reacting to the same tutorial steps.
 */
import { FeatureTutorialSection } from "./FeatureTutorialSection";
import { SearchVisual } from "./featureVisuals";
import { SEARCH_TUTORIAL } from "./tutorialContent";

export const SearchTutorialSection = () => {
  return (
    <FeatureTutorialSection
      id="kretopia-hero"
      renderDomId={false}
      kicker="Search"
      categoryLabel="Start here"
      title="Search your name."
      description="The search bar above is real — type a name, a project, or what you're known for. Kretopia looks for a matching public record before you create anything new."
      steps={SEARCH_TUTORIAL}
      renderVisual={(activeStep) => <SearchVisual activeStep={activeStep} />}
      primaryCTA={{ label: "Search your name", href: "#kretopia-hero" }}
      nextStepNote="Found your name? You'll land on your Passport. Nothing yet? Start a fresh one in seconds."
    />
  );
};

export default SearchTutorialSection;
