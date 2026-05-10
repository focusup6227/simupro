-- Searchable display name for protocol imports (user-entered; PDF filename stays separate).

ALTER TABLE public.user_protocol_imports
  ADD COLUMN display_name text;

UPDATE public.user_protocol_imports
SET display_name = trim(original_filename)
WHERE display_name IS NULL;

ALTER TABLE public.user_protocol_imports
  ALTER COLUMN display_name SET NOT NULL,
  ADD CONSTRAINT user_protocol_imports_display_name_len CHECK (
    char_length(trim(display_name)) >= 1 AND char_length(display_name) <= 200
  );

ALTER TABLE public.workplace_protocol_imports
  ADD COLUMN display_name text;

UPDATE public.workplace_protocol_imports
SET display_name = trim(original_filename)
WHERE display_name IS NULL;

ALTER TABLE public.workplace_protocol_imports
  ALTER COLUMN display_name SET NOT NULL,
  ADD CONSTRAINT workplace_protocol_imports_display_name_len CHECK (
    char_length(trim(display_name)) >= 1 AND char_length(display_name) <= 200
  );
