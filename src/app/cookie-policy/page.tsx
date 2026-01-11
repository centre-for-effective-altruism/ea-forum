import { AnalyticsContext } from "@/lib/analyticsEvents";
import { getUniqueCookieProviders } from "@/lib/cookies/cookies";
import Type from "@/components/Type";
import Link from "@/components/Link";
import CookieTable from "@/components/Cookies/CookieTable";

// TODO: Implement cookie dialog on clicking "here"

export default function CookiePolicyPage() {
  const uniqueNecessaryProviders = getUniqueCookieProviders("necessary");
  const uniqueFunctionalProviders = getUniqueCookieProviders("functional");
  const uniqueAnalyticsProviders = getUniqueCookieProviders("analytics");
  return (
    <AnalyticsContext pageContext="cookiePolicy">
      <div
        className="
        w-[682px] max-w-full mx-auto pb-25 flex flex-col gap-4
        [&_a]:cursor-pointer [&_a]:text-primary [&_a]:hover:opacity-50
      "
      >
        <Type style="postsPageTitle" className="text-center mt-15 mb-2">
          Cookie Notice
        </Type>
        <Type style="sectionTitleSmall" className="text-center mb-6">
          Last Updated: April 26, 2023
        </Type>
        <Type style="bodySerif">
          The Centre for Effective Altruism (&quot;CEA&quot;, &quot;we&quot; or
          &quot;us&quot;) is a project of the Effective Ventures group — the umbrella
          term for Effective Ventures Foundation and Effective Ventures Foundation
          USA, Inc., which are two separate legal entities that work together. Under
          UK law, the Effective Ventures Foundation is the “data controller” for the
          personal data that we collect and process.
        </Type>
        <Type style="bodySerif">
          We use cookies on the EA Forum. This cookie notice applies only to the EA
          Forum. You may access and change your cookie preferences at any time by
          clicking <a>here</a>.
        </Type>
        <Type style="bodySerif">
          If you choose to reject cookies you are ultimately responsible for removing
          any that have already been set (such as if you previously accepted). See
          the instructions for doing so{" "}
          <Link href="https://support.google.com/chrome/answer/95647" openInNewTab>
            here
          </Link>
          .
        </Type>
        <Type style="bodySerif">
          This cookie notice is different to the cookie notice that covers other
          Effective Ventures Foundation websites. You can see the Effective Ventures
          Foundation cookie notice{" "}
          <Link href="https://ev.org/cookie-policy/" openInNewTab>
            here
          </Link>
          .
        </Type>
        <Type style="bodySerif" className="font-bold mt-5">
          What are cookies?
        </Type>
        <Type style="bodySerif">
          A cookie is a very small text document, which often includes a unique
          identifier. Cookies are created when your browser loads a particular
          website. The website sends information to the browser which then creates a
          text file. Every time you go back to the same website, the browser
          retrieves and sends this file to the website&apos;s server. Find out more
          about the use of cookies on{" "}
          <Link href="https://www.allaboutcookies.org" openInNewTab>
            www.allaboutcookies.org
          </Link>
          .
        </Type>
        <Type style="bodySerif">
          We also use other forms of technology (such as pixels and web beacons and,
          in apps, software development kits (usually referred to as SDKs)) which
          serve a similar purpose to cookies and which allow us to monitor and
          improve our Platforms and email communications. When we talk about cookies
          in this notice, this term includes these similar technologies.
        </Type>
        <Type style="bodySerif">
          Your use of our Platforms may result in some cookies being stored that are
          not controlled by us. This may occur when the part of the Platform you are
          visiting makes use of a third party analytics or marketing
          automation/management tool or includes content displayed from a third party
          website, for example, YouTube or Facebook. You should review the privacy
          and cookie policies of these services to find out how these third parties
          use cookies and whether your cookie data will be transferred to a third
          country. We&apos;ve set out below which third party cookies we use.
        </Type>
        <Type style="bodySerif" className="font-bold mt-5">
          What cookies do we use and what information do they collect?
        </Type>
        <Type style="bodySerif">
          <strong>Necessary cookies:</strong> these cookies are required to enable
          core functionality. This includes technologies that allow you access to our
          websites, services, applications, and tools; that are required to identify
          irregular site behaviour, prevent fraudulent activity and improve security;
          or that allow you to make use of our functions such as making donations,
          saved search or similar functions. These cookies expire after 24 months.
        </Type>
        <Type style="bodySerif">The cookies we use in this category are:</Type>
        {uniqueNecessaryProviders.map((name) => (
          <CookieTable type={"necessary"} thirdPartyName={name} key={name ?? "us"} />
        ))}
        <br />
        <Type style="bodySerif">
          <strong>Functional cookies:</strong> these cookies enable functionalities
          that are not strictly necessary for the website to be usable, such as
          allowing you to contact us for support via Intercom. These cookies expire
          after 24 months.
        </Type>
        <Type style="bodySerif">The cookies we use in this category are:</Type>
        {uniqueFunctionalProviders.map((name) => (
          <CookieTable
            type={"functional"}
            thirdPartyName={name}
            key={name ?? "us"}
          />
        ))}
        <br />
        <Type style="bodySerif">
          <strong>Analytics and performance cookies:</strong> these cookies help us
          improve or optimise the experience we provide. They allow us to measure how
          visitors interact with our Platforms and we use this information to improve
          the user experience and performance of our Platforms. These cookies are
          used to collect technical information such as the last visited Platform,
          the number of pages visited, whether or not email communications are
          opened, which parts of our website or email communication are clicked on
          and the length of time between clicks. They may also collect information to
          provide helpful features and e.g. be used to remember your preferences
          (such as your language preference), your interests and the presentation of
          the website (such as the font size). These cookies expire after 24 months.
        </Type>
        <Type style="bodySerif">The cookies we use in this category are:</Type>
        {uniqueAnalyticsProviders.map((name) => (
          <CookieTable type={"analytics"} thirdPartyName={name} key={name ?? "us"} />
        ))}
      </div>
    </AnalyticsContext>
  );
}
