import React, { type ReactNode } from "react";

function inlineMarkdown(text: string) {
  const nodes: ReactNode[] = [];
  const tokenPattern = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^)\s]+\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenPattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];

    if (token.startsWith("**")) {
      nodes.push(<strong key={`${token}-${match.index}`}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("`")) {
      nodes.push(<code key={`${token}-${match.index}`}>{token.slice(1, -1)}</code>);
    } else {
      const linkMatch = /^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/.exec(token);

      if (linkMatch) {
        nodes.push(
          <a href={linkMatch[2]} key={`${token}-${match.index}`} target="_blank" rel="noreferrer">
            {linkMatch[1]}
          </a>
        );
      }
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

function highlightCode(code: string, language: string) {
  const keywords = [
    "async",
    "await",
    "catch",
    "class",
    "const",
    "export",
    "function",
    "if",
    "import",
    "let",
    "return",
    "throw",
    "try",
    "type",
    "while"
  ].join("|");
  const tokenPattern = new RegExp(`(//[^\\n]*|#[^\\n]*|"(?:[^"\\\\]|\\\\.)*"|'(?:[^'\\\\]|\\\\.)*'|\\b(?:${keywords})\\b|\\b\\d+(?:\\.\\d+)?\\b)`, "g");
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenPattern.exec(code)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(code.slice(lastIndex, match.index));
    }

    const token = match[0];
    let className = "code-token";

    if (token.startsWith("//") || token.startsWith("#")) {
      className += " code-comment";
    } else if (token.startsWith("\"") || token.startsWith("'")) {
      className += " code-string";
    } else if (/^\d/.test(token)) {
      className += " code-number";
    } else if (language !== "text") {
      className += " code-keyword";
    }

    nodes.push(<span className={className} key={`${token}-${match.index}`}>{token}</span>);
    lastIndex = match.index + token.length;
  }

  if (lastIndex < code.length) {
    nodes.push(code.slice(lastIndex));
  }

  return nodes;
}

export function MarkdownMessage({ content }: { content: string }) {
  const lines = content.split(/\r?\n/);
  const blocks: ReactNode[] = [];
  let listItems: string[] = [];
  let codeLines: string[] | null = null;
  let codeLanguage = "text";

  function flushList() {
    if (listItems.length === 0) {
      return;
    }

    blocks.push(
      <ul key={`list-${blocks.length}`}>
        {listItems.map((item, index) => (
          <li key={`${item}-${index}`}>{inlineMarkdown(item)}</li>
        ))}
      </ul>
    );
    listItems = [];
  }

  function flushCode() {
    if (!codeLines) {
      return;
    }

    blocks.push(
      <figure className="code-block" key={`code-${blocks.length}`}>
        <figcaption>{codeLanguage}</figcaption>
        <pre>
          <code className={`language-${codeLanguage}`}>{highlightCode(codeLines.join("\n"), codeLanguage)}</code>
        </pre>
      </figure>
    );
    codeLines = null;
    codeLanguage = "text";
  }

  lines.forEach((line, index) => {
    const fenceMatch = /^```([a-z0-9_-]+)?\s*$/i.exec(line.trim());

    if (fenceMatch) {
      if (codeLines) {
        flushCode();
      } else {
        flushList();
        codeLines = [];
        codeLanguage = fenceMatch[1]?.toLowerCase() ?? "text";
      }

      return;
    }

    if (codeLines) {
      codeLines.push(line);
      return;
    }

    const listMatch = /^\s*[-*]\s+(.+)$/.exec(line);

    if (listMatch) {
      listItems.push(listMatch[1]);
      return;
    }

    flushList();

    if (line.trim()) {
      blocks.push(<p key={`p-${index}`}>{inlineMarkdown(line)}</p>);
    }
  });

  flushList();
  flushCode();

  return <div className="markdown-message">{blocks}</div>;
}
