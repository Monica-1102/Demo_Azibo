-- CreateTable
CREATE TABLE "companies" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "prefix" VARCHAR(10) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "user_type" INTEGER NOT NULL,
    "can_login" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buyers" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "buyers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brands" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "buyer_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enquiries" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "merchant_id" INTEGER NOT NULL,
    "enquiry_ref_no" TEXT NOT NULL,
    "enquiry_type" INTEGER NOT NULL,
    "req_for_isr_ior" INTEGER NOT NULL,
    "buyer_id" INTEGER NOT NULL,
    "brand_id" INTEGER NOT NULL,
    "style_ref_no" TEXT NOT NULL,
    "style_desc" TEXT,
    "order_qty" INTEGER NOT NULL,
    "pcs_or_set" INTEGER NOT NULL,
    "sizes" TEXT[],
    "currency" VARCHAR(3) NOT NULL,
    "quoted_price" DECIMAL(14,4),
    "enquiry_date" DATE NOT NULL,
    "shipment_date" DATE NOT NULL,
    "merchant_note" TEXT,
    "order_status" INTEGER NOT NULL DEFAULT 0,
    "isr_ior_no" INTEGER,
    "isr_ior_code" TEXT,
    "date_authorized" TIMESTAMP(3),
    "authorized_by_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" INTEGER NOT NULL,

    CONSTRAINT "enquiries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enquiry_status_logs" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "enquiry_id" INTEGER NOT NULL,
    "order_status" INTEGER NOT NULL,
    "status_value" TEXT NOT NULL,
    "isr_ior_code" TEXT,
    "comments" TEXT,
    "acted_by_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enquiry_status_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_code_counters" (
    "company_id" INTEGER NOT NULL,
    "fiscal_year" INTEGER NOT NULL,
    "last_no" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "order_code_counters_pkey" PRIMARY KEY ("company_id","fiscal_year")
);

-- CreateTable
CREATE TABLE "pre_costings" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "enquiry_id" INTEGER NOT NULL,
    "component" TEXT NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "total_cost" DECIMAL(14,4) NOT NULL,
    "remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" INTEGER NOT NULL,
    "updated_by" INTEGER NOT NULL,

    CONSTRAINT "pre_costings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pre_costing_lines" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "pre_costing_id" INTEGER NOT NULL,
    "line_no" INTEGER NOT NULL,
    "cost_head" TEXT NOT NULL,
    "description" TEXT,
    "uom" TEXT NOT NULL,
    "consumption" DECIMAL(14,4) NOT NULL,
    "rate" DECIMAL(14,4) NOT NULL,
    "amount" DECIMAL(14,4) NOT NULL,

    CONSTRAINT "pre_costing_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_entry_sheets" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "enquiry_id" INTEGER NOT NULL,
    "sub_tab" TEXT NOT NULL,
    "rows" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" INTEGER NOT NULL,

    CONSTRAINT "order_entry_sheets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cad_requirements" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "enquiry_id" INTEGER NOT NULL,
    "rows" JSONB NOT NULL,
    "remarks" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" INTEGER NOT NULL,

    CONSTRAINT "cad_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_company_id_idx" ON "users"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "buyers_company_id_name_key" ON "buyers"("company_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "brands_company_id_name_key" ON "brands"("company_id", "name");

-- CreateIndex
CREATE INDEX "enquiries_company_id_merchant_id_order_status_idx" ON "enquiries"("company_id", "merchant_id", "order_status");

-- CreateIndex
CREATE UNIQUE INDEX "enquiries_company_id_enquiry_ref_no_key" ON "enquiries"("company_id", "enquiry_ref_no");

-- CreateIndex
CREATE UNIQUE INDEX "enquiries_company_id_isr_ior_code_key" ON "enquiries"("company_id", "isr_ior_code");

-- CreateIndex
CREATE INDEX "enquiry_status_logs_company_id_enquiry_id_idx" ON "enquiry_status_logs"("company_id", "enquiry_id");

-- CreateIndex
CREATE UNIQUE INDEX "pre_costings_enquiry_id_key" ON "pre_costings"("enquiry_id");

-- CreateIndex
CREATE INDEX "pre_costings_company_id_idx" ON "pre_costings"("company_id");

-- CreateIndex
CREATE INDEX "pre_costing_lines_company_id_pre_costing_id_idx" ON "pre_costing_lines"("company_id", "pre_costing_id");

-- CreateIndex
CREATE INDEX "order_entry_sheets_company_id_idx" ON "order_entry_sheets"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "order_entry_sheets_enquiry_id_sub_tab_key" ON "order_entry_sheets"("enquiry_id", "sub_tab");

-- CreateIndex
CREATE UNIQUE INDEX "cad_requirements_enquiry_id_key" ON "cad_requirements"("enquiry_id");

-- CreateIndex
CREATE INDEX "cad_requirements_company_id_idx" ON "cad_requirements"("company_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buyers" ADD CONSTRAINT "buyers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brands" ADD CONSTRAINT "brands_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brands" ADD CONSTRAINT "brands_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "buyers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "buyers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enquiry_status_logs" ADD CONSTRAINT "enquiry_status_logs_enquiry_id_fkey" FOREIGN KEY ("enquiry_id") REFERENCES "enquiries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pre_costings" ADD CONSTRAINT "pre_costings_enquiry_id_fkey" FOREIGN KEY ("enquiry_id") REFERENCES "enquiries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pre_costing_lines" ADD CONSTRAINT "pre_costing_lines_pre_costing_id_fkey" FOREIGN KEY ("pre_costing_id") REFERENCES "pre_costings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_entry_sheets" ADD CONSTRAINT "order_entry_sheets_enquiry_id_fkey" FOREIGN KEY ("enquiry_id") REFERENCES "enquiries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cad_requirements" ADD CONSTRAINT "cad_requirements_enquiry_id_fkey" FOREIGN KEY ("enquiry_id") REFERENCES "enquiries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
