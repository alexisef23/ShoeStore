import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { token, userId, email, card_last4, card_brand, exp_month, exp_year } = req.body;

  try {
    // 1. Here we would normally call Mercado Pago to vault the card to a Customer 
    // and retrieve a permanent card token.
    // For this implementation, we save the token directly to comply with the schema.
    
    const { data, error } = await supabase.from('payment_methods').insert({
      profile_id: userId,
      provider: 'mercadopago',
      provider_payment_method_id: token,
      card_brand,
      card_last4,
      card_exp_month: exp_month,
      card_exp_year: exp_year,
      is_default: true
    }).select().single();

    if (error) {
      console.error('Error adding card to Supabase:', error);
      throw error;
    }

    return res.status(200).json({ success: true, payment_method: data });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
