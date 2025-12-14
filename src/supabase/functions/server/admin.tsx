import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

const admin = new Hono();

// Middleware to check if user is admin
const checkAdminAuth = async (c: any, next: any) => {
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

    // Check if user is admin (stored in user metadata or separate admin list)
    const adminData = await kv.get(`admin:${user.id}`);
    
    if (!adminData || adminData.role !== 'admin') {
      return c.json({ error: 'Forbidden - Admin access required' }, 403);
    }

    c.set('userId', user.id);
    c.set('userEmail', user.email);
    await next();
  } catch (error: any) {
    console.error('Admin auth error:', error);
    return c.json({ error: 'Authentication failed' }, 401);
  }
};

// Apply admin auth to all admin routes
admin.use('*', checkAdminAuth);

// ==================== DASHBOARD ====================

admin.get('/dashboard/stats', async (c) => {
  try {
    // Get total users
    const allUsers = await kv.getByPrefix('user:');
    const totalUsers = allUsers.length;

    // Calculate total currency and ruby
    let totalCurrency = 0;
    let totalRuby = 0;
    let activeUsers = 0;

    allUsers.forEach((user: any) => {
      totalCurrency += user.currency || 0;
      totalRuby += user.ruby || 0;
      
      // Consider active if played in last 7 days
      const lastActive = user.lastActive || 0;
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      if (lastActive > sevenDaysAgo) {
        activeUsers++;
      }
    });

    // Get total redeem codes
    const allRedeemCodes = await kv.getByPrefix('redeem:code:');
    const totalRedeemCodes = allRedeemCodes.length;
    
    const activeRedeemCodes = allRedeemCodes.filter((code: any) => {
      if (!code.active) return false;
      if (code.expiresAt && code.expiresAt < Date.now()) return false;
      if (code.maxUses && code.usedCount >= code.maxUses) return false;
      return true;
    }).length;

    // Get redeem usage stats
    const redeemHistory = await kv.getByPrefix('redeem:usage:');
    const totalRedeems = redeemHistory.length;

    // Get recent redeems (last 24h)
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const recentRedeems = redeemHistory.filter((usage: any) => 
      usage.timestamp > oneDayAgo
    ).length;

    // Get top spenders
    const topSpenders = allUsers
      .sort((a: any, b: any) => (b.totalSpent || 0) - (a.totalSpent || 0))
      .slice(0, 5)
      .map((user: any) => ({
        username: user.username,
        totalSpent: user.totalSpent || 0,
        currency: user.currency || 0,
        ruby: user.ruby || 0,
      }));

    return c.json({
      stats: {
        totalUsers,
        activeUsers,
        totalCurrency,
        totalRuby,
        totalRedeemCodes,
        activeRedeemCodes,
        totalRedeems,
        recentRedeems,
      },
      topSpenders,
    });
  } catch (error: any) {
    console.error('Get dashboard stats error:', error);
    return c.json({ error: 'Failed to fetch dashboard stats' }, 500);
  }
});

// ==================== USER MANAGEMENT ====================

