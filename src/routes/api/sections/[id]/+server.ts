import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db, sections, proposals } from '$lib/db';
import { eq } from 'drizzle-orm';

// PATCH: Update section status
export const PATCH: RequestHandler = async ({ params, request }) => {
	const sectionId = parseInt(params.id);
	const { status } = await request.json();

	if (!['pending', 'in-progress', 'complete'].includes(status)) {
		return json({ error: 'Invalid status' }, { status: 400 });
	}

	await db
		.update(sections)
		.set({ status })
		.where(eq(sections.id, sectionId));

	return json({ success: true });
};

// POST: Save proposal for section
export const POST: RequestHandler = async ({ params, request }) => {
	const sectionId = parseInt(params.id);
	const { content, notes } = await request.json();

	// Check if proposal already exists
	const existing = await db
		.select()
		.from(proposals)
		.where(eq(proposals.sectionId, sectionId));

	if (existing.length > 0) {
		// Update existing proposal
		await db
			.update(proposals)
			.set({
				content,
				notes,
				updatedAt: new Date().toISOString(),
			})
			.where(eq(proposals.sectionId, sectionId));
	} else {
		// Create new proposal
		await db.insert(proposals).values({
			sectionId,
			content,
			notes,
			updatedAt: new Date().toISOString(),
		});
	}

	return json({ success: true });
};
