# Translation catalog

`translatable-text.csv` is the source inventory for user-facing text found in the React page and component files, plus mock content used to populate those pages. It has one row per unique English string and includes source file/line locations.

Fill `translation_zh` with Simplified Chinese and `translation_ms` with Malaysian Bahasa Melayu. Keep each `key` stable so the completed catalog can be moved into the i18next resources. Some content comes from Supabase rows or external services at runtime and therefore cannot be extracted from this source catalog; that content needs its own translated data or locale-aware API response.