admin.get('/users', async (c) => {
  try {
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '20');
    const search = c.req.query('search') || '';

    let allUsers = await kv.getByPrefix('user:');
    
    // Filter by search term
    if (search) {
      allUsers = allUsers.filter((user: any) => 
        user.username?.toLowerCase().includes(search.toLowerCase()) ||
        user.email?.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Sort by last active
    allUsers.sort((a: any, b: any) => (b.lastActive || 0) - (a.lastActive || 0));

    // Pagination
    const total = allUsers.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const users = allUsers.slice(startIndex, endIndex);

    return c.json({
      users: users.map((user: any) => ({
        id: user.id,
        username: user.username,
        email: user.email,
        currency: user.currency || 0,
        ruby: user.ruby || 0,
        highScore: user.highScore || 0,
        lastActive: user.lastActive || 0,
        createdAt: user.createdAt || 0,
        totalSpent: user.totalSpent || 0,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Get users error:', error);
    return c.json({ error: 'Failed to fetch users' }, 500);
  }
});

admin.get('/users/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const userData = await kv.get(`user:${userId}`);

    if (!userData) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Get user's redeem history
    const redeemHistory = await kv.getByPrefix(`redeem:usage:${userId}:`);

    return c.json({
      user: userData,
      redeemHistory: redeemHistory.map((usage: any) => ({
        code: usage.code,
        rewards: usage.rewards,
        timestamp: usage.timestamp,
      })),
    });
  } catch (error: any) {
    console.error('Get user detail error:', error);
    return c.json({ error: 'Failed to fetch user details' }, 500);
  }
});

admin.post('/users/:userId/currency', async (c) => {
  try {
    const userId = c.req.param('userId');
    const { amount, reason } = await c.req.json();

    if (typeof amount !== 'number') {
      return c.json({ error: 'Invalid amount' }, 400);
    }

    const userData = await kv.get(`user:${userId}`);
    
    if (!userData) {
      return c.json({ error: 'User not found' }, 404);
    }

    userData.currency = (userData.currency || 0) + amount;
    
    // Log transaction
    const logKey = `admin:log:${Date.now()}:${userId}`;
    await kv.set(logKey, {
      type: 'currency_adjustment',
      userId,
      amount,
      reason,
      adminId: c.get('userId'),
      timestamp: Date.now(),
    });

    await kv.set(`user:${userId}`, userData);

    return c.json({ 
      success: true, 
      newCurrency: userData.currency,
      message: `${amount > 0 ? 'Added' : 'Removed'} ${Math.abs(amount)} coins`
    });
  } catch (error: any) {
    console.error('Adjust currency error:', error);
    return c.json({ error: 'Failed to adjust currency' }, 500);
  }
});

admin.post('/users/:userId/ruby', async (c) => {
  try {
    const userId = c.req.param('userId');
    const { amount, reason } = await c.req.json();

    if (typeof amount !== 'number') {
      return c.json({ error: 'Invalid amount' }, 400);
    }

    const userData = await kv.get(`user:${userId}`);
    
    if (!userData) {
      return c.json({ error: 'User not found' }, 404);
    }

    userData.ruby = (userData.ruby || 0) + amount;
    
    // Log transaction
    const logKey = `admin:log:${Date.now()}:${userId}`;
    await kv.set(logKey, {
      type: 'ruby_adjustment',
      userId,
      amount,
      reason,
      adminId: c.get('userId'),
      timestamp: Date.now(),
    });

    await kv.set(`user:${userId}`, userData);

    return c.json({ 
      success: true, 
      newRuby: userData.ruby,
      message: `${amount > 0 ? 'Added' : 'Removed'} ${Math.abs(amount)} Ruby`
    });
  } catch (error: any) {
    console.error('Adjust ruby error:', error);
    return c.json({ error: 'Failed to adjust ruby' }, 500);
  }
});

// POST /users/:userId/skins - Adjust user skins
admin.post('/users/:userId/skins', async (c) => {
  try {
    const userId = c.req.param('userId');
    const { skinId, action, reason } = await c.req.json(); // action: 'add' | 'remove'

    if (!skinId || !action) {
      return c.json({ error: 'Invalid parameters' }, 400);
    }

    const userData = await kv.get(`user:${userId}`);
    
    if (!userData) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Initialize unlockedSkins array if not exists
    if (!userData.unlockedSkins) {
      userData.unlockedSkins = ['default'];
    }

    let message = '';
    if (action === 'add') {
      if (!userData.unlockedSkins.includes(skinId)) {
        userData.unlockedSkins.push(skinId);
        message = `Added skin: ${skinId}`;
      } else {
        return c.json({ error: 'User already has this skin' }, 400);
      }
    } else if (action === 'remove') {
      if (skinId === 'default') {
        return c.json({ error: 'Cannot remove default skin' }, 400);
      }
      const index = userData.unlockedSkins.indexOf(skinId);
      if (index > -1) {
        userData.unlockedSkins.splice(index, 1);
        // If selected skin was removed, reset to default
        if (userData.selectedSkin === skinId) {
          userData.selectedSkin = 'default';
        }
        message = `Removed skin: ${skinId}`;
      } else {
        return c.json({ error: 'User does not have this skin' }, 400);
      }
    } else {
      return c.json({ error: 'Invalid action. Use "add" or "remove"' }, 400);
    }
    
    // Log transaction
    const logKey = `admin:log:${Date.now()}:${userId}`;
    await kv.set(logKey, {
      type: 'skin_adjustment',
      userId,
      skinId,
      action,
      reason,
      adminId: c.get('userId'),
      timestamp: Date.now(),
    });

    await kv.set(`user:${userId}`, userData);

    return c.json({ 
      success: true, 
      unlockedSkins: userData.unlockedSkins,
      message
    });
  } catch (error: any) {
    console.error('Adjust skins error:', error);
    return c.json({ error: 'Failed to adjust skins' }, 500);
  }
});

// POST /users/:userId/borders - Adjust user borders
admin.post('/users/:userId/borders', async (c) => {
  try {
    const userId = c.req.param('userId');
    const { borderId, action, reason } = await c.req.json(); // action: 'add' | 'remove'

    if (!borderId || !action) {
      return c.json({ error: 'Invalid parameters' }, 400);
    }

    const userData = await kv.get(`user:${userId}`);
    
    if (!userData) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Initialize unlockedBorders array if not exists
    if (!userData.unlockedBorders) {
      userData.unlockedBorders = ['default'];
    }

    let message = '';
    if (action === 'add') {
      if (!userData.unlockedBorders.includes(borderId)) {
        userData.unlockedBorders.push(borderId);
        message = `Added border: ${borderId}`;
      } else {
        return c.json({ error: 'User already has this border' }, 400);
      }
    } else if (action === 'remove') {
      if (borderId === 'default') {
        return c.json({ error: 'Cannot remove default border' }, 400);
      }
      const index = userData.unlockedBorders.indexOf(borderId);
      if (index > -1) {
        userData.unlockedBorders.splice(index, 1);
        // If selected border was removed, reset to default
        if (userData.selectedBorder === borderId) {
          userData.selectedBorder = 'default';
        }
        message = `Removed border: ${borderId}`;
      } else {
        return c.json({ error: 'User does not have this border' }, 400);
      }
    } else {
      return c.json({ error: 'Invalid action. Use "add" or "remove"' }, 400);
    }
    
    // Log transaction
    const logKey = `admin:log:${Date.now()}:${userId}`;
    await kv.set(logKey, {
      type: 'border_adjustment',
      userId,
      borderId,
      action,
      reason,
      adminId: c.get('userId'),
      timestamp: Date.now(),
    });

    await kv.set(`user:${userId}`, userData);

    return c.json({ 
      success: true, 
      unlockedBorders: userData.unlockedBorders,
      message
    });
  } catch (error: any) {
    console.error('Adjust borders error:', error);
    return c.json({ error: 'Failed to adjust borders' }, 500);
  }
});

// POST /users/:userId/ban - Ban/Unban user
admin.post('/users/:userId/ban', async (c) => {
  try {
    const userId = c.req.param('userId');
    const { action, reason, duration } = await c.req.json(); // action: 'ban' | 'unban', duration in hours (optional)

    if (!action || !['ban', 'unban'].includes(action)) {
      return c.json({ error: 'Invalid action. Use "ban" or "unban"' }, 400);
    }

    const userData = await kv.get(`user:${userId}`);
    
    if (!userData) {
      return c.json({ error: 'User not found' }, 404);
    }

    let message = '';
    let bannedUntil = null;

    if (action === 'ban') {
      userData.isBanned = true;
      userData.banReason = reason || 'No reason provided';
      userData.bannedAt = Date.now();
      userData.bannedBy = c.get('userId');

      // If duration is provided, calculate unban time
      if (duration && duration > 0) {
        bannedUntil = Date.now() + (duration * 60 * 60 * 1000); // Convert hours to ms
        userData.bannedUntil = bannedUntil;
        message = `User banned for ${duration} hours`;
      } else {
        userData.bannedUntil = null; // Permanent ban
        message = 'User banned permanently';
      }
    } else if (action === 'unban') {
      userData.isBanned = false;
      userData.banReason = null;
      userData.bannedAt = null;
      userData.bannedBy = null;
      userData.bannedUntil = null;
      userData.unbannedAt = Date.now();
      userData.unbannedBy = c.get('userId');
      message = 'User unbanned successfully';
    }
    
    // Log transaction
    const logKey = `admin:log:${Date.now()}:${userId}`;
    await kv.set(logKey, {
      type: action === 'ban' ? 'user_banned' : 'user_unbanned',
      userId,
      reason,
      duration,
      bannedUntil,
      adminId: c.get('userId'),
      timestamp: Date.now(),
    });

    await kv.set(`user:${userId}`, userData);

    return c.json({ 
      success: true,
      isBanned: userData.isBanned,
      bannedUntil: userData.bannedUntil,
      message
    });
  } catch (error: any) {
    console.error('Ban/Unban user error:', error);
    return c.json({ error: 'Failed to ban/unban user' }, 500);
  }
});

// DELETE /users/:userId - Delete user account
admin.delete('/users/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const { confirm, reason } = await c.req.json();

    if (!confirm || confirm !== 'DELETE') {
      return c.json({ error: 'Confirmation required. Send { "confirm": "DELETE" }' }, 400);
    }

    const userData = await kv.get(`user:${userId}`);
    
    if (!userData) {
      return c.json({ error: 'User not found' }, 404);
    }

    const username = userData.username;
    const email = userData.email;

    // Log deletion before deleting
    const logKey = `admin:log:${Date.now()}:${userId}`;
    await kv.set(logKey, {
      type: 'user_deleted',
      userId,
      username,
      email,
      reason,
      userData: { ...userData }, // Backup user data
      adminId: c.get('userId'),
      timestamp: Date.now(),
    });

    // Delete user data from KV store
    await kv.del(`user:${userId}`);

    // Try to delete from Supabase Auth (ignore if not found)
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );

      const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);
      
      if (deleteError) {
        // Only log if error is NOT "user_not_found"
        if (deleteError.message !== 'User not found' && deleteError.status !== 404) {
          console.error('Failed to delete from Supabase Auth:', deleteError);
        } else {
          console.log('ℹ️ User not found in Supabase Auth (already deleted or KV-only user)');
        }
      } else {
        console.log('✅ User deleted from Supabase Auth');
      }
    } catch (authError: any) {
      // Ignore "User not found" errors
      if (authError.status === 404 || authError.code === 'user_not_found') {
        console.log('ℹ️ User not found in Supabase Auth (already deleted or KV-only user)');
      } else {
        console.error('Supabase Auth deletion error:', authError);
      }
    }

    console.log('🗑️ User deleted from KV store:', username);

    return c.json({ 
      success: true,
      message: `User account deleted: ${username} (${email})`,
      deletedUser: {
        id: userId,
        username,
        email
      }
    });
  } catch (error: any) {
    console.error('Delete user error:', error);
    return c.json({ error: 'Failed to delete user account' }, 500);
  }
});

