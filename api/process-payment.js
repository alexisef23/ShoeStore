import { MercadoPagoConfig, Payment } from 'mercadopago';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MERCADOPAGO_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN;

// Initialize clients
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const mpClient = new MercadoPagoConfig({ accessToken: MERCADOPAGO_ACCESS_TOKEN });

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { orderId, paymentTokenId, customerEmail } = req.body;

  if (!orderId || !paymentTokenId) {
    return res.status(400).json({ error: 'orderId and paymentTokenId are required' });
  }

  try {
    // 1. Fetch order and items from Supabase
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, order_items(product_id, quantity)')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      throw new Error('Order not found in DB');
    }

    if (order.status === 'paid') {
      return res.status(400).json({ error: 'Order is already paid' });
    }

    // 2. Process Payment via Mercado Pago SDK
    const payment = new Payment(mpClient);
    
    const paymentResult = await payment.create({
      body: {
        transaction_amount: Number(order.total_amount),
        description: \`Compra Tienda PWA - Orden \${order.id.split('-')[0]}\`,
        token: paymentTokenId,
        installments: 1,
        payer: {
          email: customerEmail || 'test_user_buyer@test.com'
        }
      }
    });

    if (paymentResult.status === 'approved' || paymentResult.status === 'in_process') {
      // 3. Update Order Status to 'paid'
      await supabase
        .from('orders')
        .update({ status: 'paid' })
        .eq('id', orderId);

      // 4. Create Payment Intent record
      await supabase
        .from('payment_intents')
        .insert({
          order_id: orderId,
          profile_id: order.profile_id,
          amount: order.total_amount,
          currency: 'MXN',
          provider: 'mercadopago',
          provider_client_secret: String(paymentResult.id),
          status: 'succeeded'
        });

      return res.status(200).json({ success: true, paymentId: paymentResult.id });
    } else {
      // Payment rejected or failed
      await supabase
        .from('orders')
        .update({ status: 'failed' })
        .eq('id', orderId);

      return res.status(400).json({ success: false, message: \`Payment failed with status: \${paymentResult.status}\` });
    }

  } catch (error) {
    console.error('Process Payment Error:', error);
    
    // Fallback: update status to failed if something crashed critically during payment
    await supabase.from('orders').update({ status: 'failed' }).eq('id', orderId);
    
    return res.status(500).json({ error: error.message });
  }
}

