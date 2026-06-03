import { supabase } from './supabase';
import { getCurrentUser } from './auth';

export interface OrderItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  product_name?: string;
}

export interface Order {
  id: string;
  profile_id: string;
  status: string;
  total_amount: number;
  currency: string;
  created_at: string;
  items?: OrderItem[];
}

export async function fetchUserOrders(): Promise<Order[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_items (
        *,
        products (
          name
        )
      )
    `)
    .eq('profile_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching orders:', error);
    return [];
  }

  return (data || []).map(order => ({
    ...order,
    items: order.order_items.map((item: any) => ({
      id: item.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
      product_name: item.products?.name || 'Producto Desconocido'
    }))
  }));
}