// ==================== REDEEM CODE MANAGEMENT ====================

admin.get('/redeem-codes', async (c) => {
  try {
    const status = c.req.query('status') || 'all'; // all, active, expired, used
    
    let allCodes = await kv.getByPrefix('redeem:code:');
    
    // Filter by status
    if (status !== 'all') {
      allCodes = allCodes.filter((code: any) => {
        const now = Date.now();
        
        if (status === 'active') {
          if (!code.active) return false;
          if (code.expiresAt && code.expiresAt < now) return false;
          if (code.maxUses && code.usedCount >= code.maxUses) return false;
          return true;
        }
        
        if (status === 'expired') {
          return code.expiresAt && code.expiresAt < now;
        }
        
        if (status === 'used') {
          return code.maxUses && code.usedCount >= code.maxUses;
        }
        
        return false;
      });
    }

    // Sort by created date (newest first)
    allCodes.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));

    return c.json({ codes: allCodes });
  } catch (error: any) {
    console.error('Get redeem codes error:', error);
    return c.json({ error: 'Failed to fetch redeem codes' }, 500);
  }
});

admin.post('/redeem-codes', async (c) => {
  try {
    const { 
      code, 
      rewards, 
      maxUses, 
      expiresAt, 
      description 
    } = await c.req.json();

    // Validation
    if (!code || typeof code !== 'string') {
      return c.json({ error: 'Valid code is required' }, 400);
    }

    if (!rewards || typeof rewards !== 'object') {
      return c.json({ error: 'Valid rewards object is required' }, 400);
    }

    // Check if code already exists
    const existingCode = await kv.get(`redeem:code:${code.toUpperCase()}`);
    if (existingCode) {
      return c.json({ error: 'Code already exists' }, 400);
    }

    const codeData = {
      code: code.toUpperCase(),
      rewards: {
        currency: rewards.currency || 0,
        ruby: rewards.ruby || 0,
        items: rewards.items || [], // Array of item IDs
      },
      maxUses: maxUses || null, // null = unlimited
      usedCount: 0,
      expiresAt: expiresAt || null, // timestamp or null
      description: description || '',
      active: true,
      createdBy: c.get('userId'),
      createdAt: Date.now(),
    };

    await kv.set(`redeem:code:${code.toUpperCase()}`, codeData);

    return c.json({ 
      success: true, 
      code: codeData,
      message: 'Redeem code created successfully'
    });
  } catch (error: any) {
    console.error('Create redeem code error:', error);
    return c.json({ error: 'Failed to create redeem code' }, 500);
  }
});

