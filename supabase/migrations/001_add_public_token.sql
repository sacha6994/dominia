-- Migration: Add public_token column to domains table
-- Date: 2026-02-23
-- Context: The column was defined in schema.sql but never applied to the live database.
--          This caused "column domains.public_token does not exist" (code 42703)
--          on POST /api/domains/[id]/public-token

ALTER TABLE domains ADD COLUMN IF NOT EXISTS public_token uuid UNIQUE;

CREATE INDEX IF NOT EXISTS idx_domains_public_token
  ON domains(public_token)
  WHERE public_token IS NOT NULL;
