import { createRequire } from 'module';
const require = createRequire(import.meta.url);

export interface ParsedPdf {
	text: string;
	numPages: number;
	info: Record<string, unknown>;
}

/**
 * Parse a PDF file and extract text content using pdf-parse v2
 */
export async function parsePdf(buffer: Buffer): Promise<ParsedPdf> {
    let PDFParseClass;
    
    try {
        const lib = require('pdf-parse');
        PDFParseClass = lib.PDFParse || lib.default?.PDFParse;
    } catch (e: any) {
        throw new Error(`Failed to load pdf-parse: ${e.message}`);
    }

    if (!PDFParseClass) {
        throw new Error('PDFParse class not found in pdf-parse library exports');
    }

    // Initialize parser with buffer data
    // The library expects { data: buffer } or { url: ... }
    const parser = new PDFParseClass({ data: buffer });
    
    try {
        // Extract text
        const textResult = await parser.getText();
        
        // Extract metadata (page count, etc.)
        const infoResult = await parser.getInfo();
        
        return {
            text: textResult.text,
            numPages: infoResult.total || 0,
            info: infoResult.info || {},
        };
    } finally {
        // Ensure we clean up resources
        if (parser && typeof parser.destroy === 'function') {
            await parser.destroy();
        }
    }
}

/**
 * Split PDF text into paragraphs for easier reading
 */
export function splitIntoParagraphs(text: string): string[] {
	return text
		.split(/\n\s*\n/)
		.map((p) => p.trim())
		.filter((p) => p.length > 0);
}
