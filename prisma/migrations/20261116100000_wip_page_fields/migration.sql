-- Fields shown on the current WIP page (workinprocess/order_processing_edit.php, order_entry.php).
ALTER TABLE "companies"
  ADD COLUMN "address" TEXT,
  ADD COLUMN "city"    TEXT,
  ADD COLUMN "pincode" TEXT,
  ADD COLUMN "state"   TEXT,
  ADD COLUMN "country" TEXT,
  ADD COLUMN "gst_no"  TEXT,
  ADD COLUMN "ie_code" TEXT;

ALTER TABLE "users"
  ADD COLUMN "code"   TEXT,
  ADD COLUMN "mobile" TEXT,
  ADD COLUMN "email"  TEXT;

ALTER TABLE "enquiries"
  ADD COLUMN "season"     TEXT,
  ADD COLUMN "class_name" TEXT,
  ADD COLUMN "divi_dept"  TEXT,
  ADD COLUMN "sub_class"  TEXT,
  ADD COLUMN "oe_remarks" TEXT;
