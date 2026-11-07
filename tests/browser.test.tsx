import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import Browser from "../app/browser";

test("preview browser renders before templates and saved drafts are available", () => {
  const html = renderToStaticMarkup(<Browser />);

  assert.match(html, /Discovering templates/);
  assert.match(html, /Search templates/);
});
