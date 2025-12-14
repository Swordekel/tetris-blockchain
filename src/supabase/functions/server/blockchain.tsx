import { Hono } from 'npm:hono';
import * as kv from './kv_store.tsx';

const app = new Hono();

// Helper to get user from token
async function getUserFromToken(authHeader: string | undefined) {
  if (!authHeader) return null;
  
  const token = authHeader.replace('Bearer ', '');
  const { createClient } = await import('npm:@supabase/supabase-js@2');
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  
  return user;
}

/**
 * Notify backend about blockchain payment
 * Frontend calls this after successful transaction
 */
app.post('/notify-payment', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { txHash, packageId, rubyAmount, network } = await c.req.json();

    if (!txHash || packageId === undefined || !rubyAmount) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    console.log(`🔗 Blockchain payment notification:`, {
      userId: user.id,
      txHash,
      packageId,
      rubyAmount,
      network,
    });

    // Check if transaction already processed
    const existingTx = await kv.get(`blockchain_tx:${txHash}`);
    if (existingTx) {
      console.log(`⚠️ Transaction ${txHash} already processed`);
      return c.json({ 
        success: true, 
        message: 'Transaction already processed',
        alreadyProcessed: true 
      });
    }

    // Store transaction record
    const txRecord = {
      txHash,
      userId: user.id,
      packageId,
      rubyAmount,
      network,
      timestamp: new Date().toISOString(),
      credited: false,
    };

    await kv.set(`blockchain_tx:${txHash}`, JSON.stringify(txRecord));

    // Credit Ruby to user
    const userData = await kv.get(`user:${user.id}`);
    if (userData) {
      userData.ruby = (userData.ruby || 0) + rubyAmount;
      await kv.set(`user:${user.id}`, userData);

      console.log(`💎 Credited ${rubyAmount} Ruby to user ${user.id} from blockchain tx ${txHash}. New balance: ${userData.ruby}`);

      // Mark as credited
      txRecord.credited = true;
      txRecord.creditedAt = new Date().toISOString();
      await kv.set(`blockchain_tx:${txHash}`, JSON.stringify(txRecord));

      return c.json({
        success: true,
        message: 'Ruby credited successfully',
        rubyAmount,
        newBalance: userData.ruby,
      });
    } else {
      console.error(`⚠️ User data not found for ${user.id}`);
      return c.json({ error: 'User data not found' }, 404);
    }
  } catch (error) {
    console.error('Blockchain notify payment error:', error);
    return c.json({ error: 'Failed to process blockchain payment' }, 500);
  }
});

/**
 * Get blockchain transaction history for user
 */
app.get('/transactions', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Get all blockchain transactions for this user
    const allTxs = await kv.getByPrefix(`blockchain_tx:`);
    const userTxs = allTxs
      .map((tx) => {
        try {
          return JSON.parse(tx as string);
        } catch {
          return null;
        }
      })
      .filter((tx) => tx && tx.userId === user.id)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return c.json({
      success: true,
      transactions: userTxs,
    });
  } catch (error) {
    console.error('Get blockchain transactions error:', error);
    return c.json({ error: 'Failed to get transactions' }, 500);
  }
});

/**
 * Verify blockchain transaction (for manual verification if needed)
 * This can be called by admin or automated process
 */
app.post('/verify-transaction', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { txHash } = await c.req.json();

    if (!txHash) {
      return c.json({ error: 'Transaction hash required' }, 400);
    }

    const txData = await kv.get(`blockchain_tx:${txHash}`);
    if (!txData) {
      return c.json({ error: 'Transaction not found' }, 404);
    }

    const tx = JSON.parse(txData as string);

    // Verify ownership
    if (tx.userId !== user.id) {
      return c.json({ error: 'Transaction does not belong to this user' }, 403);
    }

    return c.json({
      success: true,
      transaction: tx,
    });
  } catch (error) {
    console.error('Verify transaction error:', error);
    return c.json({ error: 'Failed to verify transaction' }, 500);
  }
});

/**
 * Health check endpoint
 */
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'blockchain-payment',
    timestamp: new Date().toISOString(),
  });
});

export default app;
