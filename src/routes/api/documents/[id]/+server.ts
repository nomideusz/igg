import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db, documents } from '$lib/db';
import { eq } from 'drizzle-orm';
import fs from 'node:fs/promises';
import path from 'node:path';

export const DELETE: RequestHandler = async ({ params }) => {
	const documentId = parseInt(params.id || '', 10);

	if (isNaN(documentId)) {
		return json({ error: 'Invalid document ID' }, { status: 400 });
	}

	try {
		// 1. Get document info to find file path
		const [doc] = await db.select().from(documents).where(eq(documents.id, documentId));

		if (!doc) {
			return json({ error: 'Document not found' }, { status: 404 });
		}

		// 2. Delete file if exists
		if (doc.originalPath) {
			try {
                // Remove the leading slash if present to get relative path from root or construct absolute path
                // originalPath is like "/uploads/xxx.pdf", we need "static/uploads/xxx.pdf"
                const relativePath = `static${doc.originalPath}`;
				await fs.unlink(relativePath);
			} catch (e) {
				console.warn('Failed to delete file:', e);
			}
		}

		// 3. Delete from database (cascades to sections/proposals)
		await db.delete(documents).where(eq(documents.id, documentId));

		return json({ success: true });
	} catch (error: any) {
		console.error('Delete document error:', error);
		return json({ error: error.message || 'Failed to delete document' }, { status: 500 });
	}
};
