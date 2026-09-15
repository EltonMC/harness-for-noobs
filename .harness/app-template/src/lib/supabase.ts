import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import { readSupabaseBrowserConfig } from './supabase-config';

const config = readSupabaseBrowserConfig(import.meta.env);

// Typed with the generated schema. Import it only from src/features/<feature>/api modules.
export const supabase = createClient<Database>(config.url, config.publishableKey);
