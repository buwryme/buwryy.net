import { useState } from 'react';
import { Link } from 'react-router-dom';

function CodeBlock({ code, language }: { code: string; language: string }) {
    const [copied, setCopied] = useState(false);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
        } catch { /* clipboard can be blocked */ }
    };

    return (
        <div className="blog-code">
            <div className="blog-code-head">
                <div className="blog-code-tools">
                    <span>{language || 'text'}</span>
                    <button
                        type="button"
                        className="blog-code-copy"
                        onClick={copy}
                        aria-label={copied ? 'Copied' : 'Copy code'}
                    >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H8V7h11v14z" />
                        </svg>
                    </button>
                </div>
            </div>
            <pre><code>{code}</code></pre>
        </div>
    );
}

function inline(text: string, keyPrefix: string): React.ReactNode[] {
    const nodes: React.ReactNode[] = [];
    const pattern = /(!\[([^\]]*)\]\(([^)]+)\))|(\[([^\]]+)\]\(([^)]+)\))|(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)/g;
    let cursor = 0;
    let match: RegExpExecArray | null;
    let index = 0;

    while ((match = pattern.exec(text)) !== null) {
        if (match.index > cursor) nodes.push(text.slice(cursor, match.index));
        const key = `${keyPrefix}-${index++}`;

        if (match[1]) {
            nodes.push(
                <img key={key} src={match[3]} alt={match[2]} loading="lazy" />,
            );
        } else if (match[4]) {
            const label = match[5];
            const href = match[6];
            if (/^https?:\/\//i.test(href)) {
                nodes.push(
                    <a key={key} href={href} target="_blank" rel="noopener noreferrer">{label}</a>,
                );
            } else if (href.startsWith('#')) {
                nodes.push(<a key={key} href={href}>{label}</a>);
            } else {
                nodes.push(<Link key={key} to={href}>{label}</Link>);
            }
        } else if (match[7]) {
            nodes.push(<code key={key}>{match[7].slice(1, -1)}</code>);
        } else if (match[8]) {
            nodes.push(<strong key={key}>{match[8].slice(2, -2)}</strong>);
        } else if (match[9]) {
            nodes.push(<em key={key}>{match[9].slice(1, -1)}</em>);
        }

        cursor = match.index + match[0].length;
    }

    if (cursor < text.length) nodes.push(text.slice(cursor));
    return nodes;
}

export default function Markdown({ source }: { source: string }) {
    const lines = source.replace(/\r\n/g, '\n').split('\n');
    const blocks: React.ReactNode[] = [];
    let index = 0;

    while (index < lines.length) {
        const line = lines[index];

        if (!line.trim()) {
            index++;
            continue;
        }

        if (line.startsWith('```')) {
            const language = line.slice(3).trim();
            const code: string[] = [];
            index++;
            while (index < lines.length && !lines[index].startsWith('```')) {
                code.push(lines[index]);
                index++;
            }
            index++;
            blocks.push(
                <CodeBlock key={`code-${index}`} code={code.join('\n')} language={language} />,
            );
            continue;
        }

        const heading = /^(#{1,4})\s+(.*)$/.exec(line);
        if (heading) {
            const level = heading[1].length;
            const content = inline(heading[2], `heading-${index}`);
            if (level === 1) blocks.push(<h1 key={`h-${index}`}>{content}</h1>);
            else if (level === 2) blocks.push(<h2 key={`h-${index}`}>{content}</h2>);
            else if (level === 3) blocks.push(<h3 key={`h-${index}`}>{content}</h3>);
            else blocks.push(<h4 key={`h-${index}`}>{content}</h4>);
            index++;
            continue;
        }

        if (/^(-|\*)\s+/.test(line)) {
            const items: string[] = [];
            while (index < lines.length && /^(-|\*)\s+/.test(lines[index])) {
                items.push(lines[index].replace(/^(-|\*)\s+/, ''));
                index++;
            }
            blocks.push(
                <ul key={`ul-${index}`}>
                    {items.map((item, itemIndex) => <li key={itemIndex}>{inline(item, `ul-${index}-${itemIndex}`)}</li>)}
                </ul>,
            );
            continue;
        }

        if (/^\d+\.\s+/.test(line)) {
            const items: string[] = [];
            while (index < lines.length && /^\d+\.\s+/.test(lines[index])) {
                items.push(lines[index].replace(/^\d+\.\s+/, ''));
                index++;
            }
            blocks.push(
                <ol key={`ol-${index}`}>
                    {items.map((item, itemIndex) => <li key={itemIndex}>{inline(item, `ol-${index}-${itemIndex}`)}</li>)}
                </ol>,
            );
            continue;
        }

        if (line.startsWith('>')) {
            const quote: string[] = [];
            while (index < lines.length && lines[index].startsWith('>')) {
                quote.push(lines[index].replace(/^>\s?/, ''));
                index++;
            }
            blocks.push(<blockquote key={`quote-${index}`}>{inline(quote.join(' '), `quote-${index}`)}</blockquote>);
            continue;
        }

        const paragraph: string[] = [line];
        index++;
        while (
            index < lines.length
            && lines[index].trim()
            && !/^(#{1,4}\s|```|(-|\*)\s+|\d+\.\s+|>)/.test(lines[index])
        ) {
            paragraph.push(lines[index]);
            index++;
        }
        blocks.push(<p key={`p-${index}`}>{inline(paragraph.join(' '), `p-${index}`)}</p>);
    }

    return <div className="blog-markdown">{blocks}</div>;
}
