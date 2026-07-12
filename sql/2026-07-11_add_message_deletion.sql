-- Run once in Supabase SQL Editor (project nauapuuhyshobozhpumq).
-- Adds "delete for me" / "delete for everyone" support to whatsapp_messages,
-- mirroring WhatsApp's own long-press delete menu.

alter table whatsapp_messages
  add column if not exists deleted_for_me boolean not null default false,
  add column if not exists deleted_for_everyone boolean not null default false;
