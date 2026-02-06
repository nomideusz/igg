import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// Main IGG document and German references
export const documents = sqliteTable('documents', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull(),
	originalPath: text('original_path'),
	type: text('type', { enum: ['main', 'reference'] }).notNull().default('reference'),
	language: text('language', { enum: ['en', 'de', 'pl'] }).notNull().default('en'),
	rawContent: text('raw_content'), // Original parsed content
	uploadedAt: text('uploaded_at').notNull().default('CURRENT_TIMESTAMP'),
	order: integer('order').notNull().default(0), // Position for manual sorting
	translatedContent: text('translated_content'), // English translation
	translationStatus: text('translation_status', { enum: ['none', 'pending', 'in-progress', 'completed', 'error'] }).notNull().default('none'),
});

// Sections extracted from the main document
export const sections = sqliteTable('sections', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	documentId: integer('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
	title: text('title').notNull(),
	originalContent: text('original_content').notNull(),
	order: integer('order').notNull().default(0),
	level: integer('level').notNull().default(1), // Heading level (h1=1, h2=2, etc.)
	status: text('status', { enum: ['pending', 'in-progress', 'complete'] }).notNull().default('pending'),
	createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
});

// Picarro proposals for each section
export const proposals = sqliteTable('proposals', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	sectionId: integer('section_id').notNull().references(() => sections.id, { onDelete: 'cascade' }),
	content: text('content').notNull(),
	notes: text('notes'), // Personal notes/context
	updatedAt: text('updated_at').notNull().default('CURRENT_TIMESTAMP'),
});

// Type exports for TypeScript
export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type Section = typeof sections.$inferSelect;
export type NewSection = typeof sections.$inferInsert;
export type Proposal = typeof proposals.$inferSelect;
export type NewProposal = typeof proposals.$inferInsert;
