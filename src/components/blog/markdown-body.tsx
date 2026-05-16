"use client";

import ReactMarkdown from "react-markdown";

export function MarkdownBody({ markdown }: { markdown: string }) {
  return (
    <ReactMarkdown
      components={{
        h2: ({ children }) => <h2>{children}</h2>,
        h3: ({ children }) => <h3>{children}</h3>,
        p: ({ children }) => <p>{children}</p>,
        a: ({ href, children }) => (
          <a href={href} target={href?.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">
            {children}
          </a>
        ),
        strong: ({ children }) => <strong>{children}</strong>,
        em: ({ children }) => <em>{children}</em>,
        code: ({ children, className }) => {
          const isBlock = className?.includes("language-");
          if (isBlock) return <code className={className}>{children}</code>;
          return <code>{children}</code>;
        },
        pre: ({ children }) => <pre>{children}</pre>,
        ul: ({ children }) => <ul>{children}</ul>,
        li: ({ children }) => <li>{children}</li>,
        blockquote: ({ children }) => <blockquote>{children}</blockquote>,
        hr: () => <hr />,
      }}
    >
      {markdown}
    </ReactMarkdown>
  );
}
