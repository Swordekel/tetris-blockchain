import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";
import topupRoutes from "./topup.tsx";
import blockchainRoutes from "./blockchain.tsx";
import adminRoutes from "./admin.tsx";
import redeemRoutes from "./redeem.tsx";
import musicRoutes from "./music.tsx";

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Helper function for KV operations with retry and timeout
async function kvGetWithRetry<T>(key: string, retries = 3, timeoutMs = 5000): Promise<T | null> {
  let lastError = null;
  
  for (let i = 0; i < retries; i++) {
    try {
      const result = await Promise.race([
        kv.get(key),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('KV timeout')), timeoutMs)
        )
      ]) as T;
      
      return result; // Success
    } catch (error: any) {
      lastError = error;
      console.warn(`KV get retry ${i + 1}/${retries} for key "${key}":`, error.message);
      
      if (i < retries - 1) {
        // Exponential backoff: 100ms, 200ms, 400ms
        await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, i)));
      }
    }
  }
  
  console.error(`KV get failed after ${retries} retries for key "${key}":`, lastError);
  return null;
}

// Helper function for KV set with retry
async function kvSetWithRetry(key: string, value: any, retries = 3, timeoutMs = 5000): Promise<boolean> {
  let lastError = null;
  
  for (let i = 0; i < retries; i++) {
    try {
      await Promise.race([
        kv.set(key, value),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('KV timeout')), timeoutMs)
        )
      ]);
      
      return true; // Success
    } catch (error: any) {
      lastError = error;
      console.warn(`KV set retry ${i + 1}/${retries} for key "${key}":`, error.message);
      
      if (i < retries - 1) {
        // Exponential backoff: 100ms, 200ms, 400ms
        await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, i)));
      }
    }
  }
  
  console.error(`KV set failed after ${retries} retries for key "${key}":`, lastError);
  return false;
}

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-7fcff8d3/health", (c) => {
  return c.json({ status: "ok" });
});

// Check if user is admin
app.get("/make-server-7fcff8d3/check-admin", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ isAdmin: false });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !user) {
      return c.json({ isAdmin: false });
    }

    // Check if user has admin role
    const adminData = await kv.get(`admin:${user.id}`);
    
    return c.json({ 
      isAdmin: adminData && adminData.role === 'admin',
      userId: user.id,
      email: user.email
    });
  } catch (error) {
    console.error("Check admin error:", error);
    return c.json({ isAdmin: false });
  }
});

// Promote user to admin (open endpoint with secret key)
app.post("/make-server-7fcff8d3/promote-admin", async (c) => {
  try {
    const { userId, email, secretKey } = await c.req.json();

    // Use environment secret key for security
    const ADMIN_SECRET = Deno.env.get('ADMIN_PROMOTION_SECRET') || 'TETRIS_ADMIN_SECRET_2024';
    
    if (secretKey !== ADMIN_SECRET) {
      return c.json({ error: 'Invalid secret key' }, 403);
    }

    let targetUserId = userId;

    // If email provided instead of userId, find user by email
    if (!targetUserId && email) {
      const allUsers = await kv.getByPrefix('user:');
      const user = allUsers.find((u: any) => u.email === email);
      if (user) {
        targetUserId = user.id;
      }
    }

    if (!targetUserId) {
      return c.json({ error: 'User not found' }, 404);
    }

    await kv.set(`admin:${targetUserId}`, {
      role: 'admin',
      promotedAt: Date.now(),
    });

    console.log('🛡️ User promoted to admin:', targetUserId);

    return c.json({ 
      success: true,
      message: 'User promoted to admin successfully',
      userId: targetUserId
    });
  } catch (error: any) {
    console.error('Promote admin error:', error);
    return c.json({ error: 'Failed to promote admin' }, 500);
  }
});

// Signup endpoint
app.post("/make-server-7fcff8d3/signup", async (c) => {
  try {
    const { email, password, username } = await c.req.json();

    if (!email || !password || !username) {
      return c.json({ error: "Email, password, and username are required" }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Create user in Supabase Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { username },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    });

    if (error) {
      console.error("Signup error:", error);
      return c.json({ error: error.message }, 400);
    }

    // Initialize user data in KV store
    const userId = data.user.id;
    await kv.set(`user:${userId}`, {
      id: userId,
      username,
      email,
      currency: 1000, // Starting currency
      ruby: 0, // Premium currency (top-up only)
      selectedSkin: 'default',
      selectedBorder: 'default',
      ownedSkins: ['default'],
      ownedBorders: ['default'],
      highScore: 0,
      createdAt: new Date().toISOString()
    });

    return c.json({ success: true, user: data.user });
  } catch (error) {
    console.error("Signup error:", error);
    return c.json({ error: "Internal server error during signup" }, 500);
  }
});

