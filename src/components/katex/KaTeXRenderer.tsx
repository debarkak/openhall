"use client";

import React, { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

interface KaTeXRendererProps {
  content: string;
  className?: string;
}

/**
 * Parses mixed Markdown and LaTeX strings containing:
 * - Block math: $$formula$$
 * - Inline math: $formula$
 * Renders formulas with KaTeX and regular text with formatting.
 */
export const KaTeXRenderer: React.FC<KaTeXRendererProps> = ({
  content,
  className = "",
}) => {
  const renderedElements = useMemo(() => {
    if (!content) return null;

    // Split on block math $$...$$ first, then inline math $...$
    const parts = content.split(/(\$\$[\s\S]+?\$\$|\$[^\$]+?\$)/g);

    return parts.map((part, index) => {
      if (part.startsWith("$$") && part.endsWith("$$")) {
        const formula = part.slice(2, -2).trim();
        try {
          const html = katex.renderToString(formula, {
            displayMode: true,
            throwOnError: false,
          });
          return (
            <div
              key={index}
              className="my-3 overflow-x-auto text-center"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } catch {
          return (
            <div key={index} className="my-2 font-mono text-red-500">
              {part}
            </div>
          );
        }
      }

      if (part.startsWith("$") && part.endsWith("$")) {
        const formula = part.slice(1, -1).trim();
        try {
          const html = katex.renderToString(formula, {
            displayMode: false,
            throwOnError: false,
          });
          return (
            <span
              key={index}
              className="inline-block px-1 align-baseline"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } catch {
          return (
            <span key={index} className="font-mono text-red-500">
              {part}
            </span>
          );
        }
      }

      // Plain text formatting: handle newlines
      return (
        <span key={index} className="whitespace-pre-line leading-relaxed">
          {part}
        </span>
      );
    });
  }, [content]);

  return <div className={`katex-wrapper ${className}`}>{renderedElements}</div>;
};

export default KaTeXRenderer;
