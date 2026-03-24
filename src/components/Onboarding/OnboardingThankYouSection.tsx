import ToggleSwitch from "../Forms/ToggleSwitch";
import Type from "../Type";

export default function OnboardingThankYouSection({
  title,
  description,
  value,
  setValue,
}: Readonly<{
  title: string;
  description: string;
  value: boolean;
  setValue: (value: boolean) => void;
}>) {
  return (
    <section
      data-component="OnboardingThankYouSection"
      className="mb-3 flex gap-4 items-center"
    >
      <div className="grow">
        <Type className="text-gray-1000 font-[600]!">{title}</Type>
        <Type className="text-gray-600 font-[500]!">{description}</Type>
      </div>
      <ToggleSwitch value={value} setValue={setValue} className="max-xs:ml-5" />
    </section>
  );
}
