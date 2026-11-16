-- Enquiry fields of the current "New Enquiry Details" form (merchant/addeditenquiry.php).
-- Existing demo rows get the defaults.
ALTER TABLE "enquiries"
  ADD COLUMN "mode_of_enquiry"  INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "no_of_components" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "no_of_combo"      INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "price_quoted_for" INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN "buyer_price"      DECIMAL(14,4),
  ADD COLUMN "confirm_price"    DECIMAL(14,4),
  ADD COLUMN "isr_ref_any"      TEXT;

-- Merchant and authorizing user of an enquiry (shown as Merchant Name / Authorized By).
ALTER TABLE "enquiries"
  ADD CONSTRAINT "enquiries_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "enquiries"
  ADD CONSTRAINT "enquiries_authorized_by_id_fkey" FOREIGN KEY ("authorized_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
