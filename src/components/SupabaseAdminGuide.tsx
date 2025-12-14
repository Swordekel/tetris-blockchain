import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { 
  Database,
  Code,
  Copy,
  CheckCircle,
  AlertTriangle,
  Shield,
  Table,
  Terminal,
  Users,
  Eye
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { useState } from 'react';

export function SupabaseAdminGuide() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const sqlQueries = {
    step1: `-- STEP 1: Get User ID from email
SELECT id, email, raw_user_meta_data->>'name' as name
FROM auth.users
WHERE email = 'YOUR_EMAIL@gmail.com';  -- GANTI EMAIL INI`,

    step2: `-- STEP 2: Promote to admin
INSERT INTO kv_store_7fcff8d3 (key, value, created_at, updated_at)
VALUES (
  'admin:YOUR_USER_ID_HERE',  -- Ganti dengan User ID dari step 1
  '{"role":"admin","promotedAt":' || (extract(epoch from now()) * 1000)::bigint || '}',
  NOW(),
  NOW()
)
ON CONFLICT (key) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();`,

    complete: `-- COMPLETE SCRIPT: Promote by email (All-in-one)
DO $$
DECLARE
  user_id_var uuid;
  user_email text := 'YOUR_EMAIL@gmail.com';  -- GANTI INI
BEGIN
  SELECT id INTO user_id_var
  FROM auth.users
  WHERE email = user_email;
  
  IF user_id_var IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', user_email;
  END IF;
  
  INSERT INTO kv_store_7fcff8d3 (key, value, created_at, updated_at)
  VALUES (
    'admin:' || user_id_var,
    '{"role":"admin","promotedAt":' || (extract(epoch from now()) * 1000)::bigint || '}',
    NOW(),
    NOW()
  )
  ON CONFLICT (key) 
  DO UPDATE SET 
    value = EXCLUDED.value,
    updated_at = NOW();
  
  RAISE NOTICE 'User % promoted to admin!', user_email;
END $$;`,

    verify: `-- Verify admin status
SELECT 
  k.key,
  u.email,
  u.raw_user_meta_data->>'name' as username,
  k.created_at as admin_since
FROM kv_store_7fcff8d3 k
JOIN auth.users u ON k.key = 'admin:' || u.id::text
WHERE k.key LIKE 'admin:%'
ORDER BY k.created_at DESC;`,

    remove: `-- Remove admin access
DELETE FROM kv_store_7fcff8d3
WHERE key = 'admin:YOUR_USER_ID_HERE';  -- Ganti dengan User ID`,

    listAll: `-- List all users with admin status
SELECT 
  u.id,
  u.email,
  u.raw_user_meta_data->>'name' as username,
  CASE 
    WHEN k.key IS NOT NULL THEN '✅ ADMIN'
    ELSE '👤 USER'
  END as role
FROM auth.users u
LEFT JOIN kv_store_7fcff8d3 k ON k.key = 'admin:' || u.id::text
ORDER BY u.created_at DESC;`,
  };

  const CodeBlock = ({ code, label, id }: { code: string; label: string; id: string }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-purple-400">{label}</p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => copyToClipboard(code, id)}
          className="h-7 gap-2"
        >
          {copiedId === id ? (
            <>
              <CheckCircle className="h-3 w-3" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              Copy
            </>
          )}
        </Button>
      </div>
      <div className="bg-black rounded-lg p-4 overflow-x-auto">
        <pre className="text-xs text-green-400 font-mono whitespace-pre">
          {code}
        </pre>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <Database className="h-12 w-12 text-blue-500" />
          <h1 className="text-4xl bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Promote Admin via Supabase
          </h1>
        </div>
        <p className="text-white/60">
          Gunakan Supabase Dashboard untuk membuat user menjadi admin
        </p>
      </div>

      {/* Method 1: SQL Editor (Recommended) */}
      <Card className="border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-cyan-500/10">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Badge className="bg-green-500">RECOMMENDED</Badge>
            <Terminal className="h-5 w-5 text-blue-400" />
            <CardTitle>Method 1: SQL Editor (Paling Mudah)</CardTitle>
          </div>
          <CardDescription>Gunakan SQL query untuk promote user otomatis</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* All-in-One Script */}
          <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/30 rounded-lg p-4 space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <h3 className="font-semibold">✨ All-in-One Script (EASIEST)</h3>
            </div>
            
            <div className="space-y-3">
              <p className="text-sm text-white/70">
                Script ini otomatis mencari user berdasarkan email dan promote jadi admin:
              </p>
              
              <CodeBlock
                code={sqlQueries.complete}
                label="Complete Promote Script"
                id="complete"
              />

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                <p className="text-sm font-semibold mb-2 text-blue-400">📝 Cara Pakai:</p>
                <ol className="text-sm text-white/70 space-y-1 list-decimal list-inside">
                  <li>Buka <strong>Supabase Dashboard</strong> → Project Anda</li>
                  <li>Klik <strong>"SQL Editor"</strong> di sidebar</li>
                  <li>Klik <strong>"New Query"</strong></li>
                  <li><strong>Copy-paste</strong> script di atas</li>
                  <li>Ganti <code className="bg-white/10 px-1 rounded">YOUR_EMAIL@gmail.com</code> dengan email yang ingin di-promote</li>
                  <li>Klik <strong>"RUN"</strong> (atau Ctrl+Enter)</li>
                  <li>✅ Done! Logout & login lagi untuk lihat Shield icon</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Step-by-Step */}
          <div className="space-y-4">
            <h3 className="font-semibold text-white/90">Atau Pakai Step-by-Step:</h3>
            
            <div className="space-y-4">
              <CodeBlock
                code={sqlQueries.step1}
                label="Step 1: Get User ID"
                id="step1"
              />
              
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 flex items-start gap-2">
                <Eye className="h-4 w-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-300">
                  Jalankan query ini dulu, lalu <strong>copy User ID</strong> dari hasil
                </p>
              </div>

              <CodeBlock
                code={sqlQueries.step2}
                label="Step 2: Promote to Admin"
                id="step2"
              />

              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-green-300">
                  Ganti <code className="bg-white/10 px-1 rounded">YOUR_USER_ID_HERE</code> dengan User ID dari Step 1, lalu RUN
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Method 2: Table Editor */}
      <Card className="border-white/10">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Table className="h-5 w-5 text-purple-400" />
            <CardTitle>Method 2: Table Editor (Manual)</CardTitle>
          </div>
          <CardDescription>Insert data secara manual via UI</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Step 1 */}
            <div className="bg-white/5 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-purple-400 font-semibold">
                <Users className="h-4 w-4" />
                <span>Step 1: Get User ID</span>
              </div>
              <ol className="text-sm text-white/70 space-y-1 list-decimal list-inside">
                <li>Buka <strong>Authentication</strong> → <strong>Users</strong></li>
                <li>Cari user yang ingin di-promote</li>
                <li>Klik pada user</li>
                <li>Copy <strong>UID</strong> (User ID)</li>
              </ol>
            </div>

            {/* Step 2 */}
            <div className="bg-white/5 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-purple-400 font-semibold">
                <Table className="h-4 w-4" />
                <span>Step 2: Insert to Table</span>
              </div>
              <ol className="text-sm text-white/70 space-y-1 list-decimal list-inside">
                <li>Buka <strong>Table Editor</strong></li>
                <li>Cari table: <code className="bg-white/10 px-1 rounded">kv_store_7fcff8d3</code></li>
                <li>Klik <strong>"Insert row"</strong></li>
                <li>Isi data (lihat di bawah)</li>
              </ol>
            </div>
          </div>

          {/* Table Fields */}
          <div className="bg-black/30 rounded-lg p-4 space-y-3">
            <p className="text-sm font-semibold text-purple-400">Fields untuk Insert:</p>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <span className="text-white/60 w-24 flex-shrink-0">key:</span>
                <code className="bg-white/10 px-2 py-1 rounded flex-1">
                  admin:YOUR_USER_ID_HERE
                </code>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-white/60 w-24 flex-shrink-0">value:</span>
                <code className="bg-white/10 px-2 py-1 rounded flex-1 text-xs">
                  {`{"role":"admin","promotedAt":1702561200000}`}
                </code>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-white/60 w-24 flex-shrink-0">created_at:</span>
                <span className="text-white/40">NOW() or auto-fill</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-white/60 w-24 flex-shrink-0">updated_at:</span>
                <span className="text-white/40">NOW() or auto-fill</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Verification & Management */}
      <Card className="border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-green-400" />
            Verification & Management
          </CardTitle>
          <CardDescription>Query untuk cek dan manage admin</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <CodeBlock
            code={sqlQueries.verify}
            label="✅ Verify Admin Status"
            id="verify"
          />

          <CodeBlock
            code={sqlQueries.listAll}
            label="📋 List All Users with Role"
            id="listAll"
          />

          <CodeBlock
            code={sqlQueries.remove}
            label="❌ Remove Admin Access"
            id="remove"
          />
        </CardContent>
      </Card>

      {/* Troubleshooting */}
      <Card className="border-red-500/30 bg-gradient-to-br from-red-500/10 to-orange-500/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            Troubleshooting
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="bg-white/5 rounded-lg p-3">
              <p className="font-semibold text-red-400 mb-1">❌ Shield icon tidak muncul</p>
              <p className="text-white/60">
                → Logout dan login lagi<br />
                → Hard refresh (Ctrl+Shift+R)<br />
                → Clear browser cache
              </p>
            </div>

            <div className="bg-white/5 rounded-lg p-3">
              <p className="font-semibold text-red-400 mb-1">❌ User not found</p>
              <p className="text-white/60">
                → Pastikan user sudah register<br />
                → Cek email benar (case-sensitive)<br />
                → Lihat di Authentication → Users
              </p>
            </div>

            <div className="bg-white/5 rounded-lg p-3">
              <p className="font-semibold text-red-400 mb-1">❌ Table not found</p>
              <p className="text-white/60">
                → Table <code className="bg-white/10 px-1 rounded">kv_store_7fcff8d3</code> belum ada<br />
                → Jalankan website dulu untuk auto-create<br />
                → Atau create manual via SQL
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Success Checklist */}
      <Card className="border-green-500/30 bg-gradient-to-br from-green-500/10 to-blue-500/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-400" />
            Success Checklist
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-400" />
              <span>Shield icon (🛡️) muncul di navbar setelah login</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-400" />
              <span>Admin Panel bisa dibuka dengan klik Shield</span>
            </li>
            <li className="flex items-center gap-2">
              <Database className="h-4 w-4 text-green-400" />
              <span>Row <code className="bg-white/10 px-1 rounded">admin:USER_ID</code> ada di table</span>
            </li>
            <li className="flex items-center gap-2">
              <Users className="h-4 w-4 text-green-400" />
              <span>Bisa akses Dashboard, Users, dan Redeem Codes tab</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
