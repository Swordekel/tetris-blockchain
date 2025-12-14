/**
 * 🛡️ TETRIS ARENA - ADMIN SETUP SCRIPT
 * 
 * Cara pakai:
 * 1. Buka website Tetris Arena
 * 2. Buka Browser DevTools (F12)
 * 3. Buka tab Console
 * 4. Copy-paste seluruh file ini ke console
 * 5. Tekan Enter
 * 6. Ikuti instruksi yang muncul
 */

(function() {
  console.log(`
  ╔════════════════════════════════════════════════╗
  ║   🛡️  TETRIS ARENA - ADMIN SETUP TOOL  🛡️    ║
  ╚════════════════════════════════════════════════╝
  `);

  console.log('📋 Available Commands:\n');
  console.log('1. setupDefaultAdmin()    - Login sebagai admin default');
  console.log('2. promoteUser(email)     - Promote user jadi admin');
  console.log('3. checkAdminStatus()     - Cek apakah user saat ini admin');
  console.log('4. getProjectId()         - Lihat Project ID Supabase');
  console.log('5. showAdminGuide()       - Tampilkan panduan lengkap\n');

  // Get Project ID from current page
  window.getProjectId = function() {
    const scripts = document.querySelectorAll('script[src*="supabase"]');
    for (let script of scripts) {
      const match = script.src.match(/([a-z0-9]+)\.supabase\.co/);
      if (match) {
        console.log('✅ Project ID:', match[1]);
        return match[1];
      }
    }
    
    // Try to get from info.tsx
    try {
      const projectId = window.localStorage.getItem('supabase.project_id');
      if (projectId) {
        console.log('✅ Project ID:', projectId);
        return projectId;
      }
    } catch (e) {}
    
    console.warn('⚠️ Project ID not found automatically');
    const manualId = prompt('Please enter your Supabase Project ID:');
    return manualId;
  };

  // Setup Default Admin Account
  window.setupDefaultAdmin = async function() {
    console.log('🔄 Setting up default admin account...\n');
    console.log('Default credentials:');
    console.log('Email: admin12345@gmail.com');
    console.log('Password: admin12345\n');

    const projectId = getProjectId();
    if (!projectId) {
      console.error('❌ Cannot proceed without Project ID');
      return;
    }

    try {
      // Import Supabase client
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
      
      const supabaseUrl = `https://${projectId}.supabase.co`;
      const supabaseAnonKey = prompt('Enter your Supabase Anon Key:');
      
      if (!supabaseAnonKey) {
        console.error('❌ Anon key is required');
        return;
      }

      const supabase = createClient(supabaseUrl, supabaseAnonKey);

      // Try to sign in
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'admin12345@gmail.com',
        password: 'admin12345'
      });

      if (error) {
        console.error('❌ Login failed:', error.message);
        console.log('ℹ️  Account might not exist. Please create it first.');
        return;
      }

      console.log('✅ Successfully logged in as admin!');
      console.log('🔄 Refreshing page...');
      
      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } catch (error) {
      console.error('❌ Setup error:', error);
    }
  };

  // Promote User to Admin
  window.promoteUser = async function(email) {
    if (!email) {
      email = prompt('Enter email to promote:');
      if (!email) {
        console.error('❌ Email is required');
        return;
      }
    }

    const secretKey = prompt('Enter admin secret key:', 'TETRIS_ADMIN_SECRET_2024');
    if (!secretKey) {
      console.error('❌ Secret key is required');
      return;
    }

    const projectId = getProjectId();
    if (!projectId) {
      console.error('❌ Cannot proceed without Project ID');
      return;
    }

    console.log(`🔄 Promoting ${email} to admin...`);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7fcff8d3/promote-admin`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: email,
            secretKey: secretKey
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error('❌ Promotion failed:', data.error || 'Unknown error');
        return;
      }

      console.log('✅ User promoted successfully!');
      console.log('User ID:', data.userId);
      console.log('🔄 Please refresh the page if this is your account');

      const shouldRefresh = confirm('Refresh page now?');
      if (shouldRefresh) {
        window.location.reload();
      }

    } catch (error) {
      console.error('❌ Promotion error:', error);
    }
  };

  // Check Admin Status
  window.checkAdminStatus = async function() {
    const projectId = getProjectId();
    if (!projectId) {
      console.error('❌ Cannot proceed without Project ID');
      return;
    }

    // Try to get access token from localStorage
    const storageKey = `sb-${projectId}-auth-token`;
    const authData = localStorage.getItem(storageKey);
    
    if (!authData) {
      console.warn('⚠️ Not logged in');
      return;
    }

    const { access_token } = JSON.parse(authData);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7fcff8d3/check-admin`,
        {
          headers: {
            'Authorization': `Bearer ${access_token}`
          }
        }
      );

      const data = await response.json();

      console.log('👤 Current User:');
      console.log('Email:', data.email);
      console.log('User ID:', data.userId);
      console.log('Is Admin:', data.isAdmin ? '✅ YES' : '❌ NO');

    } catch (error) {
      console.error('❌ Check status error:', error);
    }
  };

  // Show Admin Guide
  window.showAdminGuide = function() {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║            🛡️  TETRIS ARENA ADMIN GUIDE  🛡️              ║
╚═══════════════════════════════════════════════════════════╝

📌 DEFAULT ADMIN ACCOUNT
   Email:    admin12345@gmail.com
   Password: admin12345

📌 HOW TO LOGIN AS ADMIN
   1. Run: setupDefaultAdmin()
   2. Or login manually with credentials above
   3. Shield icon (🛡️) will appear in navbar
   4. Click shield icon to open Admin Panel

📌 HOW TO PROMOTE USER TO ADMIN
   Option A - Using Console:
   1. Run: promoteUser('user@email.com')
   2. Enter secret key: TETRIS_ADMIN_SECRET_2024
   3. Refresh page

   Option B - Using API:
   POST https://[PROJECT_ID].supabase.co/functions/v1/make-server-7fcff8d3/promote-admin
   Body: {
     "email": "user@email.com",
     "secretKey": "TETRIS_ADMIN_SECRET_2024"
   }

📌 ADMIN PANEL FEATURES
   ✅ Dashboard Stats (Total Users, Coins, Ruby, Active Players)
   ✅ User Management (View, Search, Adjust Currency)
   ✅ Redeem Code System (Create, View, Delete codes)

📌 CREATE REDEEM CODE
   1. Open Admin Panel (Shield icon)
   2. Go to "Redeem Codes" tab
   3. Fill in code details:
      - Code: Unique code (e.g., WELCOME2024)
      - Type: coins or ruby
      - Amount: Reward amount
      - Max Uses: How many times can be used
      - Expiry: Optional expiration date
   4. Click "Create Code"

📌 ADJUST USER CURRENCY
   1. Open Admin Panel → "Users" tab
   2. Search for user
   3. Click "Adjust Currency"
   4. Select type (Coins/Ruby)
   5. Enter amount (+/-)
   6. Enter reason
   7. Save

📌 TROUBLESHOOTING
   - Shield icon not showing?
     → Logout and login again
     → Run: checkAdminStatus()
     → Verify with promoteUser()
   
   - Admin Panel not loading?
     → Check console for errors
     → Verify access token is valid
     → Check network tab (F12)

📌 SECURITY TIPS
   ✅ Change admin password after first login
   ✅ Keep secret key private
   ✅ Don't share admin credentials
   ✅ Monitor admin actions via logs

📌 SUPPORT
   - View full guide: /ADMIN_GUIDE.md
   - Check AdminPanel code: /components/AdminPanel.tsx
   - Check backend code: /supabase/functions/server/admin.tsx

╚═══════════════════════════════════════════════════════════╝
    `);
  };

  // Auto-show guide
  console.log('ℹ️  Run showAdminGuide() to see full instructions\n');
  console.log('🚀 Quick Start:');
  console.log('   → setupDefaultAdmin()    (Login as admin)');
  console.log('   → promoteUser()          (Promote any user)');
  console.log('   → checkAdminStatus()     (Check current status)\n');

})();
