import Tooltip from "../Tooltip";
import Type from "../Type";

const tenPercentPledgeDiamond = "🔸";
const trialPledgeDiamond = "🔹";

const markers = [
  {
    text: tenPercentPledgeDiamond,
    tooltip: (name: string) =>
      `${name} has taken the ${tenPercentPledgeDiamond}10% Pledge`,
  },
  {
    text: trialPledgeDiamond,
    tooltip: (name: string) =>
      `${name} has taken the ${trialPledgeDiamond}Trial Pledge`,
  },
];

export default function DisplayNameWithMarkers({
  displayName,
}: Readonly<{
  displayName: string;
}>) {
  const markerIndices = markers
    .map((marker) => displayName.lastIndexOf(marker.text))
    .filter((i) => i !== -1);

  const lastMarkerIndex = Math.max(...markerIndices);
  const hasMarker = lastMarkerIndex >= 0;

  if (!hasMarker) {
    return <span data-component="DisplayNameWithMarkers">{displayName}</span>;
  }

  const beforeMarker = displayName.slice(0, lastMarkerIndex);
  const afterMarker = displayName.slice(lastMarkerIndex + 2);

  const markerStr = displayName.slice(lastMarkerIndex, lastMarkerIndex + 2);
  const markerObject = markers.find((marker) => marker.text === markerStr);

  const tooltipTitle = markerObject!.tooltip([beforeMarker, afterMarker].join(""));
  return (
    <span data-component="DisplayNameWithMarkers">
      {beforeMarker}
      {hasMarker && (
        <Tooltip
          As="span"
          placement="top"
          title={<Type style="bodySmall">{tooltipTitle}</Type>}
          tooltipClassName="max-w-50 text-center"
        >
          {markerStr}
        </Tooltip>
      )}
      {afterMarker}
    </span>
  );
}
