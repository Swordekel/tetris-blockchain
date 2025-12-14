import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

const app = new Hono();

// Midtrans Configuration
const MIDTRANS_SERVER_KEY = Deno.env.get('MIDTRANS_SERVER_KEY');
const MIDTRANS_CLIENT_KEY = Deno.env.get('MIDTRANS_CLIENT_KEY');
const MIDTRANS_IS_PRODUCTION = Deno.env.get('MIDTRANS_IS_PRODUCTION') === 'true';
const MIDTRANS_API_URL = MIDTRANS_IS_PRODUCTION 
  ? 'https://app.midtrans.com/snap/v1/transactions'
  : 'https://app.sandbox.midtrans.com/snap/v1/transactions';

// Validate Midtrans credentials on startup
if (!MIDTRANS_SERVER_KEY || !MIDTRANS_CLIENT_KEY) {
  console.error('⚠️ WARNING: Midtrans credentials not configured!');
  console.error('📚 SETUP GUIDE:');
  console.error('   1. For PRODUCTION: Get keys from https://dashboard.midtrans.com');
  console.error('   2. For SANDBOX (testing): Get keys from https://dashboard.sandbox.midtrans.com');
  console.error('   3. Go to Settings → Access Keys');
  console.error('   4. Add to Supabase Dashboard → Settings → Edge Functions → Secrets:');
  console.error('      PRODUCTION KEYS:');
  console.error('      - MIDTRANS_SERVER_KEY (starts with Mid-server-)');
  console.error('      - MIDTRANS_CLIENT_KEY (starts with Mid-client-)');
  console.error('      - MIDTRANS_IS_PRODUCTION = true');
  console.error('');
  console.error('      SANDBOX KEYS (for testing):');
  console.error('      - MIDTRANS_SERVER_KEY (starts with SB-Mid-server-)');
  console.error('      - MIDTRANS_CLIENT_KEY (starts with SB-Mid-client-)');
  console.error('      - MIDTRANS_IS_PRODUCTION = false');
  console.error('   5. Save and wait 10-15 seconds for Edge Functions to restart');
}

console.log('🔧 Midtrans Configuration:');
console.log('  Environment:', MIDTRANS_IS_PRODUCTION ? '🔴 PRODUCTION' : '🟡 SANDBOX (Testing)');
console.log('  API URL:', MIDTRANS_API_URL);
console.log('  Server Key:', MIDTRANS_SERVER_KEY ? `${MIDTRANS_SERVER_KEY.substring(0, 15)}...` : '❌ NOT SET');
console.log('  Client Key:', MIDTRANS_CLIENT_KEY ? `${MIDTRANS_CLIENT_KEY.substring(0, 15)}...` : '❌ NOT SET');

if (MIDTRANS_SERVER_KEY && MIDTRANS_CLIENT_KEY) {
  const serverKeyValid = MIDTRANS_SERVER_KEY.startsWith('SB-Mid-server-') || MIDTRANS_SERVER_KEY.startsWith('Mid-server-');
  const clientKeyValid = MIDTRANS_CLIENT_KEY.startsWith('SB-Mid-client-') || MIDTRANS_CLIENT_KEY.startsWith('Mid-client-');
  
  if (!MIDTRANS_IS_PRODUCTION && !MIDTRANS_SERVER_KEY.startsWith('SB-')) {
    console.warn('⚠️ WARNING: Using production keys in sandbox mode!');
    console.warn('   Sandbox keys should start with "SB-"');
  }
  
  if (MIDTRANS_IS_PRODUCTION && MIDTRANS_SERVER_KEY.startsWith('SB-')) {
    console.warn('⚠️ WARNING: Using sandbox keys in production mode!');
    console.warn('   Production keys should start with "Mid-" (without SB- prefix)');
  }
  
  if (serverKeyValid && clientKeyValid) {
    console.log('✅ Midtrans credentials configured correctly!');
  } else {
    console.error('❌ Invalid Midtrans credentials format!');
    if (!serverKeyValid) console.error('   Server Key should start with "SB-Mid-server-" (sandbox) or "Mid-server-" (production)');
    if (!clientKeyValid) console.error('   Client Key should start with "SB-Mid-client-" (sandbox) or "Mid-client-" (production)');
  }
}

