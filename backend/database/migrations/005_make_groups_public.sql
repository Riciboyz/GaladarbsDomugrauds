-- Migration: 005_make_groups_public
-- Description: Force all groups to public visibility for open join flow

UPDATE groups
SET visibility = 'public',
    updated_at = datetime('now')
WHERE visibility IS NULL OR visibility != 'public';
