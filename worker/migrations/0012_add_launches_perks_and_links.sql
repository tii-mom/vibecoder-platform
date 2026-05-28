-- Migration 0012: Add Perks and Social/Team details to launches table
-- ====================================================================

ALTER TABLE launches ADD COLUMN extra_perks TEXT;
ALTER TABLE launches ADD COLUMN website_url TEXT;
ALTER TABLE launches ADD COLUMN github_url TEXT;
ALTER TABLE launches ADD COLUMN team_desc TEXT;
