"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useId,
  useState,
} from "react";
import clsx from "clsx";
import ChevronDownIcon from "@heroicons/react/16/solid/ChevronDownIcon";
import Collapse from "../Collapse";
import Type from "../Type";

const FormGroupExpandedContext = createContext(true);

export const useFormGroupExpanded = () => useContext(FormGroupExpandedContext);

export default function CollapsibleFormGroup({
  title,
  defaultOpen = false,
  children,
}: Readonly<{
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}>) {
  const contentId = useId();
  const [open, setOpen] = useState(defaultOpen);
  const [expanded, setExpanded] = useState(defaultOpen);
  const markExpanded = useCallback(() => setExpanded(true), []);
  const markCollapsed = useCallback(() => setExpanded(false), []);
  const [previousDefaultOpen, setPreviousDefaultOpen] = useState(defaultOpen);
  if (defaultOpen !== previousDefaultOpen) {
    setPreviousDefaultOpen(defaultOpen);
    if (defaultOpen) {
      setOpen(true);
    }
  }

  return (
    <section
      data-component="CollapsibleFormGroup"
      className="rounded border border-gray-200 bg-gray-0"
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => setOpen(!open)}
        className={clsx(
          "flex w-full items-center justify-between gap-4 px-4 py-4 sm:px-6",
          "cursor-pointer text-left text-gray-1000 hover:text-primary",
        )}
      >
        <Type As="h3" style="sectionTitleLarge">
          {title}
        </Type>
        <ChevronDownIcon
          aria-hidden
          className={clsx(
            "w-5 shrink-0 text-gray-600 transition-transform duration-200",
            !open && "-rotate-90",
          )}
        />
      </button>
      <Collapse
        open={open}
        timeout={200}
        onEntered={markExpanded}
        onExit={markCollapsed}
      >
        <div
          id={contentId}
          inert={!open}
          className="flex flex-col gap-4 border-t border-gray-200 px-4 py-4 sm:px-6"
        >
          <FormGroupExpandedContext value={expanded}>
            {children}
          </FormGroupExpandedContext>
        </div>
      </Collapse>
    </section>
  );
}
