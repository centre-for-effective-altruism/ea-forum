import CoreReadingCard, { type CoreReadingItem } from "./CoreReadingCard";

const handbook: CoreReadingItem = {
  title: "The EA Handbook",
  href: "/handbook",
  author: {
    slug: "centre-for-effective-altruism",
    displayName: "Centre for Effective Altruism",
  },
  summary:
    "To help you learn the basics of effective altruism, we took some of the movement's best writing and made this handbook. Think of it as the textbook you'd get for a college course on EA. It explains the core ideas, so that you can start applying them to your own life.",
  imageId: "Banner/qnsx7lpxxfpf7tqxmnql",
  color: "#0c869b",
};

const sequences: CoreReadingItem[] = [
  {
    title: "Replacing Guilt",
    href: "/s/a2LBRPLhvwB83DSGq",
    author: { slug: "so8res", displayName: "So8res" },
    summary:
      "Nate Soares writes about replacing guilt with other feelings and finding better ways to motivate yourself, so you can build a better future without falling apart.",
    imageId: "Banner/qnjqqba8qclypnkvdkqn",
    color: "#d0c9d5",
  },
  {
    title: "Most Important Century",
    href: "/s/isENJuPdB3fhjWYHd",
    author: { slug: "holdenkarnofsky", displayName: "Holden Karnofsky" },
    summary:
      "Holden Karnofsky argues that we may be living in the most important century ever — a time when our decisions could shape the future for billions of years to come.",
    imageId: "jacob-mejicanos-P6s8EbcSgmA-unsplash.jpg",
    color: "#d96704",
  },
];

export default function CoreReadingList() {
  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
      <CoreReadingCard item={handbook} big className="md:col-span-2" />
      {sequences.map((item) => (
        <CoreReadingCard key={item.href} item={item} />
      ))}
    </div>
  );
}
