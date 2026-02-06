import { db, documents } from '$lib/db';
import { eq, asc } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	// Get all reference documents (German docs) sorted by order
	const references = await db
		.select()
		.from(documents)
		.where(eq(documents.type, 'reference'))
		.orderBy(asc(documents.order));

	return {
		references,
	};
};
