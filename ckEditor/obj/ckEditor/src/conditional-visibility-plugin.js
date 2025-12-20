import { Command, Plugin } from "@ckeditor/ckeditor5-core";
import { ButtonView } from "@ckeditor/ckeditor5-ui";
import { Widget } from "@ckeditor/ckeditor5-widget";
import { isConditionallyVisibleBlockVisibleByDefault } from "../../packages/lesswrong/components/editor/conditionalVisibilityBlock/conditionalVisibility";
// TODO Pick an icon that isn't reusing the collapsible-section icon
import conditionallyVisibleSectionIcon from "./ckeditor5-conditionally-visible-section-icon.svg";
import classNames from "classnames";
/**
 * CkEditor5 plugin that makes a conditionally visible section. This is
 * primarily used for imported Arbital content which has content shown or
 * hidden based on user's statements about what prerequisites they already know.
 *
 * See components/editor/conditionalVisibility/conditionalVisibility.ts for an
 * architectural overview of this feature.
 *
 * This is somewhat similar to the SimpleBox plugin from the CkEditor
 * plugin documentation:
 *     https://ckeditor.com/docs/ckeditor5/latest/framework/tutorials/widgets/implementing-a-block-widget.html
 */
export default class ConditionalVisibility extends Plugin {
  static get requires() {
    return [Widget];
  }
  init() {
    this._defineSchema();
    this._registerPostFixer();
    this._defineConverters();
    this.editor.commands.add(
      "insertConditionallyVisibleBlock",
      new InsertConditionallyVisibleBlock(this.editor),
    );
    this.editor.ui.componentFactory.add(
      "conditionallyVisibleSectionButton",
      (locale) => {
        const command = this.editor.commands.get("insertConditionallyVisibleBlock");
        const buttonView = new ButtonView(locale);
        buttonView.set({
          label: "Conditionally Visible Section",
          icon: conditionallyVisibleSectionIcon,
          tooltip: true,
        });
        this.listenTo(buttonView, "execute", () =>
          this.editor.execute("insertConditionallyVisibleBlock"),
        );
        return buttonView;
      },
    );
  }
  _defineSchema() {
    const schema = this.editor.model.schema;
    schema.register("conditionallyVisibleSection", {
      allowWhere: "$block",
      allowContentOf: "$root",
      allowAttributes: ["visibility"],
    });
  }
  _defineConverters() {
    const config = this.editor.config.get("conditionalVisibility");
    const conversion = this.editor.conversion;
    const editor = this.editor;
    conversion.for("downcast").attributeToAttribute({
      model: "visibility",
      view: "data-visibility",
    });
    conversion.for("upcast").elementToElement({
      model: (viewElement, { writer }) => {
        return writer.createElement("conditionallyVisibleSection", {
          visibility: viewElement.getAttribute("data-visibility"),
        });
      },
      view: { name: "div", classes: "conditionallyVisibleBlock" },
    });
    conversion.for("editingDowncast").elementToStructure({
      model: {
        name: "conditionallyVisibleSection",
      },
      view: (modelElement, conversionApi) => {
        const { writer: downcastWriter } = conversionApi;
        const reactWrapper = downcastWriter.createRawElement(
          "div",
          {
            class: "conditionallyVisibleSectionSettings__react-wrapper",
          },
          (domElement) => {
            const stateString = modelElement.getAttribute("visibility");
            let state = { type: "unset" };
            try {
              state = JSON.parse(String(stateString));
            } catch {
              console.error(
                "Unparseable data-visibility attribute on conditionally visible block",
              );
            }
            const setState = (newState) => {
              this.editor.model.change((changeWriter) => {
                changeWriter.setAttribute(
                  "visibility",
                  JSON.stringify(newState),
                  modelElement,
                );
              });
            };
            config.renderConditionalVisibilitySettingsInto(
              domElement,
              state,
              setState,
            );
          },
        );
        return downcastWriter.createContainerElement(
          "div",
          {
            class: "conditionallyVisibleBlock",
            "data-visibility": modelElement.getAttribute("visibility"),
          },
          [reactWrapper, downcastWriter.createSlot()],
        );
      },
    });
    conversion.for("dataDowncast").elementToStructure({
      model: {
        name: "conditionallyVisibleSection",
      },
      view: (modelElement, conversionApi) => {
        const { writer } = conversionApi;
        const visibilityOptionsStr = modelElement.getAttribute("visibility");
        let visibilityOptions = { type: "unset" };
        try {
          if (visibilityOptionsStr === "string")
            visibilityOptions = JSON.parse(visibilityOptionsStr);
        } catch (e) {
          console.error("Could not parse conditional-visibility block settings");
        }
        const isDefaultVisible =
          isConditionallyVisibleBlockVisibleByDefault(visibilityOptions);
        return writer.createContainerElement(
          "div",
          {
            class: classNames("conditionallyVisibleBlock", {
              defaultVisible: isDefaultVisible,
              defaultHidden: !isDefaultVisible,
            }),
            "data-visibility": visibilityOptionsStr,
          },
          [writer.createSlot()],
        );
      },
    });
  }
  _registerPostFixer() {
    const editor = this.editor;
    const model = editor.model;
    // Check whether the last element in the page is a conditionallyVisibleSection. If
    // so, insert an empty paragraph after it. This ensures that you'll be able
    // to place the cursor below the conditionallyVisibleSection.
    model.document.registerPostFixer((writer) => {
      const root = model.document.getRoot();
      const lastChild = root.getChild(root.childCount - 1);
      if (lastChild.is("element", "conditionallyVisibleSection")) {
        const paragraph = writer.createElement("paragraph");
        writer.insert(paragraph, root, "end");
        return true;
      }
      return false;
    });
  }
}
export class InsertConditionallyVisibleBlock extends Command {
  execute() {
    const model = this.editor.model;
    model.change((writer) => {
      const selection = model.document.selection;
      const currentElement = selection.getFirstPosition().parent;
      const insertPosition =
        currentElement.childCount > 0
          ? writer.createPositionAfter(currentElement)
          : writer.createPositionAt(currentElement, 0);
      if (!insertPosition) throw new Error("Invalid insert position");
      const { conditionallyVisibleSection, conditionallyVisibleSectionContents } =
        createConditionallyVisibleSection(writer);
      model.insertContent(conditionallyVisibleSection, insertPosition);
      const newCursor = writer.createPositionAt(
        conditionallyVisibleSectionContents,
        0,
      );
      writer.setSelection(newCursor);
    });
  }
  refresh() {
    const model = this.editor.model;
    const lastPosition = model.document.selection.getLastPosition();
    const allowedIn =
      lastPosition &&
      model.schema.findAllowedParent(lastPosition, "conditionallyVisibleSection");
    this.isEnabled = allowedIn !== null;
  }
}
function createConditionallyVisibleSection(writer) {
  const conditionallyVisibleSection = writer.createElement(
    "conditionallyVisibleSection",
  );
  const contents = writer.createElement("paragraph");
  writer.append(contents, conditionallyVisibleSection);
  return {
    conditionallyVisibleSection,
    conditionallyVisibleSectionContents: contents,
  };
}
//# sourceMappingURL=conditional-visibility-plugin.js.map
