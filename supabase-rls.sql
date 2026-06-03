-- ====================================================================================
-- SUPABASE RLS (ROW LEVEL SECURITY) SCRIPT
-- ====================================================================================
-- Ejecuta este código en el editor SQL de tu panel de control de Supabase para reparar:
-- 1. Los productos no cargaban (nadie podía leer la tabla por defecto).
-- 2. La seguridad de que un usuario no pueda ver el carrito, perfil, ni las compras de otro.
-- ====================================================================================

-- 1. Habilitar RLS en todas las tablas sensibles
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;

-- 2. PRODUCTS: Cualquier persona puede ver el catálogo, pero solo el Admin puede modificarlo
DROP POLICY IF EXISTS "Catálogo de productos es público" ON public.products;
CREATE POLICY "Catálogo de productos es público" 
  ON public.products FOR SELECT 
  USING (true);

-- 3. PROFILES: Los usuarios solo pueden ver y editar su propio perfil
DROP POLICY IF EXISTS "Ver perfil propio" ON public.profiles;
CREATE POLICY "Ver perfil propio" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Actualizar perfil propio" ON public.profiles;
CREATE POLICY "Actualizar perfil propio" 
  ON public.profiles FOR ALL 
  USING (auth.uid() = id);

-- 4. CART_ITEMS: Los usuarios solo leen y escriben en su propio carrito
DROP POLICY IF EXISTS "Acceso a carrito propio" ON public.cart_items;
CREATE POLICY "Acceso a carrito propio" 
  ON public.cart_items FOR ALL 
  USING (auth.uid() = profile_id);

-- 5. ORDERS & ORDER_ITEMS: Los usuarios solo ven sus propios pedidos
DROP POLICY IF EXISTS "Acceso a pedidos propios" ON public.orders;
CREATE POLICY "Acceso a pedidos propios" 
  ON public.orders FOR ALL 
  USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Acceso a items de pedidos propios" ON public.order_items;
CREATE POLICY "Acceso a items de pedidos propios" 
  ON public.order_items FOR ALL 
  USING ( order_id IN (SELECT id FROM public.orders WHERE profile_id = auth.uid()) );

-- 6. PAYMENT METHODS & INTENTS: Acceso privado por usuario
DROP POLICY IF EXISTS "Acceso a métodos de pago propios" ON public.payment_methods;
CREATE POLICY "Acceso a métodos de pago propios" 
  ON public.payment_methods FOR ALL 
  USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Acceso a pagos propios" ON public.payment_intents;
CREATE POLICY "Acceso a pagos propios" 
  ON public.payment_intents FOR ALL 
  USING (auth.uid() = profile_id);

-- ====================================================================================
-- IMPORTANTE: Una vez ejecutado este código, tus productos comenzarán a cargarse 
-- inmediatamente en la aplicación.
-- ====================================================================================
