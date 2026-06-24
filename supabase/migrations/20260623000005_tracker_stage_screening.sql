
-- Expand tracker_items.stage to include 'screening' between 'applied' and
-- 'interview'.  New pipeline order: saved → applied → screening → interview →
-- offer → rejected.
--
-- PostgreSQL doesn't support DROP CONSTRAINT + ADD CONSTRAINT in-place for a
-- named CHECK.  Drop by name, then re-add.

ALTER TABLE public.tracker_items
  DROP CONSTRAINT IF EXISTS tracker_items_stage_check;

ALTER TABLE public.tracker_items
  ADD CONSTRAINT tracker_items_stage_check
    CHECK (stage IN ('saved', 'applied', 'screening', 'interview', 'offer', 'rejected'));
