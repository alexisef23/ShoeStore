import { supabase } from './supabase';
import { CartItem, getCartItems, clearCart } from './cart';

export interface CartItemDB extends CartItem {
  id?: string;
}

export async function getCartItemsFromDB(profileId: string) {
  const { data, error } = await supabase
    .from('cart_items')
    .select('id, product_id, quantity')
    .eq('profile_id', profileId);

  if (error) {
    console.warn('Error fetching cart from DB:', error.message);
    return [];
  }

  return data as any[];
}

export async function addCartItemToDB(profileId: string, productId: string, quantity: number = 1) {
  const { data, error } = await supabase
    .from('cart_items')
    .upsert(
      {
        profile_id: profileId,
        product_id: productId,
        quantity,
      },
      {
        onConflict: 'profile_id,product_id',
      }
    )
    .select();

  if (error) {
    console.warn('Error adding to cart DB:', error.message);
    return null;
  }

  return data?.[0] ?? null;
}

export async function updateCartItemInDB(profileId: string, productId: string, quantity: number) {
  if (quantity <= 0) {
    return removeCartItemFromDB(profileId, productId);
  }

  const { data, error } = await supabase
    .from('cart_items')
    .update({ quantity })
    .eq('profile_id', profileId)
    .eq('product_id', productId)
    .select();

  if (error) {
    console.warn('Error updating cart item:', error.message);
    return null;
  }

  return data?.[0] ?? null;
}

export async function removeCartItemFromDB(profileId: string, productId: string) {
  const { error } = await supabase
    .from('cart_items')
    .delete()
    .eq('profile_id', profileId)
    .eq('product_id', productId);

  if (error) {
    console.warn('Error removing cart item:', error.message);
    return false;
  }

  return true;
}

export async function clearCartInDB(profileId: string) {
  const { error } = await supabase
    .from('cart_items')
    .delete()
    .eq('profile_id', profileId);

  if (error) {
    console.warn('Error clearing cart:', error.message);
    return false;
  }

  return true;
}

export async function createOrderFromCart(profileId: string, cartItems: CartItem[], totalAmount: number) {
  const { data: orderData, error: orderError } = await supabase
    .from('orders')
    .insert({
      profile_id: profileId,
      status: 'pending',
      total_amount: totalAmount,
      currency: 'MXN',
    })
    .select()
    .single();

  if (orderError) {
    console.warn('Error creating order:', orderError.message);
    return null;
  }

  const orderId = orderData.id;

  const orderItemsPayload = cartItems.map(item => ({
    order_id: orderId,
    product_id: item.productId,
    quantity: item.quantity,
    unit_price: item.price,
  }));

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItemsPayload);

  if (itemsError) {
    console.warn('Error creating order items:', itemsError.message);
    return null;
  }

  await clearCartInDB(profileId);

  return orderData;
}

export async function syncLocalCartToDB(profileId: string) {
  const localItems = getCartItems();
  if (localItems.length === 0) return true;

  try {
    for (const item of localItems) {
      const { data: existing } = await supabase
        .from('cart_items')
        .select('quantity')
        .eq('profile_id', profileId)
        .eq('product_id', item.productId)
        .single();

      const newQuantity = existing ? existing.quantity + item.quantity : item.quantity;

      await supabase
        .from('cart_items')
        .upsert(
          {
            profile_id: profileId,
            product_id: item.productId,
            quantity: newQuantity,
          },
          { onConflict: 'profile_id,product_id' }
        );
    }
    
    clearCart();
    return true;
  } catch (err) {
    console.error('Error syncing local cart to DB:', err);
    return false;
  }
}
