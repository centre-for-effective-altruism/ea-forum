import { nYearsFromNow } from "@/lib/timeUtils";

export const GET = () => {
  const expires = nYearsFromNow(1);
  return new Response(
    `Contact: mailto:${process.env.CONTACT_EMAIL}
Expires: ${expires.toISOString()}
Preferred-Languages: en
`,
    {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    },
  );
};
