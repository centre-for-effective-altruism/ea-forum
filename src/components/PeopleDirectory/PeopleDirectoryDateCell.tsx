import Type from "../Type";

export default function PeopleDirectoryDateCell({
  date,
  formatter,
}: Readonly<{
  date: Date | string;
  formatter: (date: Date) => string;
}>) {
  return (
    <Type style="directoryCell" data-component="PeopleDirectoryDateCell">
      {formatter(new Date(date))}
    </Type>
  );
}
