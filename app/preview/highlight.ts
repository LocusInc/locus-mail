import Prism from "prismjs";
import "prismjs/components/prism-json";

export const syntaxClasses =
  "[&_.token]:text-[#c7a0ee] [&_.token.tag]:text-[#ffb47b] [&_.token.property]:text-[#ffb47b] [&_.token.string]:text-[#9dd9ac] [&_.token.attr-value]:text-[#9dd9ac] [&_.token.punctuation]:text-[#aaaab4] [&_.token.comment]:text-[#9999a3]";

export function highlight(source: string, language: "markup" | "json") {
  return Prism.highlight(source, Prism.languages[language], language);
}
