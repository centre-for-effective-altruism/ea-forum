import type { SpotlightBase } from "@/lib/spotlights/spotlightQueries";
import Spotlight from "./Spotlight";
import Type from "../Type";
import Link from "../Link";

export default function EditableSpotlight({
  spotlight,
}: Readonly<{
  spotlight: SpotlightBase;
}>) {
  return (
    <div
      data-component="EditableSpotlight"
      className="w-full flex flex-col gap-1 items-end"
    >
      <Spotlight spotlight={spotlight} />
      <Type style="bodyHeavy" className="text-primary-dark">
        <Link href={`/admin/spotlights/${spotlight._id}`}>Edit</Link>
      </Type>
    </div>
  );
}
