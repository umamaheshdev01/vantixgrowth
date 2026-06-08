-- CreateEnum
CREATE TYPE "Role" AS ENUM ('admin', 'employee');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "PackageTier" AS ENUM ('starter', 'growth', 'premium');

-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('active', 'on_hold', 'upcoming', 'ended', 'archived');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('full_time', 'part_time', 'freelance');

-- CreateEnum
CREATE TYPE "PayType" AS ENUM ('monthly', 'per_video');

-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "VideoType" AS ENUM ('long_form', 'short_form', 'reel', 'thumbnail', 'other');

-- CreateEnum
CREATE TYPE "VideoStatus" AS ENUM ('brief_received', 'footage_received', 'assigned', 'in_editing', 'internal_review', 'sent_to_client', 'revisions_requested', 'in_revision', 'approved', 'delivered', 'cancelled');

-- CreateEnum
CREATE TYPE "FinanceType" AS ENUM ('income', 'expense');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('bank_transfer', 'upi', 'cash', 'other');

-- CreateEnum
CREATE TYPE "ActivityEntityType" AS ENUM ('client', 'video', 'employee');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "niche" VARCHAR(50) NOT NULL,
    "contact_name" VARCHAR(100) NOT NULL,
    "contact_email" VARCHAR(255) NOT NULL,
    "contact_phone" VARCHAR(20),
    "retainer_amount" INTEGER NOT NULL,
    "package_tier" "PackageTier" NOT NULL,
    "status" "ClientStatus" NOT NULL,
    "contract_start_date" DATE NOT NULL,
    "contract_end_date" DATE,
    "min_contract_months" INTEGER,
    "youtube_url" TEXT,
    "notes" TEXT,
    "logo_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" VARCHAR(100) NOT NULL,
    "employment_type" "EmploymentType" NOT NULL,
    "pay_type" "PayType" NOT NULL,
    "pay_rate" INTEGER NOT NULL,
    "status" "EmployeeStatus" NOT NULL,
    "start_date" DATE,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "videos" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "client_id" TEXT NOT NULL,
    "video_type" "VideoType" NOT NULL,
    "assigned_editor_id" TEXT,
    "status" "VideoStatus" NOT NULL,
    "due_date" DATE NOT NULL,
    "assigned_at" TIMESTAMP(3),
    "revision_count" INTEGER NOT NULL DEFAULT 0,
    "brief_url" TEXT,
    "footage_url" TEXT,
    "final_file_url" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "videos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_status_history" (
    "id" TEXT NOT NULL,
    "video_id" TEXT NOT NULL,
    "from_status" "VideoStatus",
    "to_status" "VideoStatus" NOT NULL,
    "changed_by" TEXT NOT NULL,
    "revision_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "video_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_entries" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "type" "FinanceType" NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "description" VARCHAR(200) NOT NULL,
    "amount" INTEGER NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "client_id" TEXT,
    "employee_id" TEXT,
    "receipt_url" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finance_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_log" (
    "id" TEXT NOT NULL,
    "entity_type" "ActivityEntityType" NOT NULL,
    "entity_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "clients_status_idx" ON "clients"("status");

-- CreateIndex
CREATE UNIQUE INDEX "employees_user_id_key" ON "employees"("user_id");

-- CreateIndex
CREATE INDEX "videos_client_id_idx" ON "videos"("client_id");

-- CreateIndex
CREATE INDEX "videos_assigned_editor_id_idx" ON "videos"("assigned_editor_id");

-- CreateIndex
CREATE INDEX "videos_status_idx" ON "videos"("status");

-- CreateIndex
CREATE INDEX "videos_due_date_idx" ON "videos"("due_date");

-- CreateIndex
CREATE INDEX "video_status_history_video_id_idx" ON "video_status_history"("video_id");

-- CreateIndex
CREATE INDEX "video_status_history_to_status_idx" ON "video_status_history"("to_status");

-- CreateIndex
CREATE INDEX "finance_entries_client_id_idx" ON "finance_entries"("client_id");

-- CreateIndex
CREATE INDEX "finance_entries_employee_id_idx" ON "finance_entries"("employee_id");

-- CreateIndex
CREATE INDEX "finance_entries_date_type_idx" ON "finance_entries"("date", "type");

-- CreateIndex
CREATE INDEX "activity_log_entity_type_entity_id_idx" ON "activity_log"("entity_type", "entity_id");

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "videos" ADD CONSTRAINT "videos_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "videos" ADD CONSTRAINT "videos_assigned_editor_id_fkey" FOREIGN KEY ("assigned_editor_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_status_history" ADD CONSTRAINT "video_status_history_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "videos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_status_history" ADD CONSTRAINT "video_status_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_entries" ADD CONSTRAINT "finance_entries_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_entries" ADD CONSTRAINT "finance_entries_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
