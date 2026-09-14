import { createClient } from '@supabase/supabase-js';
import { readSupabaseBrowserConfig } from './supabase-config';

const config = readSupabaseBrowserConfig(import.meta.env);

export const supabase = createClient(config.url, config.publishableKey);
