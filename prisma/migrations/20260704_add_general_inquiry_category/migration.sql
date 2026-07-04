-- Public Contact page submissions don't fit any existing SupportCategory.
ALTER TYPE "SupportCategory" ADD VALUE IF NOT EXISTS 'GENERAL_INQUIRY';
