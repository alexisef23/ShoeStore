import { supabase } from './supabase';

export interface DBProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  image_url: string;
  in_stock: boolean;
  created_at: string;
}

export async function fetchProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('Error fetching products:', error.message);
    return [];
  }

  return data || [];
}