// Get user profile
app.get("/make-server-7fcff8d3/profile", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const userData = await kv.get(`user:${user.id}`);
    
    if (!userData) {
      return c.json({ error: "User data not found" }, 404);
    }

    return c.json({ user: userData });
  } catch (error) {
    console.error("Get profile error:", error);
    return c.json({ error: "Internal server error while getting profile" }, 500);
  }
});

// Get public profile (for viewing other users)
app.get("/make-server-7fcff8d3/profile/public/:userId", async (c) => {
  try {
    const userId = c.req.param('userId');
    
    const userData = await kv.get(`user:${userId}`);
    
    if (!userData) {
      return c.json({ error: "User not found" }, 404);
    }

    // Return only public data
    const publicData = {
      id: userData.id,
      username: userData.username,
      email: userData.email,
      selectedSkin: userData.selectedSkin,
      selectedBorder: userData.selectedBorder,
      ownedSkins: userData.ownedSkins,
      ownedBorders: userData.ownedBorders,
      highScore: userData.highScore,
      profilePicture: userData.profilePicture,
      coverImage: userData.coverImage,
      currency: 0, // Don't show real currency to others
    };

    return c.json({ user: publicData });
  } catch (error) {
    console.error("Get public profile error:", error);
    return c.json({ error: "Internal server error while getting public profile" }, 500);
  }
});

// Update user profile
app.post("/make-server-7fcff8d3/profile/update", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { username, selectedSkin, selectedBorder, profilePicture, coverImage } = await c.req.json();
    const userData = await kv.get(`user:${user.id}`);
    
    if (!userData) {
      return c.json({ error: "User data not found" }, 404);
    }

    console.log('📝 Profile update request:', { username, selectedSkin, selectedBorder, profilePicture: !!profilePicture, coverImage: !!coverImage });

    // Update only allowed fields
    const updatedData = {
      ...userData,
      ...(username && { username }),
      ...(selectedSkin !== undefined && { selectedSkin }),
      ...(selectedBorder !== undefined && { selectedBorder }),
      ...(profilePicture !== undefined && { profilePicture }),
      ...(coverImage !== undefined && { coverImage }),
    };
    
    console.log('✅ Updated selectedBorder:', updatedData.selectedBorder);

    await kv.set(`user:${user.id}`, updatedData);

    return c.json({ success: true, user: updatedData });
  } catch (error) {
    console.error("Update profile error:", error);
    return c.json({ error: "Internal server error while updating profile" }, 500);
  }
});

// Add Ruby to user (for demo/testing purposes)
app.post("/make-server-7fcff8d3/profile/add-ruby", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { amount } = await c.req.json();
    
    if (typeof amount !== 'number' || amount <= 0) {
      return c.json({ error: "Invalid amount" }, 400);
    }

    const userData = await kv.get(`user:${user.id}`);
    
    if (!userData) {
      return c.json({ error: "User data not found" }, 404);
    }

    // Add Ruby
    userData.ruby = (userData.ruby || 0) + amount;

    await kv.set(`user:${user.id}`, userData);

    console.log(`💎 Added ${amount} Ruby to user ${userData.username} (total: ${userData.ruby})`);

    return c.json({ 
      success: true,
      ruby: userData.ruby,
      added: amount,
    });
  } catch (error) {
    console.error("Add Ruby error:", error);
    return c.json({ error: "Internal server error while adding Ruby" }, 500);
  }
});

// Upload profile picture
app.post("/make-server-7fcff8d3/profile/upload-photo", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Get form data
    const formData = await c.req.formData();
    const file = formData.get('file');
    
    if (!file || !(file instanceof File)) {
      return c.json({ error: "No file uploaded" }, 400);
    }

    // Check bucket exists, create if not
    const bucketName = 'make-7fcff8d3-profile-pictures';
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
    
    if (!bucketExists) {
      await supabase.storage.createBucket(bucketName, {
        public: false,
        fileSizeLimit: 10485760, // 10MB
      });
    }

    // Validate file size (max 10MB)
    if (file.size > 10485760) {
      return c.json({ error: "File size exceeds 10MB limit" }, 400);
    }

    // Upload file
    const fileName = `${user.id}/${Date.now()}-${file.name}`;
    const fileBuffer = await file.arrayBuffer();
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return c.json({ error: "Failed to upload file" }, 500);
    }

    // Get signed URL (valid for 1 year)
    const { data: urlData, error: urlError } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(fileName, 31536000); // 1 year

    if (urlError) {
      console.error("URL error:", urlError);
      return c.json({ error: "Failed to get file URL" }, 500);
    }

    return c.json({ 
      success: true, 
      photoUrl: urlData.signedUrl 
    });
  } catch (error) {
    console.error("Upload photo error:", error);
    return c.json({ error: "Internal server error while uploading photo" }, 500);
  }
});

