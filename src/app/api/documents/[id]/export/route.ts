import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { documents, spaces } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/auth';
import { eq, and } from 'drizzle-orm';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';

// GET - Export document in various formats
export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: docId } = await params;
        const url = new URL(req.url);
        const format = url.searchParams.get('format') || 'md';

        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const doc = await db.query.documents.findFirst({
            where: eq(documents.id, docId),
        });

        if (!doc) {
            return NextResponse.json({ message: 'Document not found' }, { status: 404 });
        }

        // Verify ownership
        const space = await db.query.spaces.findFirst({
            where: and(eq(spaces.id, doc.spaceId), eq(spaces.userId, user.id)),
        });

        if (!space) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const plainText = doc.plainText || '';
        const title = doc.title || 'Untitled Document';

        if (format === 'md') {
            // Export as Markdown
            const markdown = convertToMarkdown(doc.content, title);
            return new NextResponse(markdown, {
                headers: {
                    'Content-Type': 'text/markdown',
                    'Content-Disposition': `attachment; filename="${sanitizeFilename(title)}.md"`,
                },
            });
        } else if (format === 'txt') {
            // Export as plain text
            return new NextResponse(plainText, {
                headers: {
                    'Content-Type': 'text/plain',
                    'Content-Disposition': `attachment; filename="${sanitizeFilename(title)}.txt"`,
                },
            });
        } else if (format === 'docx') {
            // Export as Word document
            const docxBuffer = await createDocx(doc.content, title);
            return new NextResponse(new Uint8Array(docxBuffer), {
                headers: {
                    'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    'Content-Disposition': `attachment; filename="${sanitizeFilename(title)}.docx"`,
                },
            });
        } else if (format === 'html') {
            // Export as HTML
            const html = convertToHTML(doc.content, title);
            return new NextResponse(html, {
                headers: {
                    'Content-Type': 'text/html',
                    'Content-Disposition': `attachment; filename="${sanitizeFilename(title)}.html"`,
                },
            });
        }

        return NextResponse.json({ message: 'Invalid format' }, { status: 400 });
    } catch (error) {
        console.error('Error exporting document:', error);
        return NextResponse.json({ message: 'Failed to export document' }, { status: 500 });
    }
}

function sanitizeFilename(name: string): string {
    return name.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
}

// Convert Tiptap JSON to Markdown
function convertToMarkdown(content: any, title: string): string {
    let md = `# ${title}\n\n`;

    if (!content?.content) return md;

    for (const node of content.content) {
        md += nodeToMarkdown(node);
    }

    return md;
}

function nodeToMarkdown(node: any): string {
    if (!node) return '';

    switch (node.type) {
        case 'heading':
            const level = node.attrs?.level || 1;
            const prefix = '#'.repeat(level);
            return `${prefix} ${getTextContent(node)}\n\n`;

        case 'paragraph':
            const text = getTextContent(node);
            return text ? `${text}\n\n` : '\n';

        case 'bulletList':
            return node.content?.map((item: any) => `- ${getTextContent(item)}`).join('\n') + '\n\n';

        case 'orderedList':
            return node.content?.map((item: any, i: number) => `${i + 1}. ${getTextContent(item)}`).join('\n') + '\n\n';

        case 'blockquote':
            return `> ${getTextContent(node)}\n\n`;

        case 'codeBlock':
            return `\`\`\`\n${getTextContent(node)}\n\`\`\`\n\n`;

        default:
            return '';
    }
}

function getTextContent(node: any): string {
    if (!node) return '';
    if (node.type === 'text') {
        let text = node.text || '';
        if (node.marks) {
            for (const mark of node.marks) {
                if (mark.type === 'bold') text = `**${text}**`;
                if (mark.type === 'italic') text = `*${text}*`;
                if (mark.type === 'underline') text = `<u>${text}</u>`;
                if (mark.type === 'strike') text = `~~${text}~~`;
            }
        }
        return text;
    }
    if (node.content) {
        return node.content.map(getTextContent).join('');
    }
    return '';
}

// Convert Tiptap JSON to HTML
function convertToHTML(content: any, title: string): string {
    let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 20px; line-height: 1.6; }
    h1, h2, h3 { margin-top: 1.5em; margin-bottom: 0.5em; }
    p { margin: 1em 0; }
    ul, ol { padding-left: 2em; }
  </style>
</head>
<body>
<h1>${title}</h1>
`;

    if (content?.content) {
        for (const node of content.content) {
            html += nodeToHTML(node);
        }
    }

    html += '</body></html>';
    return html;
}

function nodeToHTML(node: any): string {
    if (!node) return '';

    switch (node.type) {
        case 'heading':
            const level = node.attrs?.level || 1;
            return `<h${level}>${getHTMLContent(node)}</h${level}>`;

        case 'paragraph':
            return `<p>${getHTMLContent(node)}</p>`;

        case 'bulletList':
            return `<ul>${node.content?.map((item: any) => `<li>${getHTMLContent(item)}</li>`).join('')}</ul>`;

        case 'orderedList':
            return `<ol>${node.content?.map((item: any) => `<li>${getHTMLContent(item)}</li>`).join('')}</ol>`;

        default:
            return '';
    }
}

function getHTMLContent(node: any): string {
    if (!node) return '';
    if (node.type === 'text') {
        let text = node.text || '';
        if (node.marks) {
            for (const mark of node.marks) {
                if (mark.type === 'bold') text = `<strong>${text}</strong>`;
                if (mark.type === 'italic') text = `<em>${text}</em>`;
                if (mark.type === 'underline') text = `<u>${text}</u>`;
                if (mark.type === 'strike') text = `<s>${text}</s>`;
            }
        }
        return text;
    }
    if (node.content) {
        return node.content.map(getHTMLContent).join('');
    }
    return '';
}

// Create Word document
async function createDocx(content: any, title: string): Promise<Buffer> {
    const children: any[] = [
        new Paragraph({
            text: title,
            heading: HeadingLevel.TITLE,
        }),
    ];

    if (content?.content) {
        for (const node of content.content) {
            const para = nodeToDocx(node);
            if (para) children.push(para);
        }
    }

    const doc = new Document({
        sections: [{
            properties: {},
            children,
        }],
    });

    const buffer = await Packer.toBuffer(doc);
    return Buffer.from(buffer);
}

function nodeToDocx(node: any): Paragraph | null {
    if (!node) return null;

    switch (node.type) {
        case 'heading':
            const level = node.attrs?.level || 1;
            const headingLevel = level === 1 ? HeadingLevel.HEADING_1 :
                level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3;
            return new Paragraph({
                text: getPlainText(node),
                heading: headingLevel,
            });

        case 'paragraph':
            const runs = getDocxRuns(node);
            return new Paragraph({ children: runs });

        default:
            return null;
    }
}

function getPlainText(node: any): string {
    if (!node) return '';
    if (node.type === 'text') return node.text || '';
    if (node.content) return node.content.map(getPlainText).join('');
    return '';
}

function getDocxRuns(node: any): TextRun[] {
    if (!node) return [];
    if (node.type === 'text') {
        const options: any = { text: node.text || '' };
        if (node.marks) {
            for (const mark of node.marks) {
                if (mark.type === 'bold') options.bold = true;
                if (mark.type === 'italic') options.italics = true;
                if (mark.type === 'underline') options.underline = {};
                if (mark.type === 'strike') options.strike = true;
            }
        }
        return [new TextRun(options)];
    }
    if (node.content) {
        return node.content.flatMap(getDocxRuns);
    }
    return [];
}
