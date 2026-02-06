import mammoth from 'mammoth';

export interface ParsedSection {
	title: string;
	content: string;
	level: number;
	order: number;
}

export interface ParsedDocument {
	html: string;
	sections: ParsedSection[];
	messages: string[];
}

/**
 * Parse a DOCX file and extract sections based on heading levels
 */
export async function parseDocx(buffer: Buffer): Promise<ParsedDocument> {
	const result = await mammoth.convertToHtml({ buffer });
	const html = result.value;
	const messages = result.messages.map((m) => m.message);

	const sections = extractSections(html);

	return {
		html,
		sections,
		messages,
	};
}

/**
 * Extract sections from HTML based on heading tags
 */
function extractSections(html: string): ParsedSection[] {
	const sections: ParsedSection[] = [];
	
	// Regex to match headings, capturing the full tag+content
	const headingPattern = /<h([1-6])[^>]*>(.*?)<\/h\1>/gi;
	
	// Split content by headings, capturing the separator (the heading itself)
	// This results in: [pre-content, heading1, content1, heading2, content2, ...]
	const parts = html.split(/(<h[1-6][^>]*>.*?<\/h[1-6]>)/gi);
	
	// If first part is not empty and not a heading, it's a preamble (ignore or add as intro?)
	// For simplicity, we'll iterate through pairs of (heading, content)
	
	let order = 0;
	
	// Find the first heading index
	let startIndex = parts.findIndex(p => headingPattern.test(p));
	
	if (startIndex === -1) {
		// No headings found, return whole doc
		if (html.trim()) {
			sections.push({
				title: 'Document Content',
				content: html,
				level: 1,
				order: 0,
			});
		}
		return sections;
	}

	for (let i = startIndex; i < parts.length; i += 2) {
		const headingHtml = parts[i];
		const contentHtml = parts[i + 1] || ''; // Content follows heading
		
		// Extract title and level from the heading HTML
		// We re-run regex on just this string to be safe/easy
		headingPattern.lastIndex = 0; // Reset state
		const match = headingPattern.exec(headingHtml);
		
		if (match) {
			const level = parseInt(match[1]);
			const title = stripHtml(match[2]);
			
			if (title.trim()) {
				// Combine heading + content so the semantic heading is preserved in the section view
				const fullContent = headingHtml + contentHtml;
				
				sections.push({
					title,
					content: fullContent,
					level,
					order: order++,
				});
			}
		}
	}
	
	return sections;
}

/**
 * Strip HTML tags from string
 */
function stripHtml(html: string): string {
	return html.replace(/<[^>]*>/g, '').trim();
}
