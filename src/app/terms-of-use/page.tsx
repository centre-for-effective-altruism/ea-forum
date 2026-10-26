import type { Metadata } from "next";
import { AnalyticsContext } from "@/lib/analyticsEvents";
import Type from "@/components/Type";
import Link from "@/components/Link";

export const metadata: Metadata = {
  title: "Terms of Use",
};

export default function TermsOfUsePage() {
  return (
    <AnalyticsContext pageContext="termsOfUse">
      <div
        className="
          w-[682px] max-w-full mx-auto pb-25 flex flex-col gap-4
          [&_a]:cursor-pointer [&_a]:text-primary [&_a]:hover:opacity-50
        "
      >
        <Type style="postsPageTitle" className="text-center mt-15 mb-2">
          Effective Ventures Foundation - Terms of Use – EA FORUM ADDENDUM
        </Type>
        <Type style="sectionTitleSmall" className="text-center mb-6">
          Last Updated: October 31, 2022
        </Type>
        <Type style="bodySerif">
          Welcome to Effective Ventures Foundation! EVF operates a variety of online
          websites and resources, including those made available at{" "}
          <Link href="https://ev.org/" openInNewTab>
            https://ev.org/
          </Link>{" "}
          and any other sites or applications containing a link to EVF’s General
          Terms of Use (“<strong>Terms</strong>”, currently available at:{" "}
          <Link
            href="https://www.effectivealtruism.org/terms-and-conditions"
            openInNewTab
          >
            https://www.effectivealtruism.org/terms-and-conditions
          </Link>
          ).
        </Type>
        <Type style="bodySerif">
          The Terms are entered into by you and EVF and in addition to this Addendum,
          it governs your access to and use of the EA Forum. Please read the Terms
          and this Addendum carefully before you access or use the EA Forum.
        </Type>
        <Type style="bodySerif">
          By accessing or using the EA Forum, you confirm that you accept these
          Terms, this Addendum and all policies referenced in them and you agree to
          comply with them. If you do not agree to the Terms and/or this Addendum,
          and all other policies referred to in them, then you must not access or use
          any EVF Sites (as defined in the Terms).
        </Type>
        <Type style="bodySerif">
          If this Addendum contradicts with the Terms, then the relevant provisions
          of this Addendum take precedence.
        </Type>
        <Type style="bodySerif" className="font-bold mt-5" id="generalAccessTerms">
          <span className="mr-4">1.</span>General Access Terms
        </Type>
        <Type style="bodySerif" id="rulesOfUseOrGuides">
          <span className="ml-6 mr-4">1.1</span>
          <span className="underline">Rules of Use or Guides</span>. Where the Terms
          refer to rules of use or guides, such reference includes the Guides to the
          Norms on the Forum (the “<strong>Guide</strong>”). Please take a few
          moments to review the Guide (
          <Link
            href="/posts/yND9aGJgobm5dEXqF/guide-to-norms-on-the-forum"
            className="break-all"
          >
            https://forum.effectivealtruism.org/posts/yND9aGJgobm5dEXqF/guide-to-norms-on-the-forum
          </Link>
          ). If there is a conflict between the Guide, and the Terms, the Terms will
          apply.
        </Type>
        <Type style="bodySerif" className="font-bold mt-5" id="yourContent">
          <span className="mr-4">2.</span>Your Content
        </Type>
        <Type style="bodySerif" id="licenseToYourContent">
          <span className="ml-6 mr-4">2.1</span>
          <span className="underline">License to Your Content</span>. Subject to
          Section 2.2, when you create an Account, or upload or post Your Content to
          the EA Forum, you grant to us, our third-party service providers (including
          our Content Management Provider (as defined below)), and our other visitors
          and users, a royalty-free, perpetual, irrevocable, worldwide, nonexclusive,
          non sub-licensable, license to exercise the Licensed Rights in Your Content
          to reproduce and share Your Content, in whole or in part, for any purposes
          and to produce, reproduce and share Adapted Material for any purposes. You
          also irrevocably waive any “moral rights” or other rights with respect to
          attribution of authorship or integrity of materials for Your Content. When
          we make public use of Your Content, we will, where practical, use good
          faith efforts to credit you as the original author of Your Content.
          (Licensed Rights and Adapted Material are as defined in the{" "}
          <Link href="https://creativecommons.org/licenses/by/4.0/" openInNewTab>
            Creative Commons — Attribution 4.0 International — CC BY 4.0
          </Link>{" "}
          License).
        </Type>
        <Type style="bodySerif">
          <span className="ml-6 mr-4">2.2</span>
          When you upload Your Content to the EA Forum, you agree that you are doing
          so in accordance with, and on the basis that it will be made available to
          users on, the terms of the Creative Commons — Attribution 4.0 International
          —{" "}
          <Link href="https://creativecommons.org/licenses/by/4.0/" openInNewTab>
            Creative Commons — Attribution 4.0 International — CC BY 4.0
          </Link>
          . The licences of Your Content provided under this Section 2.2 are
          irrevocable and royalty-free. The provisions regarding moral rights in
          Section 2.1 apply to Your Content uploaded to the EA Forum.
        </Type>
        <Type style="bodySerif" id="feedback">
          <span className="ml-6 mr-4">2.3</span>
          <span className="underline">Feedback</span>. Any feedback, suggestions,
          testimonials, reviews, questions, comments, ideas, notes, concepts, and
          other similar information that you provide to us in any form or media that
          relates to us, our third-party service providers (including our Content
          Management Providers), our visitors or users, or the EVF Sites
          (collectively, “<strong>Feedback</strong>”) will be considered
          non-confidential and non-proprietary to you. For the avoidance of any
          doubt, you hereby grant us a royalty-free, perpetual, irrevocable,
          worldwide, transferable, nonexclusive, non sub-licensable license to
          exercise the Licensed Rights (as defined in the CC BY 4.0) in such Feedback
          for any purpose. We are not obligated to (a) use your Feedback in any way;
          (b) maintain any Feedback in confidence; (c) pay any compensation for any
          Feedback; or (d) respond to any Feedback. The term “Feedback” does not
          include any personally identifiable information, and all Feedback we
          request from you will be collected on an anonymous basis.
        </Type>
        <Type style="bodySerif" id="monitoring">
          <span className="ml-6 mr-4">2.4</span>
          <span className="underline">Monitoring</span>. We may, but have no
          obligation to, monitor, edit or remove Your Content that we determine
          violates the Terms (including Section 7 of the Terms (Restrictions)), the
          Intellectual Property Rights of any person, any applicable Law, or the
          Guide. Our policies and procedures concerning our monitoring, editing, and
          removal practices are further explained in the Guide.
        </Type>
      </div>
    </AnalyticsContext>
  );
}
