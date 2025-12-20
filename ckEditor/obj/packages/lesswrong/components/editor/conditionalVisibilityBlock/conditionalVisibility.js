/*
 * Conditional visibility. This is primarily a feature for wiki pages imported
 * from Arbital, but will probably find other uses.
 *
 */
export const conditionalVisibilityModes = {
  unset: {
    settings: { type: "unset" },
    label: "(Choose a block type)",
  },
  todo: {
    settings: { type: "todo" },
    label: "Todo",
  },
  fixme: {
    settings: { type: "fixme" },
    label: "Fixme",
  },
  comment: {
    settings: { type: "comment" },
    label: "Comment",
  },
  knowsRequisite: {
    settings: { type: "knowsRequisite", inverted: false, otherPage: "" },
    label: "Knows Requisite",
  },
  wantsRequisite: {
    settings: { type: "wantsRequisite", inverted: false, otherPage: "" },
    label: "Wants Requisite",
  },
  ifPathBeforeOrAfter: {
    settings: {
      type: "ifPathBeforeOrAfter",
      inverted: false,
      order: "after",
      otherPage: "",
    },
    label: "If Before/After in Path",
  },
};
export function isConditionallyVisibleBlockVisibleByDefault(options) {
  switch (options.type) {
    case "unset":
    case "todo":
    case "fixme":
    case "comment":
      return false;
    case "knowsRequisite":
    case "wantsRequisite":
    case "ifPathBeforeOrAfter":
      return !!options.inverted;
  }
}
//# sourceMappingURL=conditionalVisibility.js.map