// Health check for webhook
app.get('/notification', (c) => {
  console.log('✅ Webhook health check - GET request received');
  return c.json({ 
    status: 'ok', 
    message: 'Midtrans webhook endpoint is ready',
    timestamp: new Date().toISOString() 
  });
});

app.post('/notification-test', (c) => {
  console.log('🧪 Test notification endpoint hit');
  return c.json({ status: 'ok', message: 'Test endpoint working' });
});

// Debug endpoint to check configuration
app.get('/config-check', (c) => {
  return c.json({
    status: 'ok',
    environment: MIDTRANS_IS_PRODUCTION ? 'PRODUCTION' : 'SANDBOX',
    api_url: MIDTRANS_API_URL,
    server_key_set: !!MIDTRANS_SERVER_KEY,
    server_key_prefix: MIDTRANS_SERVER_KEY?.substring(0, 15) || 'NOT SET',
    client_key_set: !!MIDTRANS_CLIENT_KEY,
    client_key_prefix: MIDTRANS_CLIENT_KEY?.substring(0, 15) || 'NOT SET',
    client_key: MIDTRANS_CLIENT_KEY || '', // Return full client key for frontend Snap.js
    timestamp: new Date().toISOString()
  });
});

// Helper to get user from access token
async function getUserFromToken(authHeader: string | null) {
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const accessToken = authHeader.split(' ')[1];
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  if (error || !user) {
    console.error('Get user error:', error);
    return null;
  }

  return user;
}

// Get user data and transaction history
app.get('/data', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    console.log('📊 Getting topup data for user:', user.id);

    // Get user data from main user object
    let userData = await kv.get(`user:${user.id}`);
    
    // Initialize user data if doesn't exist
    if (!userData) {
      console.log('⚠️ User data not found, creating new user data...');
      userData = {
        id: user.id,
        email: user.email,
        username: user.user_metadata?.username || 'Player',
        coin: 0,
        ruby: 0,
        selected_skin: 'classic',
        selected_border: 'default',
        owned_skins: ['classic'],
        owned_borders: ['default'],
        created_at: new Date().toISOString(),
      };
      await kv.set(`user:${user.id}`, userData);
      console.log('✅ User data initialized');
    }
    
    const ruby = userData?.ruby || 0;

    console.log('💎 User ruby balance:', ruby);

    // Get transaction history
    let transactions = [];
    try {
      const transactionsData = await kv.getByPrefix(`transaction:${user.id}:`);
      if (transactionsData && transactionsData.length > 0) {
        transactions = transactionsData
          .map(t => {
            try {
              return typeof t === 'string' ? JSON.parse(t) : t;
            } catch (e) {
              console.error('Failed to parse transaction:', e);
              return null;
            }
          })
          .filter(t => t !== null)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 10); // Last 10 transactions
      }
    } catch (txError) {
      console.error('Error loading transactions:', txError);
      // Continue with empty transactions array
    }

    console.log('📜 Found', transactions.length, 'transactions');

    return c.json({ ruby, transactions });
  } catch (error) {
    console.error('❌ Get topup data error:', error);
    return c.json({ error: 'Failed to load data', details: error.message }, 500);
  }
});

