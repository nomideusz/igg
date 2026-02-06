import { db, documents, sections } from '$lib/db';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	// Get the main document (if exists)
	const allDocuments = await db.select().from(documents);
	const mainDocument = allDocuments.find((d) => d.type === 'main');

	if (!mainDocument) {
		return {
			mainDocument: null,
			sections: [],
		};
	}

	// Get all sections for the main document
	const docSections = await db
		.select()
		.from(sections)
		.where(eq(sections.documentId, mainDocument.id))
		.orderBy(sections.order);

	return {
		mainDocument,
		sections: docSections,
	};
};
