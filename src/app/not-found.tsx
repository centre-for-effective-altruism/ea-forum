import HomePageColumns from "@/components/HomePageColumns";
import Type from "@/components/Type";

export default function NotFoundPage() {
  return (
    <HomePageColumns pageContext="notFoundPage">
      <Type style="postTitle" className="mb-1">
        404 Not found
      </Type>
      <Type>Sorry, we couldn&apos;t find what you were looking for</Type>
    </HomePageColumns>
  );
}
