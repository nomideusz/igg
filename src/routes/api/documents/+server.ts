import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db, documents, sections } from '$lib/db';
import { parseDocx } from '$lib/services/docx-parser';
import { parsePdf } from '$lib/services/pdf-parser';

export const GET: RequestHandler = async () => {
	const allDocuments = await db.select().from(documents);
	return json(allDocuments);
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const formData = await request.formData();
		const file = formData.get('file') as File;
		const type = (formData.get('type') as string) || 'reference';
		const language = (formData.get('language') as string) || 'en';

		if (!file) {
			return json({ error: 'No file provided' }, { status: 400 });
		}

		const buffer = Buffer.from(await file.arrayBuffer());
		const fileName = file.name;
		const isDocx = fileName.toLowerCase().endsWith('.docx');
		const isPdf = fileName.toLowerCase().endsWith('.pdf');

		let rawContent = '';
		let extractedSections: Array<{ title: string; content: string; level: number; order: number }> = [];

		if (isDocx) {
			const parsed = await parseDocx(buffer);
			rawContent = parsed.html;
			extractedSections = parsed.sections;
		} else if (isPdf) {
			const parsed = await parsePdf(buffer);
			rawContent = parsed.text;
			// PDFs don't have structure, treat as single section
			extractedSections = [{
				title: fileName.replace('.pdf', ''),
				content: parsed.text,
				level: 1,
				order: 0
			}];
		} else {
			return json({ error: 'Unsupported file type. Please upload DOCX or PDF.' }, { status: 400 });
		}

		// Save file to static/uploads
		const uploadDir = 'static/uploads';
		const fs = await import('node:fs/promises');
		const path = await import('node:path');
		
		try {
			await fs.mkdir(uploadDir, { recursive: true });
		} catch (e) {
			// ignore if exists
		}

		const uniqueName = `${Date.now()}-${fileName}`;
		const filePath = path.join(uploadDir, uniqueName);
		await fs.writeFile(filePath, buffer);
		const publicPath = `/uploads/${uniqueName}`;

		// Insert document
		const [insertedDoc] = await db.insert(documents).values({
			name: fileName,
			originalPath: publicPath,
			type: type as 'main' | 'reference',
			language: language as 'en' | 'de' | 'pl',
			rawContent,
			uploadedAt: new Date().toISOString(),
		}).returning();

		// Insert sections (for main documents)
		if (type === 'main' && extractedSections.length > 0) {
			await db.insert(sections).values(
				extractedSections.map((s) => ({
					documentId: insertedDoc.id,
					title: s.title,
					originalContent: s.content,
					order: s.order,
					level: s.level,
					status: 'pending' as const,
					createdAt: new Date().toISOString(),
				}))
			);
		}

		return json({
			success: true,
			document: insertedDoc,
			sectionsCount: extractedSections.length,
		});
	} catch (error: any) {
		console.error('Document upload error:', error);
		return json({ error: error.message || 'Upload failed' }, { status: 500 });
	}
};
