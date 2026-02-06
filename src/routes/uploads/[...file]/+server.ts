import type { RequestHandler } from './$types';
import { readFile, access } from 'node:fs/promises';
import { join } from 'node:path';

// Serve uploaded files from persistent storage (DATA_DIR) or fallback
export const GET: RequestHandler = async ({ params, setHeaders }) => {
    const filePath = params.file;
    if (!filePath) {
        return new Response('Not found', { status: 404 });
    }

    // Determine root dir (same logic as upload)
    const projectRoot = process.cwd();
    const dataDir = process.env.DATA_DIR 
        ? join(process.env.DATA_DIR, 'uploads')
        : join(projectRoot, 'static', 'uploads');

    const fullPath = join(dataDir, filePath);

    try {
        // basic security check to prevent directory traversal
        if (!fullPath.startsWith(dataDir)) {
             return new Response('Forbidden', { status: 403 });
        }

        await access(fullPath);
        const file = await readFile(fullPath);
        
        // Simple mime type detection (can be improved)
        const ext = filePath.split('.').pop()?.toLowerCase();
        let contentType = 'application/octet-stream';
        if (ext === 'pdf') contentType = 'application/pdf';
        if (ext === 'docx') contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        if (ext === 'png') contentType = 'image/png';
        if (ext === 'jpg' || ext === 'jpeg') contentType = 'image/jpeg';

        setHeaders({
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=31536000'
        });

        return new Response(file);
    } catch (e) {
        // If file not found in persistent store, 
        // fallback to letting SvelteKit try serving from static (404 here falls through?)
        // Actually for a server route, we must return response.
        return new Response('File not found', { status: 404 });
    }
};
