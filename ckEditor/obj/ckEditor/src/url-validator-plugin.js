import Plugin from "@ckeditor/ckeditor5-core/src/plugin";
import { validateUrl } from "./url-validator-utils";
/**
 * CkEditor plugin to validate and fix link URLs
 */
export default class UrlValidator extends Plugin {
  init() {
    this.editor.model.document.on("change:data", (eventInfo) => {
      var _a;
      // JB: Downcast the event source to a document (which it should be). For
      // some reason my language server is able to figure out what type this is
      // from just the fact that it's the second argument of the .on(), but
      // when actually compiled with webpack it just comes out as "object".
      const source = eventInfo.source;
      for (const change of (_a =
        source === null || source === void 0 ? void 0 : source.differ) === null ||
      _a === void 0
        ? void 0
        : _a.getChanges()) {
        if (change.type === "attribute") {
          const key = change.attributeKey;
          const value = change.attributeNewValue;
          if (key === "linkHref" && value) {
            this._updateUrlIfInvalid(value);
          }
        }
      }
    });
  }
  _updateUrlIfInvalid(url) {
    const newUrl = validateUrl(url);
    if (newUrl !== url) {
      this.editor.model.change((writer) => {
        var _a;
        (_a = this.editor.commands.get("link")) === null || _a === void 0
          ? void 0
          : _a.execute(newUrl);
      });
    }
  }
}
//# sourceMappingURL=url-validator-plugin.js.map
