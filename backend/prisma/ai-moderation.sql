ALTER TABLE comments ADD COLUMN IF NOT EXISTS ai_review TEXT;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS ai_review_result VARCHAR(20);
ALTER TABLE comments ALTER COLUMN status SET DEFAULT 'pending';
UPDATE comments SET status = 'approved' WHERE status = 'pending' AND ai_review IS NULL;