// Submit score
app.post("/make-server-7fcff8d3/score/submit", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { score } = await c.req.json();
    
    if (typeof score !== 'number' || score < 0) {
      return c.json({ error: "Invalid score" }, 400);
    }

    const userData = await kv.get(`user:${user.id}`);
    
    if (!userData) {
      return c.json({ error: "User data not found" }, 404);
    }

    // Calculate currency earned (1 coin per 100 points)
    const coinsEarned = Math.floor(score / 100);

    // Get current period identifiers
    const now = new Date();
    const dailyKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
    const weekNum = getWeekNumber(now);
    const weeklyKey = `${now.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
    const seasonKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;

    // Update user data if new high score
    let updatedData = { ...userData };
    if (score > userData.highScore) {
      updatedData.highScore = score;
    }
    updatedData.currency = (userData.currency || 0) + coinsEarned;

    // Update daily high score
    const dailyScoreKey = `daily:${user.id}:${dailyKey}`;
    const dailyData = await kv.get(dailyScoreKey) || { score: 0 };
    if (score > dailyData.score) {
      await kv.set(dailyScoreKey, {
        userId: user.id,
        username: userData.username,
        score,
        date: dailyKey,
        profilePicture: userData.profilePicture,
        selectedBorder: userData.selectedBorder,
      });
    }

    // Update weekly high score
    const weeklyScoreKey = `weekly:${user.id}:${weeklyKey}`;
    const weeklyData = await kv.get(weeklyScoreKey) || { score: 0 };
    if (score > weeklyData.score) {
      await kv.set(weeklyScoreKey, {
        userId: user.id,
        username: userData.username,
        score,
        week: weeklyKey,
        profilePicture: userData.profilePicture,
        selectedBorder: userData.selectedBorder,
      });
    }

    // Update season high score
    const seasonScoreKey = `season:${user.id}:${seasonKey}`;
    const seasonData = await kv.get(seasonScoreKey) || { score: 0 };
    if (score > seasonData.score) {
      await kv.set(seasonScoreKey, {
        userId: user.id,
        username: userData.username,
        score,
        season: seasonKey,
        profilePicture: userData.profilePicture,
        selectedBorder: userData.selectedBorder,
      });
    }

    await kv.set(`user:${user.id}`, updatedData);

    // Store score in history
    await kv.set(`score:${user.id}:${Date.now()}`, {
      userId: user.id,
      username: userData.username,
      score,
      timestamp: new Date().toISOString()
    });

    return c.json({ 
      success: true, 
      coinsEarned,
      newHighScore: score > userData.highScore,
      totalCurrency: updatedData.currency
    });
  } catch (error) {
    console.error("Submit score error:", error);
    return c.json({ error: "Internal server error while submitting score" }, 500);
  }
});

// Helper function to get week number
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// TEMPORARY: Sync period leaderboard records with current user profile data
app.post("/make-server-7fcff8d3/sync-leaderboard-borders", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const userData = await kv.get(`user:${user.id}`);
    
    if (!userData) {
      return c.json({ error: "User data not found" }, 404);
    }

    console.log('🔄 Syncing leaderboard borders for user:', userData.username, 'with border:', userData.selectedBorder);

    // Get all daily, weekly, and season records for this user
    const dailyRecords = await kv.getByPrefix(`daily:${user.id}`);
    const weeklyRecords = await kv.getByPrefix(`weekly:${user.id}`);
    const seasonRecords = await kv.getByPrefix(`season:${user.id}`);

    let updatedCount = 0;

    // Update daily records
    for (const record of dailyRecords) {
      const key = `daily:${record.userId}:${record.date}`;
      await kv.set(key, {
        ...record,
        selectedBorder: userData.selectedBorder,
        profilePicture: userData.profilePicture,
      });
      updatedCount++;
    }

    // Update weekly records
    for (const record of weeklyRecords) {
      const key = `weekly:${record.userId}:${record.week}`;
      await kv.set(key, {
        ...record,
        selectedBorder: userData.selectedBorder,
        profilePicture: userData.profilePicture,
      });
      updatedCount++;
    }

    // Update season records
    for (const record of seasonRecords) {
      const key = `season:${record.userId}:${record.season}`;
      await kv.set(key, {
        ...record,
        selectedBorder: userData.selectedBorder,
        profilePicture: userData.profilePicture,
      });
      updatedCount++;
    }

    console.log('✅ Synced', updatedCount, 'leaderboard records');

    return c.json({ 
      success: true, 
      message: `Updated ${updatedCount} leaderboard records with current border`,
      updatedCount 
    });
  } catch (error) {
    console.error("Sync leaderboard borders error:", error);
    return c.json({ error: "Internal server error while syncing leaderboard borders" }, 500);
  }
});

// Get leaderboard with type (all-time, daily, weekly, season)
app.get("/make-server-7fcff8d3/leaderboard", async (c) => {
  try {
    const type = c.req.query('type') || 'all';
    
    let leaderboard = [];
    const now = new Date();
    
    if (type === 'daily') {
      const dailyKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
      const dailyScores = await kv.getByPrefix(`daily:`);
      
      leaderboard = dailyScores
        .filter((item: any) => item.date === dailyKey)
        .map((item: any) => ({
          userId: item.userId,
          username: item.username,
          highScore: item.score,
          selectedBorder: item.selectedBorder || 'default',
          profilePicture: item.profilePicture || null,
        }))
        .sort((a: any, b: any) => b.highScore - a.highScore)
        .slice(0, 100);
    } else if (type === 'weekly') {
      const weekNum = getWeekNumber(now);
      const weeklyKey = `${now.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
      const weeklyScores = await kv.getByPrefix(`weekly:`);
      
      leaderboard = weeklyScores
        .filter((item: any) => item.week === weeklyKey)
        .map((item: any) => ({
          userId: item.userId,
          username: item.username,
          highScore: item.score,
          selectedBorder: item.selectedBorder || 'default',
          profilePicture: item.profilePicture || null,
        }))
        .sort((a: any, b: any) => b.highScore - a.highScore)
        .slice(0, 100);
    } else if (type === 'season') {
      const seasonKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
      const seasonScores = await kv.getByPrefix(`season:`);
      
      leaderboard = seasonScores
        .filter((item: any) => item.season === seasonKey)
        .map((item: any) => ({
          userId: item.userId,
          username: item.username,
          highScore: item.score,
          selectedBorder: item.selectedBorder || 'default',
          profilePicture: item.profilePicture || null,
        }))
        .sort((a: any, b: any) => b.highScore - a.highScore)
        .slice(0, 100);
    } else {
      // All-time leaderboard
      const userKeys = await kv.getByPrefix('user:');
      
      leaderboard = userKeys
        .map((item: any) => ({
          userId: item.id,
          username: item.username,
          highScore: item.highScore || 0,
          selectedBorder: item.selectedBorder || 'default',
          profilePicture: item.profilePicture || null,
        }))
        .sort((a: any, b: any) => b.highScore - a.highScore)
        .slice(0, 100);
    }

    return c.json({ leaderboard, type });
  } catch (error) {
    console.error("Get leaderboard error:", error);
    return c.json({ error: "Internal server error while getting leaderboard" }, 500);
  }
});

