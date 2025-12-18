import { AnalyticsContext } from "@/lib/analyticsEvents";
import Link from "next/link";
import Type from "@/components/Type";

export default function BanNoticePage() {
  return (
    <AnalyticsContext pageContext="banNotice">
      <div className="w-[800px] max-w-full p-10 mx-auto flex flex-col gap-2">
        <Type>
          Sorry, but we have banned your account. You can still read the EA Forum in
          logged-out mode, but you will not be able to post or comment.
        </Type>
        <Type>
          If you believe this is a mistake, please{" "}
          <Link href="/contact" className="text-primary hover:underline">
            contact us
          </Link>
          .
        </Type>
      </div>
    </AnalyticsContext>
  );
}
