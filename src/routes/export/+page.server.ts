import { db, documents, sections, proposals } from '$lib/db';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	// Get the main document
	const allDocuments = await db.select().from(documents);
	const mainDocument = allDocuments.find((d) => d.type === 'main');

	if (!mainDocument) {
		return {
			mainDocument: null,
			sections: [],
		};
	}

	// Get all sections with their proposals
	const allSections = await db
		.select()
		.from(sections)
		.where(eq(sections.documentId, mainDocument.id))
		.orderBy(sections.order);

	// Get all proposals
	const allProposals = await db.select().from(proposals);

	// Merge proposals into sections
	const sectionsWithProposals = allSections.map((section) => {
		const sectionProposal = allProposals.find((p) => p.sectionId === section.id);
		return {
			...section,
			proposal: sectionProposal || null,
		};
	});

	return {
		mainDocument,
		sections: sectionsWithProposals,
	};
};
