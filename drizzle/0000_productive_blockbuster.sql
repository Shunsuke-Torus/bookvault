CREATE TABLE `app_setting` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `book` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`series_id` integer,
	`title` text NOT NULL,
	`volume_number` integer,
	`isbn` text,
	`cover_image_url` text,
	`cover_image_path` text,
	`reading_status` text DEFAULT 'unread' NOT NULL,
	`is_favorite` integer DEFAULT false NOT NULL,
	`rating` integer,
	`memo` text,
	`read_at` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`series_id`) REFERENCES `series`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `book_external_id` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`book_id` integer NOT NULL,
	`source` text NOT NULL,
	`external_id` text NOT NULL,
	FOREIGN KEY (`book_id`) REFERENCES `book`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `book_label` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`book_id` integer NOT NULL,
	`label_id` integer NOT NULL,
	FOREIGN KEY (`book_id`) REFERENCES `book`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`label_id`) REFERENCES `label`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `import_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source` text NOT NULL,
	`filename` text,
	`total_records` integer DEFAULT 0 NOT NULL,
	`success_count` integer DEFAULT 0 NOT NULL,
	`error_count` integer DEFAULT 0 NOT NULL,
	`imported_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `import_log_item` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`import_log_id` integer NOT NULL,
	`book_id` integer,
	`raw_data` text,
	`status` text NOT NULL,
	`error_message` text,
	FOREIGN KEY (`import_log_id`) REFERENCES `import_log`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`book_id`) REFERENCES `book`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `label` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`color` text DEFAULT '#6B7280',
	`is_auto` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `label_name_unique` ON `label` (`name`);--> statement-breakpoint
CREATE TABLE `label_link` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`label_id_from` integer NOT NULL,
	`label_id_to` integer NOT NULL,
	FOREIGN KEY (`label_id_from`) REFERENCES `label`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`label_id_to`) REFERENCES `label`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `notification_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`book_id` integer NOT NULL,
	`platform_id` integer NOT NULL,
	`notification_type` text NOT NULL,
	`sale_price` integer,
	`discount_percent` integer,
	`notified_at` text DEFAULT (datetime('now')) NOT NULL,
	`channel` text DEFAULT 'discord' NOT NULL,
	FOREIGN KEY (`book_id`) REFERENCES `book`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`platform_id`) REFERENCES `platform`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `ownership` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`book_id` integer NOT NULL,
	`platform_id` integer NOT NULL,
	`platform_book_id` text,
	`custom_url` text,
	`format` text DEFAULT 'digital' NOT NULL,
	`purchased_at` text,
	`purchase_price` integer,
	`memo` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`book_id`) REFERENCES `book`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`platform_id`) REFERENCES `platform`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `platform` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`display_name` text NOT NULL,
	`library_url` text,
	`book_url_template` text,
	`icon_url` text,
	`icon_path` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `platform_name_unique` ON `platform` (`name`);--> statement-breakpoint
CREATE TABLE `price_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`book_id` integer NOT NULL,
	`platform_id` integer NOT NULL,
	`regular_price` integer,
	`sale_price` integer,
	`discount_percent` integer,
	`checked_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`book_id`) REFERENCES `book`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`platform_id`) REFERENCES `platform`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `series` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`title_kana` text,
	`author` text NOT NULL,
	`author_kana` text,
	`publisher` text,
	`total_volumes` integer,
	`status` text DEFAULT 'ongoing' NOT NULL,
	`cover_image_url` text,
	`cover_image_path` text,
	`description` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `series_external_id` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`series_id` integer NOT NULL,
	`source` text NOT NULL,
	`external_id` text NOT NULL,
	FOREIGN KEY (`series_id`) REFERENCES `series`(`id`) ON UPDATE no action ON DELETE cascade
);