// Create Midtrans transaction
app.post('/create-transaction', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { package_id, package_name, ruby_amount, price } = await c.req.json();

    if (!package_id || !package_name || !ruby_amount || !price) {
      return c.json({ error: 'Invalid request data' }, 400);
    }

    // Generate unique order ID
    const order_id = `TETRIS-${user.id.substring(0, 8)}-${Date.now()}`;

    // Create transaction in Midtrans
    const transactionData = {
      transaction_details: {
        order_id: order_id,
        gross_amount: price,
      },
      customer_details: {
        email: user.email,
        first_name: user.user_metadata?.username || 'User',
      },
      item_details: [
        {
          id: package_id,
          price: price,
          quantity: 1,
          name: `${package_name} - ${ruby_amount} Ruby`,
        },
      ],
      callbacks: {
        finish: `${c.req.header('origin') || 'http://localhost:5173'}/`,
      },
    };

    console.log('📦 Creating Midtrans transaction:', order_id);

    // Call Midtrans Snap API
    // Midtrans requires Base64 encoding of "ServerKey:" (note the colon after)
    const encoder = new TextEncoder();
    const data = encoder.encode(`${MIDTRANS_SERVER_KEY}:`);
    const base64 = btoa(String.fromCharCode(...data));
    
    console.log('🔑 Using authorization with Server Key:', MIDTRANS_SERVER_KEY?.substring(0, 20) + '...');
    
    const midtransResponse = await fetch(MIDTRANS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${base64}`,
        'Accept': 'application/json',
      },
      body: JSON.stringify(transactionData),
    });

    if (!midtransResponse.ok) {
      const errorData = await midtransResponse.text();
      console.error('❌ Midtrans API error:', errorData);
      console.error('❌ Request URL:', MIDTRANS_API_URL);
      console.error('❌ Server Key used:', MIDTRANS_SERVER_KEY?.substring(0, 20) + '...');
      return c.json({ 
        error: 'Failed to create payment transaction', 
        details: errorData,
        debug: {
          url: MIDTRANS_API_URL,
          serverKeyPrefix: MIDTRANS_SERVER_KEY?.substring(0, 20)
        }
      }, 500);
    }

    const snapData = await midtransResponse.json();
    console.log('✅ Midtrans snap token created:', snapData.token);

    // Store transaction in KV (pending status)
    const transaction = {
      order_id,
      user_id: user.id,
      package_id,
      package_name,
      ruby_amount,
      price,
      status: 'pending',
      created_at: new Date().toISOString(),
      snap_token: snapData.token,
    };

    await kv.set(`transaction:${user.id}:${order_id}`, JSON.stringify(transaction));

    return c.json({
      order_id,
      snap_token: snapData.token,
      redirect_url: snapData.redirect_url,
    });
  } catch (error) {
    console.error('Create transaction error:', error);
    return c.json({ error: 'Failed to create transaction' }, 500);
  }
});

// Midtrans notification webhook
app.post('/notification', async (c) => {
  try {
    console.log('🔔 ============================================');
    console.log('🔔 MIDTRANS NOTIFICATION WEBHOOK RECEIVED');
    console.log('🔔 ============================================');
    
    const notification = await c.req.json();
    
    console.log('📦 Notification payload:', JSON.stringify(notification, null, 2));

    const {
      order_id,
      transaction_status,
      fraud_status,
      payment_type,
      gross_amount,
      signature_key,
    } = notification;

    // Verify signature (security check)
    const crypto = await import("node:crypto");
    const expectedSignature = crypto
      .createHash('sha512')
      .update(`${order_id}${notification.status_code}${gross_amount}${MIDTRANS_SERVER_KEY}`)
      .digest('hex');

    if (signature_key !== expectedSignature) {
      console.error('❌ Invalid signature!');
      return c.json({ error: 'Invalid signature' }, 403);
    }

    // Get transaction from KV
    const transactionKeys = await kv.getByPrefix(`transaction:`);
    let transaction = null;
    let transactionKey = '';

    for (const key of transactionKeys) {
      const txData = JSON.parse(key as string);
      if (txData.order_id === order_id) {
        transaction = txData;
        transactionKey = `transaction:${txData.user_id}:${order_id}`;
        break;
      }
    }

    if (!transaction) {
      console.error('❌ Transaction not found:', order_id);
      return c.json({ error: 'Transaction not found' }, 404);
    }

    // Update transaction status
    let newStatus = transaction_status;
    
    // Handle different payment statuses
    if (transaction_status === 'capture') {
      newStatus = fraud_status === 'accept' ? 'capture' : 'pending';
    } else if (transaction_status === 'settlement') {
      newStatus = 'settlement';
    } else if (['cancel', 'deny', 'expire'].includes(transaction_status)) {
      newStatus = 'failed';
    }

    transaction.status = newStatus;
    transaction.payment_type = payment_type;
    transaction.updated_at = new Date().toISOString();

    await kv.set(transactionKey, JSON.stringify(transaction));

    console.log(`📝 Transaction ${order_id} updated to status: ${newStatus}`);

    // If payment successful, credit ruby to user
    if (newStatus === 'settlement' || newStatus === 'capture') {
      // Check if already credited (idempotency)
      if (!transaction.credited) {
        // Update ruby in main user object
        const userData = await kv.get(`user:${transaction.user_id}`);
        if (userData) {
          userData.ruby = (userData.ruby || 0) + transaction.ruby_amount;
          await kv.set(`user:${transaction.user_id}`, userData);
          
          console.log(`💎 Credited ${transaction.ruby_amount} Ruby to user ${transaction.user_id}. New balance: ${userData.ruby}`);
        } else {
          console.error(`⚠️ User data not found for ${transaction.user_id}`);
        }
        
        transaction.credited = true;
        transaction.credited_at = new Date().toISOString();
        await kv.set(transactionKey, JSON.stringify(transaction));
      } else {
        console.log(`⚠️ Transaction ${order_id} already credited, skipping...`);
      }
    }

    return c.json({ status: 'ok' });
  } catch (error) {
    console.error('Notification handler error:', error);
    return c.json({ error: 'Failed to process notification' }, 500);
  }
});

// Check transaction status manually (polling)
app.get('/check-status/:order_id', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const order_id = c.req.param('order_id');
    const transactionData = await kv.get(`transaction:${user.id}:${order_id}`);

    if (!transactionData) {
      return c.json({ error: 'Transaction not found' }, 404);
    }

    const transaction = JSON.parse(transactionData as string);
    return c.json({ status: transaction.status, transaction });
  } catch (error) {
    console.error('Check status error:', error);
    return c.json({ error: 'Failed to check status' }, 500);
  }
});

// 🧪 SANDBOX ONLY: Simulate payment completion for testing
app.post('/simulate-payment/:order_id', async (c) => {
  // Only allow in sandbox mode
  if (MIDTRANS_IS_PRODUCTION) {
    return c.json({ error: 'This endpoint is only available in sandbox mode' }, 403);
  }

  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const order_id = c.req.param('order_id');
    const transactionKey = `transaction:${user.id}:${order_id}`;
    const transactionData = await kv.get(transactionKey);

    if (!transactionData) {
      return c.json({ error: 'Transaction not found' }, 404);
    }

    const transaction = JSON.parse(transactionData as string);

    // Check if already completed
    if (transaction.status === 'settlement' || transaction.status === 'capture') {
      return c.json({ 
        success: true, 
        message: 'Transaction already completed',
        transaction 
      });
    }

    console.log(`🧪 [SANDBOX] Simulating payment completion for: ${order_id}`);

    // Update transaction to settlement
    transaction.status = 'settlement';
    transaction.payment_type = 'credit_card';
    transaction.updated_at = new Date().toISOString();
    transaction.simulated = true;

    await kv.set(transactionKey, JSON.stringify(transaction));

    // Credit ruby to user (if not already credited)
    if (!transaction.credited) {
      const userData = await kv.get(`user:${user.id}`);
      if (userData) {
        userData.ruby = (userData.ruby || 0) + transaction.ruby_amount;
        await kv.set(`user:${user.id}`, userData);
        
        console.log(`💎 [SANDBOX] Credited ${transaction.ruby_amount} Ruby to user ${user.id}. New balance: ${userData.ruby}`);
        
        transaction.credited = true;
        transaction.credited_at = new Date().toISOString();
        await kv.set(transactionKey, JSON.stringify(transaction));
      }
    }

    return c.json({ 
      success: true, 
      message: 'Payment simulated successfully',
      transaction,
      ruby_credited: transaction.ruby_amount
    });
  } catch (error) {
    console.error('Simulate payment error:', error);
    return c.json({ error: 'Failed to simulate payment' }, 500);
  }
});

export default app;