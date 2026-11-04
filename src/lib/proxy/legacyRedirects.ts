import type { Redirect } from "next/dist/lib/load-custom-routes";

const legacyPaths: { source: string; destination: string }[] = [
  // Giving season
  {
    source: "/giving-portal",
    destination: "/posts/j6fmnYM5ZRu9fJyrq/donation-election-how-to-vote",
  },

  // Oxford Prioritisation Project posts
  {
    source: "/ea/1ae/a_model_of_the_machine_intelligence_research",
    destination: "/topics/oxford-prioritisation-project",
  },
  {
    source: "/ea/1fn/oxford_prioritisation_project_review",
    destination: "/topics/oxford-prioritisation-project",
  },
  {
    source: "/ea/1ah/four_quantiative_models_aggregation_and_final",
    destination: "/topics/oxford-prioritisation-project",
  },

  // Misc posts
  {
    source: "/ea/7k/what_small_things_can_an_ea_do",
    destination: "https://www.effectivealtruism.org/take-action",
  },
  {
    source: "/ea/6x/introduction_to_effective_altruism",
    destination:
      "https://www.effectivealtruism.org/articles/introduction-to-effective-altruism",
  },
  {
    source: "/r/main/ea/xn/givewell_money_moved_in_2015_a_review_of_my",
    destination: "/posts/qKah99saPajei6ERi",
  },
  {
    source: "/r/vipulnaik-drafts/ea/xn/givewell_money_moved_in_2015_a_review_of_my",
    destination: "/posts/qKah99saPajei6ERi",
  },
  {
    source:
      "/posts/wtQ3XCL35uxjXpwjE/ea-survey-2019-series-community-demographics-and",
    destination: "/posts/wtQ3XCL35uxjXpwjE",
  },
  {
    source: "/posts/iHvvc9HHzSfHNGCHb/mental-health-resources-tailored-for-eas-wip",
    destination: "/posts/iHvvc9HHzSfHNGCHb",
  },
  {
    source: "/ea/6v/scope_insensitivity",
    destination: "/posts/WdmCe6dr3snACxehL/scope-insensitivity-2",
  },
  {
    source: "/posts/kftzYdmZf4nj2ExN7/bit.ly/eaunjournal",
    destination: "/posts/kftzYdmZf4nj2ExN7",
  },
  {
    source: "/posts/98LrrRzdwZadLe2oD/bit.ly/unjournaldirect",
    destination: "/posts/98LrrRzdwZadLe2oD",
  },
  {
    source: "/posts/cRsPfkyAKZ3crxynB/get-in-the-van",
    destination: "/posts/cRsPfkyAKZ3crxynB",
  },
  {
    source: "/giving-now-currently-seems-beat-giving-later-2",
    destination: "/posts/omCFSYF6MZqRFRJCv",
  },
  {
    source: "/ea/4y/excited_altruism",
    destination: "/posts/diu9Zx44s5uZhyBru",
  },
  {
    source: "/posts/FST9XBYgbbjyN79DF/announcing-our-2023-charity-recommendations",
    destination: "/posts/FST9XBYgbbjyN79DF",
  },
  {
    source:
      "/posts/2trdQRQPBED8RMbgk/review-of-fundraising-activities-of-eaf-in-2018",
    destination: "/posts/2trdQRQPBED8RMbgk",
  },
  {
    source: "/r/main/ea/11n/reflections_on_ea_global_from_a_firsttime_attendee",
    destination: "/posts/mMEzk55R33vvHPgyd",
  },
  {
    source:
      "/posts/bud2ssjlq33psemkh/my-current-impressions-on-career-choice-for-longtermists",
    destination: "/posts/bud2ssJLQ33pSemKH",
  },
  {
    source:
      "/posts/%20kageSSDLSMpuwkPKK/response-to-recent-criticisms-of-%20longtermism-1",
    destination: "/posts/kageSSDLSMpuwkPKK",
  },

  // Other routes
  { source: "/p", destination: "/" },
  { source: "/advice", destination: "/" },
  { source: "/cea-hiring", destination: "/" },
  { source: "/about-2", destination: "/about" },
  { source: "/category/:path", destination: "/topics" },
  { source: "/history", destination: "/saved#readhistory" },
  { source: "/allPosts,", destination: "/all-posts" },
  { source: "/top", destination: "/all-posts?sortedBy=top" },
  { source: "/node/:path", destination: "/" },
  { source: "/meetups/:path", destination: "/meetups" },
];

/**
 * Special-case redirects for things that are referenced on other sites but
 * have since moved
 */
export const legacyRedirects: Redirect[] = legacyPaths.map((path) => ({
  ...path,
  permanent: true,
}));
