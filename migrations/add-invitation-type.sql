-- Add type column to invitations table
-- Purpose: Distinguish between public (reusable) and private (one-time) invitation codes

-- Add type column with default 'private'
ALTER TABLE invitations
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'private'
CHECK (type IN ('public', 'private'));

-- Update existing 'teleport' code to be public (reusable)
UPDATE invitations
SET type = 'public'
WHERE code = 'teleport';

-- Add comment for documentation
COMMENT ON COLUMN invitations.type IS 'Type of invitation: public (reusable) or private (one-time use)';

-- Create index for faster type-based queries
CREATE INDEX IF NOT EXISTS idx_invitations_type ON invitations(type);

-- Migration completed
SELECT 'Migration completed: invitation type column added' AS status;
