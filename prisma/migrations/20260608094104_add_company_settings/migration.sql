-- CreateTable
CREATE TABLE "company_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "company_name" VARCHAR(100),
    "fy_start_month" INTEGER NOT NULL DEFAULT 4,
    "currency_format" VARCHAR(20) NOT NULL DEFAULT 'INR',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_settings_pkey" PRIMARY KEY ("id")
);