admin.put('/redeem-codes/:code', async (c) => {
  try {
    const code = c.req.param('code').toUpperCase();
    const updates = await c.req.json();

    const codeData = await kv.get(`redeem:code:${code}`);
    
    if (!codeData) {
      return c.json({ error: 'Redeem code not found' }, 404);
    }

    // Update allowed fields
    if (updates.rewards) codeData.rewards = updates.rewards;
    if (updates.maxUses !== undefined) codeData.maxUses = updates.maxUses;
    if (updates.expiresAt !== undefined) codeData.expiresAt = updates.expiresAt;
    if (updates.description !== undefined) codeData.description = updates.description;
    if (updates.active !== undefined) codeData.active = updates.active;

    codeData.updatedAt = Date.now();
    codeData.updatedBy = c.get('userId');

    await kv.set(`redeem:code:${code}`, codeData);

    return c.json({ 
      success: true, 
      code: codeData,
      message: 'Redeem code updated successfully'
    });
  } catch (error: any) {
    console.error('Update redeem code error:', error);
    return c.json({ error: 'Failed to update redeem code' }, 500);
  }
});

admin.delete('/redeem-codes/:code', async (c) => {
  try {
    const code = c.req.param('code').toUpperCase();

    const codeData = await kv.get(`redeem:code:${code}`);
    
    if (!codeData) {
      return c.json({ error: 'Redeem code not found' }, 404);
    }

    await kv.del(`redeem:code:${code}`);

    return c.json({ 
      success: true,
      message: 'Redeem code deleted successfully'
    });
  } catch (error: any) {
    console.error('Delete redeem code error:', error);
    return c.json({ error: 'Failed to delete redeem code' }, 500);
  }
});

