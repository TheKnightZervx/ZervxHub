ALTER TABLE keys ADD COLUMN bound_roblox_user_id TEXT;
UPDATE keys
SET bound_roblox_user_id = last_roblox_user_id
WHERE bound_roblox_user_id IS NULL
  AND last_roblox_user_id IS NOT NULL;
