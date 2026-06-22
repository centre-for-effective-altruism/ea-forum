import { isBotSite } from "@/lib/environment";
import Type from "../Type";

export default function BotSiteNotice() {
  if (!isBotSite) {
    return null;
  }
  return (
    <section
      data-component="BotSiteNotice"
      className="
        bg-surface-floating border-2 border-primary-dark rounded mb-8 px-4 py-3
        flex flex-col gap-3
      "
    >
      <Type style="bodySerif">
        Welcome to the EA Forum bot site. If you are trying to access the Forum
        programmatically (either by scraping or via the api) please use this site
        rather than forum.effectivealtruism.org.
      </Type>
      <Type style="bodySerif">
        This site has the same content as the main site, but is run in a separate
        environment to avoid bots overloading the main site and affecting performance
        for human users.
      </Type>
    </section>
  );
}
