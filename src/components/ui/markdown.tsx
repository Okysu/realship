import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// 渲染 Markdown，元素映射到语义 token（自动适配暗色）。
export function Markdown({ content }: { content: string }) {
  return (
    <div className="text-sm leading-7 text-muted-foreground">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="mb-3 mt-6 text-xl font-bold text-foreground first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-2 mt-6 text-base font-semibold text-foreground first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-2 mt-4 font-semibold text-foreground">
              {children}
            </h3>
          ),
          p: ({ children }) => <p className="my-2 leading-7">{children}</p>,
          ul: ({ children }) => (
            <ul className="my-2 ml-5 list-disc space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-2 ml-5 list-decimal space-y-1">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-7">{children}</li>,
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {children}
            </a>
          ),
          code: ({ children }) => (
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              {children}
            </code>
          ),
          hr: () => <hr className="my-4 border-border" />,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-border pl-4 italic">
              {children}
            </blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
