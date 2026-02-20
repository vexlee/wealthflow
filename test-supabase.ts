import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

async function main() {
    const { data, error } = await supabase.from("transactions").select("*, categories(*), wallets!inner(type)").neq("wallets.type", "crypto").limit(5);
    console.log(error, data);
}

main();
