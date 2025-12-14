import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

const redeem = new Hono();

// Middleware to check authentication
const checkAuth = async (c: any, next: any) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: 'Unauthorized - No token provided' }, 401);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      return c.json({ error: 'Unauthorized - Invalid token' }, 401);
    }

    c.set('userId', user.id);
    await next();
  } catch (error: any) {
    console.error('Auth error:', error);
    return c.json({ error: 'Authentication failed' }, 401);
  }
};

// Apply auth to all redeem routes
redeem.use('*', checkAuth);

// ==================== VALIDATE & USE REDEEM CODE ====================

redeem.post('/use', async (c) => {
  try {
    const userId = c.get('userId');
    const { code } = await c.req.json();

    if (!code || typeof code !== 'string') {
      return c.json({ error: 'Valid code is required' }, 400);
    }

    const codeUpper = code.toUpperCase().trim();

    // Get code data
    const codeData = await kv.get(`redeem:code:${codeUpper}`);

    if (!codeData) {
      return c.json({ error: 'Invalid redeem code' }, 400);
    }

    // Check if code is active
    if (!codeData.active) {
      return c.json({ error: 'This code is no longer active' }, 400);
    }

    // Check if code is expired
    if (codeData.expiresAt && codeData.expiresAt < Date.now()) {
      return c.json({ error: 'This code has expired' }, 400);
    }

    // Check if code has reached max uses
    if (codeData.maxUses && codeData.usedCount >= codeData.maxUses) {
      return c.json({ error: 'This code has reached its maximum uses' }, 400);
    }

    // Check if user already used this code
    const userUsageKey = `redeem:usage:${userId}:${codeUpper}`;
    const alreadyUsed = await kv.get(userUsageKey);

    if (alreadyUsed) {
      return c.json({ error: 'You have already used this code' }, 400);
    }

    // Get user data
    const userData = await kv.get(`user:${userId}`);

    if (!userData) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Apply rewards
    const rewards = codeData.rewards || {};
    
    if (rewards.currency) {
      userData.currency = (userData.currency || 0) + rewards.currency;
    }
    
    if (rewards.ruby) {
      userData.ruby = (userData.ruby || 0) + rewards.ruby;
    }

    // Handle item rewards (skins, borders, etc.)
    if (rewards.items && rewards.items.length > 0) {
      for (const item of rewards.items) {
        const [itemType, itemId] = item.split(':'); // Format: "skin:id" or "border:id"
        
        if (itemType === 'skin') {
          if (!userData.ownedSkins) userData.ownedSkins = [];
          if (!userData.ownedSkins.includes(itemId)) {
            userData.ownedSkins.push(itemId);
          }
        } else if (itemType === 'border') {
          if (!userData.ownedBorders) userData.ownedBorders = [];
          if (!userData.ownedBorders.includes(itemId)) {
            userData.ownedBorders.push(itemId);
          }
        }
      }
    }

    // Save updated user data
    await kv.set(`user:${userId}`, userData);

    // Record usage
    await kv.set(userUsageKey, {
      code: codeUpper,
      userId,
      username: userData.username,
      rewards,
      timestamp: Date.now(),
    });

    // Update code usage count
    codeData.usedCount = (codeData.usedCount || 0) + 1;
    codeData.lastUsedAt = Date.now();
    await kv.set(`redeem:code:${codeUpper}`, codeData);

    // Prepare reward summary
    const rewardSummary = [];
    if (rewards.currency) rewardSummary.push(`${rewards.currency} Coins`);
    if (rewards.ruby) rewardSummary.push(`${rewards.ruby} Ruby`);
    if (rewards.items && rewards.items.length > 0) {
      rewardSummary.push(`${rewards.items.length} Item(s)`);
    }

    return c.json({
      success: true,
      message: 'Redeem code applied successfully!',
      rewards: {
        currency: rewards.currency || 0,
        ruby: rewards.ruby || 0,
        items: rewards.items || [],
      },
      rewardSummary: rewardSummary.join(', '),
      newBalances: {
        currency: userData.currency,
        ruby: userData.ruby,
      },
    });
  } catch (error: any) {
    console.error('Use redeem code error:', error);
    return c.json({ error: 'Failed to process redeem code' }, 500);
  }
});

// ==================== GET USER'S REDEEM HISTORY ====================

redeem.get('/history', async (c) => {
  try {
    const userId = c.get('userId');

    const history = await kv.getByPrefix(`redeem:usage:${userId}:`);

    // Sort by timestamp (newest first)
    history.sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0));

    return c.json({
      history: history.map((item: any) => ({
        code: item.code,
        rewards: item.rewards,
        timestamp: item.timestamp,
      })),
    });
  } catch (error: any) {
    console.error('Get redeem history error:', error);
    return c.json({ error: 'Failed to fetch redeem history' }, 500);
  }
});

// ==================== CHECK CODE VALIDITY (without using it) ====================

redeem.post('/check', async (c) => {
  try {
    const userId = c.get('userId');
    const { code } = await c.req.json();

    if (!code || typeof code !== 'string') {
      return c.json({ error: 'Valid code is required' }, 400);
    }

    const codeUpper = code.toUpperCase().trim();

    // Get code data
    const codeData = await kv.get(`redeem:code:${codeUpper}`);

    if (!codeData) {
      return c.json({ 
        valid: false, 
        reason: 'Invalid code' 
      });
    }

    // Check if code is active
    if (!codeData.active) {
      return c.json({ 
        valid: false, 
        reason: 'Code is no longer active' 
      });
    }

    // Check if code is expired
    if (codeData.expiresAt && codeData.expiresAt < Date.now()) {
      return c.json({ 
        valid: false, 
        reason: 'Code has expired' 
      });
    }

    // Check if code has reached max uses
    if (codeData.maxUses && codeData.usedCount >= codeData.maxUses) {
      return c.json({ 
        valid: false, 
        reason: 'Code has reached maximum uses' 
      });
    }

    // Check if user already used this code
    const userUsageKey = `redeem:usage:${userId}:${codeUpper}`;
    const alreadyUsed = await kv.get(userUsageKey);

    if (alreadyUsed) {
      return c.json({ 
        valid: false, 
        reason: 'You have already used this code' 
      });
    }

    return c.json({
      valid: true,
      rewards: codeData.rewards,
      description: codeData.description,
      expiresAt: codeData.expiresAt,
      maxUses: codeData.maxUses,
      usedCount: codeData.usedCount,
    });
  } catch (error: any) {
    console.error('Check redeem code error:', error);
    return c.json({ error: 'Failed to check redeem code' }, 500);
  }
});

export default redeem;
