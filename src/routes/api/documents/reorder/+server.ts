import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db, documents } from '$lib/db';
import { eq } from 'drizzle-orm';

export const PATCH: RequestHandler = async ({ request }) => {
	try {
        const { items } = await request.json();
        
        if (!Array.isArray(items)) {
            return json({ error: 'Invalid items format' }, { status: 400 });
        }

        // Run updates in parallel (or transaction if supported/needed, parallel is fine for small lists)
        await Promise.all(
            items.map(async (item: { id: number; order: number }) => {
                await db.update(documents)
                    .set({ order: item.order })
                    .where(eq(documents.id, item.id));
            })
        );

		return json({ success: true });
	} catch (error: any) {
		console.error('Reorder error:', error);
		return json({ error: error.message || 'Failed to reorder' }, { status: 500 });
	}
};
