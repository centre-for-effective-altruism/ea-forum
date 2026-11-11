"use client";

import type { ReactNode } from "react";
import Button from "../Button";
import Type from "../Type";

export function EditFormGroup({
  title,
  children,
}: Readonly<{
  title: string;
  children: ReactNode;
}>) {
  return (
    <fieldset className="flex flex-col gap-4 border-t border-gray-200 mt-6 pt-4">
      <Type As="legend" style="bodyMedium" className="text-gray-1000 pr-2">
        {title}
      </Type>
      {children}
    </fieldset>
  );
}

export default function EditFormCard({
  title,
  hasChanges,
  saving,
  onSave,
  saveEventProps,
  children,
}: Readonly<{
  title: string;
  hasChanges: boolean;
  saving: boolean;
  onSave: () => void;
  saveEventProps: Record<string, string>;
  children: ReactNode;
}>) {
  return (
    <section
      data-component="EditFormCard"
      className="
        flex flex-col gap-4 rounded border border-gray-200 bg-gray-0 p-4 sm:p-6
      "
    >
      <Type style="sectionTitleLarge" className="text-gray-1000">
        {title}
      </Type>
      {children}
      <div className="flex items-center justify-end gap-3 mt-2">
        {hasChanges && (
          <Type style="bodySmall" className="text-warning">
            Unsaved changes
          </Type>
        )}
        <Button
          variant="primaryFilled"
          onClick={onSave}
          disabled={!hasChanges || saving}
          loading={saving}
          eventProps={saveEventProps}
        >
          Save
        </Button>
      </div>
    </section>
  );
}
