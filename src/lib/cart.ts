export interface CartItem {
  productId: string;
  title: string;
  price: number;
  quantity: number;
}

const CART_KEY = 'shoe-store-cart';
const subscribers = new Set<(items: CartItem[]) => void>();

function readStorage(): CartItem[] {
  if (typeof localStorage === 'undefined') {
    return [];
  }

  const raw = localStorage.getItem(CART_KEY);
  if (!raw) {
    return [];
  }

  try {
    return JSON.parse(raw) as CartItem[];
  } catch {
    return [];
  }
}

function writeStorage(items: CartItem[]) {
  if (typeof localStorage === 'undefined') {
    return;
  }

  localStorage.setItem(CART_KEY, JSON.stringify(items));
  subscribers.forEach(cb => cb(items));
  window.dispatchEvent(new CustomEvent('cart-updated', { detail: { items } }));
}

export function getCartItems(): CartItem[] {
  return readStorage();
}

export function getCartCount(): number {
  const items = readStorage();
  return items.reduce((total, item) => total + item.quantity, 0);
}

export function addCartItem(newItem: CartItem) {
  const items = readStorage();
  const existing = items.find(item => item.productId === newItem.productId);

  if (existing) {
    existing.quantity += newItem.quantity;
  } else {
    items.push({ ...newItem });
  }

  writeStorage(items);
}

export function updateCartItemQuantity(productId: string, quantity: number) {
  const items = readStorage();
  const updated = items.map(item =>
    item.productId === productId ? { ...item, quantity: Math.max(1, quantity) } : item,
  );

  writeStorage(updated);
}

export function removeCartItem(productId: string) {
  const items = readStorage().filter(item => item.productId !== productId);
  writeStorage(items);
}

export function clearCart() {
  writeStorage([]);
}

export function subscribeCart(callback: (items: CartItem[]) => void) {
  subscribers.add(callback);
  callback(readStorage());
  return () => subscribers.delete(callback);
}
