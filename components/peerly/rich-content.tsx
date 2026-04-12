'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

function YouTubeEmbed({ url }: { url: string }) {
  const match =
    url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/) ||
    url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/)
  if (!match) return null
  return (
    <div className="my-3 rounded-xl overflow-hidden border border-border aspect-video">
      <iframe
        src={`https://www.youtube.com/embed/${match[1]}`}
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  )
}

/** Renders markdown text + auto-embeds YouTube links + shows image/file attachments */
export function RichContent({
  text,
  attachments,
  className,
}: {
  text: string
  attachments?: string[]
  className?: string
}) {
  const ytRegex = /https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})[^\s]*/g
  const ytUrls = [...text.matchAll(ytRegex)].map(m => m[0])
  // Strip raw YouTube URLs from text so they don't render as plain links alongside the embed
  const cleanText = text.replace(ytRegex, '')

  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => (
            <p className="text-sm leading-7 text-muted-foreground my-1.5">{children}</p>
          ),
          h1: ({ children }) => (
            <h1 className="text-xl font-bold text-foreground mt-5 mb-2">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-bold text-foreground mt-4 mb-2">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-bold text-foreground mt-3 mb-1.5">{children}</h3>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-muted-foreground">{children}</em>
          ),
          code: ({ children, className: cls }) => {
            const isBlock = cls?.includes('language-')
            return isBlock ? (
              <code className="block bg-background border border-border rounded-lg p-4 text-xs font-mono text-primary overflow-x-auto my-3 whitespace-pre">
                {children}
              </code>
            ) : (
              <code className="bg-primary/10 text-primary px-1 py-0.5 rounded text-xs font-mono">
                {children}
              </code>
            )
          },
          pre: ({ children }) => <>{children}</>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-primary/40 pl-3 my-2 text-muted-foreground italic">
              {children}
            </blockquote>
          ),
          ul: ({ children }) => (
            <ul className="my-2 space-y-1 pl-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-2 space-y-1 pl-4 list-decimal">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="flex items-start gap-2 text-sm text-muted-foreground">
              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary/60 shrink-0" />
              <span>{children}</span>
            </li>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline break-all"
            >
              {children}
            </a>
          ),
          hr: () => <hr className="border-border my-4" />,
          img: ({ src, alt }) => (
            <img src={src} alt={alt ?? ''} className="rounded-lg border border-border max-h-64 my-2 object-cover" />
          ),
        }}
      >
        {cleanText}
      </ReactMarkdown>

      {/* YouTube embeds */}
      {ytUrls.map((url, i) => <YouTubeEmbed key={i} url={url} />)}

      {/* Persistent attachments (uploaded files) */}
      {attachments && attachments.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {attachments.map((url, i) => {
            const isImage = /\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(url)
            if (isImage) {
              return (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                  <img src={url} alt={`attachment-${i}`} className="max-h-48 rounded-lg border border-border object-cover" />
                </a>
              )
            }
            let domain = ''
            try { domain = new URL(url).hostname.replace('www.', '') } catch {}
            return (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline break-all"
              >
                🔗 {domain || url}
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}
