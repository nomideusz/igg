CREATE TABLE `documents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`original_path` text,
	`type` text DEFAULT 'reference' NOT NULL,
	`language` text DEFAULT 'en' NOT NULL,
	`raw_content` text,
	`uploaded_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`order` integer DEFAULT 0 NOT NULL,
	`translated_content` text,
	`translation_status` text DEFAULT 'none' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `proposals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`section_id` integer NOT NULL,
	`content` text NOT NULL,
	`notes` text,
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	FOREIGN KEY (`section_id`) REFERENCES `sections`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sections` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`document_id` integer NOT NULL,
	`title` text NOT NULL,
	`original_content` text NOT NULL,
	`order` integer DEFAULT 0 NOT NULL,
	`level` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE cascade
);
