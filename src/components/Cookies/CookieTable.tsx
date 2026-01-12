import { cookiesTable, CookieType } from "@/lib/cookies/cookies";
import Type from "../Type";

export default function CookieTable({
  type,
  thirdPartyName,
}: {
  type: CookieType;
  thirdPartyName?: string;
}) {
  const cookies = Object.values(cookiesTable).filter(
    (cookie) => cookie.type === type && cookie.thirdPartyName === thirdPartyName,
  );
  return (
    <div data-component="CookieTable">
      <Type style="body" className="font-bold my-2">
        Set by {thirdPartyName ?? "us"}
      </Type>
      <div className="rounded-t-md overflow-hidden mb-2">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-primary text-always-white">
              <Type style="bodyMedium" As="th" className="py-2 font-bold">
                Name
              </Type>
              <Type style="bodyMedium" As="th" className="py-2 font-bold">
                Description
              </Type>
            </tr>
          </thead>
          <tbody>
            {cookies.map(({ name, description }) => (
              <tr key={name} className="border-1 border-gray-300">
                <Type style="bodySmall" As="td" className="p-2 w-[40%] break-all">
                  {name}
                </Type>
                <Type style="bodySmall" As="td" className="py-2 pl-2 w-[60%]">
                  {description}
                </Type>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