// Distribute rewards for leaderboard (called by cron or manually)
app.post("/make-server-7fcff8d3/leaderboard/distribute-rewards", async (c) => {
  try {
    const { type, period } = await c.req.json(); // type: 'daily', 'weekly', 'season'
    
    if (!['daily', 'weekly', 'season'].includes(type)) {
      return c.json({ error: "Invalid type" }, 400);
    }

    const now = new Date();
    let prefix = '';
    let filterKey = '';
    let borderPrefix = '';

    if (type === 'daily') {
      // Get yesterday's date
      const yesterday = new Date(now);
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      filterKey = `${yesterday.getUTCFullYear()}-${String(yesterday.getUTCMonth() + 1).padStart(2, '0')}-${String(yesterday.getUTCDate()).padStart(2, '0')}`;
      prefix = 'daily:';
      borderPrefix = 'daily';
    } else if (type === 'weekly') {
      // Get last week
      const lastWeek = new Date(now);
      lastWeek.setUTCDate(lastWeek.getUTCDate() - 7);
      const weekNum = getWeekNumber(lastWeek);
      filterKey = `${lastWeek.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
      prefix = 'weekly:';
      borderPrefix = 'weekly';
    } else {
      // Get last month
      const lastMonth = new Date(now);
      lastMonth.setUTCMonth(lastMonth.getUTCMonth() - 1);
      filterKey = `${lastMonth.getUTCFullYear()}-${String(lastMonth.getUTCMonth() + 1).padStart(2, '0')}`;
      prefix = 'season:';
      borderPrefix = 'season';
    }

    // Get leaderboard for the period
    const scores = await kv.getByPrefix(prefix);
    const filteredScores = scores
      .filter((item: any) => {
        if (type === 'daily') return item.date === filterKey;
        if (type === 'weekly') return item.week === filterKey;
        return item.season === filterKey;
      })
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 3); // Top 3

    const rewards = [
      { border: `${borderPrefix}_champion`, coins: 1000 }, // 1st place
      { border: `${borderPrefix}_master`, coins: 500 },    // 2nd place
      { border: `${borderPrefix}_elite`, coins: 250 },     // 3rd place
    ];

    const rewardedUsers = [];

    for (let i = 0; i < filteredScores.length; i++) {
      const score = filteredScores[i];
      const reward = rewards[i];
      
      const userData = await kv.get(`user:${score.userId}`);
      if (userData) {
        // Add border if not already owned
        if (!userData.ownedBorders.includes(reward.border)) {
          userData.ownedBorders.push(reward.border);
        }
        
        // Add coins
        userData.currency = (userData.currency || 0) + reward.coins;
        
        await kv.set(`user:${score.userId}`, userData);
        
        rewardedUsers.push({
          userId: score.userId,
          username: score.username,
          rank: i + 1,
          border: reward.border,
          coins: reward.coins,
        });
      }
    }

    return c.json({ 
      success: true, 
      type,
      period: filterKey,
      rewarded: rewardedUsers 
    });
  } catch (error) {
    console.error("Distribute rewards error:", error);
    return c.json({ error: "Internal server error while distributing rewards" }, 500);
  }
});

// Shop - Get available items
app.get("/make-server-7fcff8d3/shop/items", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Get user data with retry mechanism
    let userData = null;
    let retries = 3;
    let lastError = null;
    
    for (let i = 0; i < retries; i++) {
      try {
        userData = await Promise.race([
          kv.get(`user:${user.id}`),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('KV timeout')), 5000)
          )
        ]);
        break; // Success, exit retry loop
      } catch (error: any) {
        lastError = error;
        console.warn(`Get shop items - KV attempt ${i + 1}/${retries} failed:`, error.message);
        
        if (i < retries - 1) {
          // Wait before retry (exponential backoff: 100ms, 200ms, 400ms)
          await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, i)));
        }
      }
    }
    
    if (!userData) {
      console.error('Get shop items error:', lastError);
      // Return default empty data instead of 404
      return c.json({ 
        skins: [],
        borders: [],
        ownedSkins: ['default'],
        ownedBorders: ['default'],
        currency: 0,
        ruby: 0,
      });
    }

    const skins = [
      { id: 'default', name: 'Classic', price: 0, rarity: 'common' },
      { id: 'neon', name: 'Neon Glow', price: 500, rarity: 'rare' },
      { id: 'candy', name: 'Candy Land', price: 750, rarity: 'rare' },
      { id: 'rainbow', name: 'Rainbow', price: 1000, rarity: 'epic' },
      { id: 'galaxy', name: 'Galaxy', price: 1500, rarity: 'legendary' },
      { id: 'gold', name: 'Golden Blocks', price: 1200, rarity: 'epic' },
      { id: 'fire', name: 'Fire & Ice', price: 800, rarity: 'epic' },
      { id: 'cyber', name: 'Cyberpunk', price: 1200, rarity: 'legendary' },
      // GACHA EXCLUSIVE SKINS
      { id: 'zootopia', name: 'Zootopia Arena', price: 0, rarity: 'legendary', isGachaOnly: true },
      { id: 'crystal', name: 'Crystal Dream', price: 0, rarity: 'legendary', isGachaOnly: true },
      { id: 'ocean', name: 'Deep Ocean', price: 0, rarity: 'epic', isGachaOnly: true },
      { id: 'sunset', name: 'Golden Sunset', price: 0, rarity: 'epic', isGachaOnly: true },
      { id: 'aurora', name: 'Aurora Borealis', price: 0, rarity: 'rare', isGachaOnly: true },
      { id: 'cosmic', name: 'Cosmic Void', price: 0, rarity: 'common', isGachaOnly: true },
    ];

    const borders = [
      { id: 'default', name: 'No Border', price: 0, rarity: 'common' },
      { id: 'bronze', name: 'Bronze Frame', price: 300, rarity: 'common' },
      { id: 'silver', name: 'Silver Frame', price: 600, rarity: 'rare' },
      { id: 'gold', name: 'Gold Frame', price: 1000, rarity: 'epic' },
      { id: 'diamond', name: 'Diamond Frame', price: 1500, rarity: 'legendary' },
      { id: 'fire', name: 'Fire Border', price: 800, rarity: 'epic' },
      // ZOOTOPIA GACHA EXCLUSIVE BORDERS
      { id: 'zootopia_nick', name: '🦊 Nick Wilde Border', price: 0, rarity: 'legendary', isGachaOnly: true },
      { id: 'zootopia_judy', name: '🐰 Judy Hopps Border', price: 0, rarity: 'epic', isGachaOnly: true },
      { id: 'zootopia_steampunk', name: '⚙️ Zootopia Steampunk', price: 0, rarity: 'epic', isGachaOnly: true },
      // DAILY LEADERBOARD REWARDS (Cannot be purchased)
      { id: 'daily_champion', name: '🏆 Daily Champion', price: 0, rarity: 'legendary', isRewardOnly: true },
      { id: 'daily_master', name: '⭐ Daily Master', price: 0, rarity: 'epic', isRewardOnly: true },
      { id: 'daily_elite', name: '💫 Daily Elite', price: 0, rarity: 'rare', isRewardOnly: true },
      // WEEKLY LEADERBOARD REWARDS (Cannot be purchased)
      { id: 'weekly_champion', name: '👑 Weekly Champion', price: 0, rarity: 'legendary', isRewardOnly: true },
      { id: 'weekly_master', name: '🌟 Weekly Master', price: 0, rarity: 'epic', isRewardOnly: true },
      { id: 'weekly_elite', name: '✨ Weekly Elite', price: 0, rarity: 'rare', isRewardOnly: true },
      // SEASON LEADERBOARD REWARDS (Cannot be purchased)
      { id: 'season_champion', name: '🌌 Season Champion', price: 0, rarity: 'legendary', isRewardOnly: true },
      { id: 'season_master', name: '💎 Season Master', price: 0, rarity: 'epic', isRewardOnly: true },
      { id: 'season_elite', name: '🔮 Season Elite', price: 0, rarity: 'rare', isRewardOnly: true },
    ];

    return c.json({ 
      skins, 
      borders,
      ownedSkins: userData.ownedSkins || [],
      ownedBorders: userData.ownedBorders || [],
      currency: userData.currency || 0,
      ruby: userData.ruby || 0,
    });
  } catch (error) {
    console.error("Get shop items error:", error);
    return c.json({ error: "Internal server error while getting shop items" }, 500);
  }
});

// Shop - Purchase item
app.post("/make-server-7fcff8d3/shop/purchase", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { itemId, itemType, price } = await c.req.json();

    // Retry mechanism for KV operations
    const retries = 3;
    let userData: any = null;
    let lastError: any = null;
    
    for (let i = 0; i < retries; i++) {
      try {
        userData = await kv.get(`user:${user.id}`);
        break;
      } catch (error: any) {
        lastError = error;
        console.warn(`Purchase - KV get attempt ${i + 1}/${retries} failed:`, error.message);
        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, i)));
        }
      }
    }
    
    if (!userData) {
      console.error('Purchase error - user data not found:', lastError);
      return c.json({ error: "User data not found" }, 404);
    }

    // Define all available items (must match /shop/items endpoint)
    const allSkins = [
      { id: 'default', name: 'Classic', price: 0, rarity: 'common' },
      { id: 'neon', name: 'Neon Glow', price: 500, rarity: 'rare' },
      { id: 'candy', name: 'Candy Land', price: 750, rarity: 'rare' },
      { id: 'rainbow', name: 'Rainbow', price: 1000, rarity: 'epic' },
      { id: 'galaxy', name: 'Galaxy', price: 1500, rarity: 'legendary' },
      { id: 'gold', name: 'Golden Blocks', price: 1200, rarity: 'epic' },
      { id: 'fire', name: 'Fire & Ice', price: 800, rarity: 'epic' },
      { id: 'cyber', name: 'Cyberpunk', price: 1200, rarity: 'legendary' },
      { id: 'zootopia', name: 'Zootopia Arena', price: 0, rarity: 'legendary', isGachaOnly: true },
      { id: 'crystal', name: 'Crystal Dream', price: 0, rarity: 'legendary', isGachaOnly: true },
      { id: 'ocean', name: 'Deep Ocean', price: 0, rarity: 'epic', isGachaOnly: true },
      { id: 'sunset', name: 'Golden Sunset', price: 0, rarity: 'epic', isGachaOnly: true },
      { id: 'aurora', name: 'Aurora Borealis', price: 0, rarity: 'rare', isGachaOnly: true },
      { id: 'cosmic', name: 'Cosmic Void', price: 0, rarity: 'common', isGachaOnly: true },
    ];

    const allBorders = [
      { id: 'default', name: 'No Border', price: 0, rarity: 'common' },
      { id: 'bronze', name: 'Bronze Frame', price: 300, rarity: 'common' },
      { id: 'silver', name: 'Silver Frame', price: 600, rarity: 'rare' },
      { id: 'gold', name: 'Gold Frame', price: 1000, rarity: 'epic' },
      { id: 'diamond', name: 'Diamond Frame', price: 1500, rarity: 'legendary' },
      { id: 'fire', name: 'Fire Border', price: 800, rarity: 'epic' },
      { id: 'zootopia_nick', name: '🦊 Nick Wilde Border', price: 0, rarity: 'legendary', isGachaOnly: true },
      { id: 'zootopia_judy', name: '🐰 Judy Hopps Border', price: 0, rarity: 'epic', isGachaOnly: true },
      { id: 'zootopia_steampunk', name: '⚙️ Zootopia Steampunk', price: 0, rarity: 'epic', isGachaOnly: true },
    ];

    // Find the item
    const itemList = itemType === 'skin' ? allSkins : allBorders;
    const item = itemList.find(i => i.id === itemId);

    if (!item) {
      return c.json({ error: "Item not found" }, 404);
    }

    // Prevent purchasing gacha-only items
    if (item.isGachaOnly) {
      return c.json({ error: "This item is gacha exclusive and cannot be purchased directly" }, 400);
    }

    // Validate price matches (security check)
    if (item.price !== price) {
      console.error(`Price mismatch for ${itemId}: expected ${item.price}, got ${price}`);
      return c.json({ error: "Invalid price" }, 400);
    }

    // Check if already owned
    const ownedList = itemType === 'skin' ? userData.ownedSkins : userData.ownedBorders;
    if (ownedList?.includes(itemId)) {
      return c.json({ error: "Already owned" }, 400);
    }

    // Check currency
    if (userData.currency < item.price) {
      return c.json({ error: "Insufficient currency" }, 400);
    }

    // Purchase item
    userData.currency -= item.price;
    if (itemType === 'skin') {
      userData.ownedSkins = userData.ownedSkins || [];
      userData.ownedSkins.push(itemId);
    } else {
      userData.ownedBorders = userData.ownedBorders || [];
      userData.ownedBorders.push(itemId);
    }

    // Save with retry
    for (let i = 0; i < retries; i++) {
      try {
        await kv.set(`user:${user.id}`, userData);
        break;
      } catch (error: any) {
        lastError = error;
        console.warn(`Purchase - KV set attempt ${i + 1}/${retries} failed:`, error.message);
        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, i)));
        } else {
          throw error;
        }
      }
    }

    return c.json({ 
      success: true,
      currency: userData.currency,
      ownedSkins: userData.ownedSkins,
      ownedBorders: userData.ownedBorders,
    });
  } catch (error) {
    console.error("Purchase item error:", error);
    return c.json({ error: "Internal server error while purchasing item" }, 500);
  }
});

// Shop - Gacha roll
app.post("/make-server-7fcff8d3/shop/gacha", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const GACHA_COST_RUBY = 100; // Changed to use Ruby

    const userData = await kv.get(`user:${user.id}`);
    
    if (!userData) {
      return c.json({ error: "User data not found" }, 404);
    }

    // Check Ruby balance instead of coins
    if ((userData.ruby || 0) < GACHA_COST_RUBY) {
      return c.json({ error: "Insufficient Ruby" }, 400);
    }

    // Gacha pool - SKINS ONLY (Zootopia themed)
    const gachaItems = [
      // Legendary (1%)
      { id: 'zootopia', name: 'Zootopia Arena', rarity: 'legendary', type: 'skin', weight: 0.5 },
      { id: 'crystal', name: 'Crystal Dream', rarity: 'legendary', type: 'skin', weight: 0.5 },
      { id: 'zootopia_nick', name: '🦊 Nick Wilde Border', rarity: 'legendary', type: 'border', weight: 0.5 },
      // Epic (5%)
      { id: 'ocean', name: 'Deep Ocean', rarity: 'epic', type: 'skin', weight: 2 },
      { id: 'sunset', name: 'Golden Sunset', rarity: 'epic', type: 'skin', weight: 1.5 },
      { id: 'zootopia_judy', name: '🐰 Judy Hopps Border', rarity: 'epic', type: 'border', weight: 1 },
      { id: 'zootopia_steampunk', name: '⚙️ Zootopia Steampunk', rarity: 'epic', type: 'border', weight: 1 },
      // Rare (20%)
      { id: 'aurora', name: 'Aurora Borealis', rarity: 'rare', type: 'skin', weight: 20 },
      // Common (73.5%)
      { id: 'cosmic', name: 'Cosmic Void', rarity: 'common', type: 'skin', weight: 73.5 },
    ];

    // Random selection based on weights
    const totalWeight = gachaItems.reduce((sum, item) => sum + item.weight, 0);
    let random = Math.random() * totalWeight;
    
    let selectedItem = gachaItems[0];
    for (const item of gachaItems) {
      random -= item.weight;
      if (random <= 0) {
        selectedItem = item;
        break;
      }
    }

    // Deduct Ruby cost
    userData.ruby = (userData.ruby || 0) - GACHA_COST_RUBY;

    // Check if already owned based on item type
    let isNew = false;
    if (selectedItem.type === 'skin') {
      isNew = !userData.ownedSkins.includes(selectedItem.id);
      if (isNew) {
        userData.ownedSkins.push(selectedItem.id);
      } else {
        // Refund 50 coins for duplicates
        userData.currency = (userData.currency || 0) + 50;
      }
    } else if (selectedItem.type === 'border') {
      isNew = !userData.ownedBorders.includes(selectedItem.id);
      if (isNew) {
        userData.ownedBorders.push(selectedItem.id);
      } else {
        // Refund 50 coins for duplicates
        userData.currency = (userData.currency || 0) + 50;
      }
    }

    await kv.set(`user:${user.id}`, userData);

    return c.json({
      success: true,
      item: selectedItem,
      isNew,
      currency: userData.currency,
      ruby: userData.ruby,
      ownedSkins: userData.ownedSkins,
      ownedBorders: userData.ownedBorders,
    });
  } catch (error) {
    console.error("Gacha roll error:", error);
    return c.json({ error: "Internal server error while rolling gacha" }, 500);
  }
});

// Shop - Multi Gacha roll (10x)
app.post("/make-server-7fcff8d3/shop/gacha-multi", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { count = 10 } = await c.req.json();
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const GACHA_COST_PER_ROLL = 100;
    const DISCOUNT_10X = 100; // Save 100 Ruby for 10x roll
    const TOTAL_COST = (GACHA_COST_PER_ROLL * count) - DISCOUNT_10X; // 900 Ruby for 10x

    const userData = await kv.get(`user:${user.id}`);
    
    if (!userData) {
      return c.json({ error: "User data not found" }, 404);
    }

    // Check Ruby balance
    if ((userData.ruby || 0) < TOTAL_COST) {
      return c.json({ error: `Insufficient Ruby (need ${TOTAL_COST})` }, 400);
    }

    // Gacha pool - same as single gacha
    const gachaItems = [
      // Legendary (1%)
      { id: 'zootopia', name: 'Zootopia Arena', rarity: 'legendary', type: 'skin', weight: 0.5 },
      { id: 'crystal', name: 'Crystal Dream', rarity: 'legendary', type: 'skin', weight: 0.5 },
      { id: 'zootopia_nick', name: '🦊 Nick Wilde Border', rarity: 'legendary', type: 'border', weight: 0.5 },
      // Epic (5%)
      { id: 'ocean', name: 'Deep Ocean', rarity: 'epic', type: 'skin', weight: 2 },
      { id: 'sunset', name: 'Golden Sunset', rarity: 'epic', type: 'skin', weight: 1.5 },
      { id: 'zootopia_judy', name: '🐰 Judy Hopps Border', rarity: 'epic', type: 'border', weight: 1 },
      { id: 'zootopia_steampunk', name: '⚙️ Zootopia Steampunk', rarity: 'epic', type: 'border', weight: 1 },
      // Rare (20%)
      { id: 'aurora', name: 'Aurora Borealis', rarity: 'rare', type: 'skin', weight: 20 },
      // Common (73.5%)
      { id: 'cosmic', name: 'Cosmic Void', rarity: 'common', type: 'skin', weight: 73.5 },
    ];

    const totalWeight = gachaItems.reduce((sum, item) => sum + item.weight, 0);
    
    // Deduct Ruby cost first
    userData.ruby = (userData.ruby || 0) - TOTAL_COST;

    // Roll multiple times
    const results = [];
    for (let i = 0; i < count; i++) {
      // Random selection based on weights
      let random = Math.random() * totalWeight;
      
      let selectedItem = gachaItems[0];
      for (const item of gachaItems) {
        random -= item.weight;
        if (random <= 0) {
          selectedItem = item;
          break;
        }
      }

      // Check if already owned based on item type
      let isNew = false;
      if (selectedItem.type === 'skin') {
        isNew = !userData.ownedSkins.includes(selectedItem.id);
        if (isNew) {
          userData.ownedSkins.push(selectedItem.id);
        } else {
          // Refund 50 coins for duplicates
          userData.currency = (userData.currency || 0) + 50;
        }
      } else if (selectedItem.type === 'border') {
        isNew = !userData.ownedBorders.includes(selectedItem.id);
        if (isNew) {
          userData.ownedBorders.push(selectedItem.id);
        } else {
          // Refund 50 coins for duplicates
          userData.currency = (userData.currency || 0) + 50;
        }
      }

      results.push({
        item: selectedItem,
        isNew,
      });
    }

    await kv.set(`user:${user.id}`, userData);

    return c.json({
      success: true,
      items: results,
      count: results.length,
      currency: userData.currency,
      ruby: userData.ruby,
      ownedSkins: userData.ownedSkins,
      ownedBorders: userData.ownedBorders,
    });
  } catch (error) {
    console.error("Multi Gacha roll error:", error);
    return c.json({ error: "Internal server error while rolling multi gacha" }, 500);
  }
});

// Add top-up routes
app.route("/make-server-7fcff8d3/topup", topupRoutes);

// Add blockchain routes
app.route("/make-server-7fcff8d3/blockchain", blockchainRoutes);

// Add admin routes
app.route("/make-server-7fcff8d3/admin", adminRoutes);

// Add redeem routes
app.route("/make-server-7fcff8d3/redeem", redeemRoutes);

// Add music routes
app.route("/make-server-7fcff8d3/music", musicRoutes);

Deno.serve(app.fetch);