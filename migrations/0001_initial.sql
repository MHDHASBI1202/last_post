CREATE TABLE `survivors` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`specialty` text DEFAULT '' NOT NULL,
	`activity` text DEFAULT 'jelajah' NOT NULL,
	`appearance` text DEFAULT 'amber' NOT NULL,
	`joined_day` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `survivors_user_id_unique` ON `survivors` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `survivors_code_unique` ON `survivors` (`code`);--> statement-breakpoint
CREATE TABLE `votes` (
	`user_id` text PRIMARY KEY NOT NULL,
	`choice` text NOT NULL,
	`updated_at` integer NOT NULL
);
