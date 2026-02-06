import type { PageServerLoad } from './$types';
import { db, documents, sections, proposals } from '$lib/db';
import { eq, and } from 'drizzle-orm';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
	const documentId = parseInt(params.id);
	const sectionId = parseInt(params.sectionId);

	// Get the document
	const [document] = await db.select().from(documents).where(eq(documents.id, documentId));
	if (!document) {
		throw error(404, 'Document not found');
	}

	// Get all sections for navigation
	const allSections = await db
		.select()
		.from(sections)
		.where(eq(sections.documentId, documentId))
		.orderBy(sections.order);

	// Get current section
	const currentSection = allSections.find((s) => s.id === sectionId);
	if (!currentSection) {
		throw error(404, 'Section not found');
	}

	// Get proposals for this section
	const sectionProposals = await db
		.select()
		.from(proposals)
		.where(eq(proposals.sectionId, sectionId));

	// Find prev/next sections for navigation
	const currentIndex = allSections.findIndex((s) => s.id === sectionId);
	const prevSection = currentIndex > 0 ? allSections[currentIndex - 1] : null;
	const nextSection = currentIndex < allSections.length - 1 ? allSections[currentIndex + 1] : null;

	return {
		document,
		section: currentSection,
		sections: allSections,
		proposals: sectionProposals,
		prevSection,
		nextSection,
	};
};
