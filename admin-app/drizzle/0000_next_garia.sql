CREATE TABLE `certificates` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`student_name` text NOT NULL,
	`cpf` text NOT NULL,
	`course` text NOT NULL,
	`workload` text NOT NULL,
	`completion_date` text NOT NULL,
	`instructor` text DEFAULT 'Gambeti Engenharia e Treinamentos' NOT NULL,
	`certificate_code` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `certificates_certificate_code_unique` ON `certificates` (`certificate_code`);--> statement-breakpoint
CREATE INDEX `idx_certificates_owner_created` ON `certificates` (`owner_id`,`created_at`);