admin.get('/redeem-codes/:code/usage', async (c) => {
  try {
    const code = c.req.param('code').toUpperCase();

    const codeData = await kv.get(`redeem:code:${code}`);
    
    if (!codeData) {
      return c.json({ error: 'Redeem code not found' }, 404);
    }

    // Get all usage records for this code
    const allUsage = await kv.getByPrefix('redeem:usage:');
    const codeUsage = allUsage.filter((usage: any) => usage.code === code);

    return c.json({
      code: codeData,
      usage: codeUsage.map((usage: any) => ({
        userId: usage.userId,
        username: usage.username,
        rewards: usage.rewards,
        timestamp: usage.timestamp,
      })),
      usageCount: codeUsage.length,
    });
  } catch (error: any) {
    console.error('Get code usage error:', error);
    return c.json({ error: 'Failed to fetch code usage' }, 500);
  }
});

// ==================== ADMIN LOGS ====================

admin.get('/logs', async (c) => {
  try {
    const type = c.req.query('type') || 'all';
    const limit = parseInt(c.req.query('limit') || '50');

    let logs = await kv.getByPrefix('admin:log:');
    
    // Filter by type
    if (type !== 'all') {
      logs = logs.filter((log: any) => log.type === type);
    }

    // Sort by timestamp (newest first)
    logs.sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0));

    // Limit results
    logs = logs.slice(0, limit);

    return c.json({ logs });
  } catch (error: any) {
    console.error('Get logs error:', error);
    return c.json({ error: 'Failed to fetch logs' }, 500);
  }
});

// ==================== PROMOTE USER TO ADMIN ====================

// Special endpoint to promote first user to admin (run once)
admin.post('/promote-admin', async (c) => {
  try {
    const { userId, secretKey } = await c.req.json();

    // Use environment secret key for security
    const ADMIN_SECRET = Deno.env.get('ADMIN_PROMOTION_SECRET') || 'CHANGE_THIS_SECRET_KEY_12345';
    
    if (secretKey !== ADMIN_SECRET) {
      return c.json({ error: 'Invalid secret key' }, 403);
    }

    await kv.set(`admin:${userId}`, {
      role: 'admin',
      promotedAt: Date.now(),
    });

    return c.json({ 
      success: true,
      message: 'User promoted to admin successfully'
    });
  } catch (error: any) {
    console.error('Promote admin error:', error);
    return c.json({ error: 'Failed to promote admin' }, 500);
  }
});

export default admin;