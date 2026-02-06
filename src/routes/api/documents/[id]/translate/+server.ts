import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db, documents } from '$lib/db';
import { eq } from 'drizzle-orm';
import OpenAI from 'openai';
import { env } from '$env/dynamic/private';



// Initialized inside POST handler
let openai: OpenAI;

// Helper to split text into safe chunks
function smartSplit(text: string, maxLength = 12000): string[] {
    // Aggressive cleaning:
    // 1. Remove null bytes and control chars
    // 2. Normalize newlines
    // 3. Collapse multiple spaces to single space
    // 4. Collapse multiple newlines (>2) to exactly 2 (paragraph break)
    let cleanText = text
        .replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, "") // Remove ASCII control chars (except \n, \r)
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .replace(/[ \t]+/g, ' ') // Collapse spaces/tabs
        .replace(/ \n/g, "\n")   // Trim line ends
        .replace(/\n /g, "\n")   // Trim line starts
        .replace(/\n\n+/g, "\n\n"); // Max 2 newlines
    
    cleanText = cleanText.trim();

    // First, split by double newlines (paragraphs)
    let paragraphs = cleanText.split(/\n\n+/);
    
    // Fallback: If we have very few paragraphs but text is long, likely single-spaced or weird formatting
    // Try splitting by single newline
    if (paragraphs.length < 5 && cleanText.length > maxLength) {
        paragraphs = cleanText.split(/\n+/);
    }

    const chunks: string[] = [];
    let currentChunk = "";
    
    for (const para of paragraphs) {
        // If a single segment is still huge (no newlines), forced hard split it
        if (para.length > maxLength) {
            if (currentChunk) {
                chunks.push(currentChunk);
                currentChunk = "";
            }
            // Hard split by length
            let remaining = para;
            while (remaining.length > 0) {
                chunks.push(remaining.substring(0, maxLength));
                remaining = remaining.substring(maxLength);
            }
            continue;
        }

        // Try to append to current chunk
        // +2 accounts for the "\n\n" separator we add back
        if ((currentChunk.length + para.length + 2) > maxLength) {
            chunks.push(currentChunk);
            currentChunk = para;
        } else {
            currentChunk = currentChunk ? (currentChunk + "\n\n" + para) : para;
        }
    }
    
    if (currentChunk) {
        chunks.push(currentChunk);
    }
    
    return chunks;
}

export const POST: RequestHandler = async ({ params }) => {
    const id = parseInt(params.id || '');
    if (isNaN(id)) {
        return json({ error: 'Invalid document ID' }, { status: 400 });
    }

    const document = await db.query.documents.findFirst({
        where: eq(documents.id, id),
    });

    if (!document || !document.rawContent) {
        return json({ error: 'Document not found or empty' }, { status: 404 });
    }

    const chunks = smartSplit(document.rawContent);
    const totalChunks = chunks.length;
    // Calculate REAL size to be translated (after cleaning)
    const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);

    const stream = new ReadableStream({
        async start(controller) {
            try {
                let fullTranslation = "";
                
                await db.update(documents)
                    .set({ translationStatus: 'in-progress' })
                    .where(eq(documents.id, id));

                for (let i = 0; i < totalChunks; i++) {
                    const chunk = chunks[i];
                    
                    // Progress Update
                    const progress = Math.round(((i) / totalChunks) * 100);
                    const msg = JSON.stringify({ 
                        type: 'progress', 
                        value: progress, 
                        status: `Translating part ${i + 1} of ${totalChunks} (${Math.round(totalLength/1024)}KB)...` 
                    }) + '\n';
                    controller.enqueue(msg);

                    if (!openai) {
                         openai = new OpenAI({
                            apiKey: env.OPENAI_API_KEY,
                        });
                    }

                    const completion = await openai.chat.completions.create({
                        model: "gpt-4o",
                        messages: [
                            {
                                role: "system",
                                content: "You are a professional translator. Translate the following technical document content into clear, professional English. \n\nIMPORTANT INSTRUCTIONS:\n1. Translate the ENTIRE text verbatim. Do NOT summarize or omit any sections.\n2. Output the result as **semantic HTML**.\n3. Wrap paragraphs in <p> tags, use <h2>/<h3> for headings, and <ul>/<ol> for lists.\n4. Preserve any tables using standard HTML <table> tags.\n5. Do NOT use <html>, <head>, or <body> tags, just the content.\n6. Keep all technical terms accurate."
                            },
                            {
                                role: "user",
                                content: chunk
                            }
                        ],
                    });
                    
                    let translatedText = completion.choices[0].message.content || "";
                    // Strip markdown code blocks if present
                    translatedText = translatedText.replace(/^```html\s*/, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
                    
                    fullTranslation += translatedText + "\n\n";
                }

                // Final save
                await db.update(documents)
                    .set({ 
                        translatedContent: fullTranslation,
                        translationStatus: 'completed'
                    })
                    .where(eq(documents.id, id));
                
                controller.enqueue(JSON.stringify({ type: 'complete', translatedContent: fullTranslation }) + '\n');
                controller.close();

            } catch (error: any) {
                console.error("Translation stream error:", error);
                await db.update(documents).set({ translationStatus: 'error' }).where(eq(documents.id, id));
                controller.enqueue(JSON.stringify({ type: 'error', error: error.message }) + '\n');
                controller.close();
            }
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
        }
    });
};
