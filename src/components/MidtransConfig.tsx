import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react';

interface MidtransConfigProps {
  accessToken: string;
}

export function MidtransConfig({ accessToken }: MidtransConfigProps) {
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<any>(null);

  const checkConfig = async () => {
    setLoading(true);
    try {
      const { projectId } = await import('../utils/supabase/info');
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7fcff8d3/topup/config-check`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      const data = await response.json();
      console.log('🔧 Midtrans Configuration:', data);
      setConfig(data);
    } catch (error) {
      console.error('Config check error:', error);
      setConfig({ error: 'Failed to check configuration' });
    } finally {
      setLoading(false);
    }
  };

  const isValidServerKey = (prefix: string) => {
    // For sandbox, keys start with "SB-Mid-server-"
    // For production, keys start with "Mid-server-"
    return prefix.startsWith('SB-Mid-server-') || prefix.startsWith('Mid-server-');
  };

  const isValidClientKey = (prefix: string) => {
    // For sandbox, keys start with "SB-Mid-client-"
    // For production, keys start with "Mid-client-"
    return prefix.startsWith('SB-Mid-client-') || prefix.startsWith('Mid-client-');
  };

  return (
    <Card className="border-white/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🔧 Midtrans Configuration Check
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={checkConfig}
          disabled={loading}
          className="w-full"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Check Configuration
        </Button>

        {config && !config.error && (
          <div className="space-y-3">
            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="text-sm text-gray-400 mb-1">Environment</div>
              <div className="flex items-center gap-2">
                <span className="font-mono">{config.environment}</span>
                {config.environment === 'SANDBOX' ? (
                  <span className="text-yellow-400">✓ Test Mode</span>
                ) : (
                  <span className="text-green-400">✓ Production</span>
                )}
              </div>
            </div>

            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="text-sm text-gray-400 mb-1">API URL</div>
              <div className="font-mono text-sm break-all">{config.api_url}</div>
            </div>

            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="text-sm text-gray-400 mb-1">Server Key</div>
              <div className="flex items-center gap-2">
                {config.server_key_set ? (
                  <>
                    {isValidServerKey(config.server_key_prefix) ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="font-mono text-sm">{config.server_key_prefix}...</span>
                    {isValidServerKey(config.server_key_prefix) ? (
                      <span className="text-green-400 text-sm">✓ Valid</span>
                    ) : (
                      <span className="text-red-400 text-sm">✗ Invalid Format</span>
                    )}
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span className="text-red-400">NOT SET</span>
                  </>
                )}
              </div>
              {config.server_key_set && !isValidServerKey(config.server_key_prefix) && (
                <div className="mt-2 p-3 bg-red-500/10 border border-red-500/30 rounded text-sm text-red-400">
                  ⚠️ Invalid Server Key format!
                  <br />
                  <div className="mt-2 space-y-1">
                    <div>For <strong>Production</strong>: Should start with <code className="text-pink-400">Mid-server-</code></div>
                    <div>For <strong>Sandbox</strong> (testing): Should start with <code className="text-pink-400">SB-Mid-server-</code></div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="text-sm text-gray-400 mb-1">Client Key</div>
              <div className="flex items-center gap-2">
                {config.client_key_set ? (
                  <>
                    {isValidClientKey(config.client_key_prefix) ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="font-mono text-sm">{config.client_key_prefix}...</span>
                    {isValidClientKey(config.client_key_prefix) ? (
                      <span className="text-green-400 text-sm">✓ Valid</span>
                    ) : (
                      <span className="text-red-400 text-sm">✗ Invalid Format</span>
                    )}
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span className="text-red-400">NOT SET</span>
                  </>
                )}
              </div>
              {config.client_key_set && !isValidClientKey(config.client_key_prefix) && (
                <div className="mt-2 p-3 bg-red-500/10 border border-red-500/30 rounded text-sm text-red-400">
                  ⚠️ Invalid Client Key format!
                  <br />
                  <div className="mt-2 space-y-1">
                    <div>For <strong>Sandbox</strong> (testing): Should start with <code className="text-pink-400">SB-Mid-client-</code></div>
                    <div>For <strong>Production</strong>: Should start with <code className="text-pink-400">Mid-client-</code></div>
                  </div>
                </div>
              )}
            </div>

            {/* Summary */}
            {config.server_key_set && config.client_key_set && 
             isValidServerKey(config.server_key_prefix) && 
             isValidClientKey(config.client_key_prefix) ? (
              <div className="p-4 bg-green-500/10 border border-green-500/30 rounded">
                <div className="flex items-center gap-2 text-green-400">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-semibold">Configuration is correct!</span>
                </div>
                <div className="text-sm text-gray-300 mt-1">
                  Your Midtrans integration is properly configured.
                </div>
              </div>
            ) : (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded">
                <div className="flex items-center gap-2 text-red-400">
                  <XCircle className="h-5 w-5" />
                  <span className="font-semibold">Configuration has issues</span>
                </div>
                <div className="text-sm text-gray-300 mt-2">
                  Please update environment variables in Supabase Dashboard:
                  <ul className="list-disc list-inside mt-2 space-y-1 text-xs">
                    <li key="server-key">
                      <code className="text-pink-400">MIDTRANS_SERVER_KEY</code> = 
                      Get from <a href="https://dashboard.sandbox.midtrans.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">Sandbox Dashboard</a> 
                      → Settings → Access Keys (starts with <code className="text-yellow-400">SB-Mid-server-</code>)
                    </li>
                    <li key="client-key">
                      <code className="text-pink-400">MIDTRANS_CLIENT_KEY</code> = 
                      Get from <a href="https://dashboard.sandbox.midtrans.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">Sandbox Dashboard</a> 
                      → Settings → Access Keys (starts with <code className="text-yellow-400">SB-Mid-client-</code>)
                    </li>
                    <li key="is-production"><code className="text-pink-400">MIDTRANS_IS_PRODUCTION</code> = <code className="text-pink-400">false</code> (for testing)</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {config?.error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded text-red-400">
            {config.error}
          </div>
        )}

        <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded text-sm">
          <div className="text-blue-400 font-semibold mb-2">📚 How to Update:</div>
          <ol className="list-decimal list-inside space-y-1 text-gray-300">
            <li key="step-1">Go to Supabase Dashboard → Settings → Edge Functions</li>
            <li key="step-2">Scroll to "Secrets" section</li>
            <li key="step-3">Update the environment variables with correct Midtrans keys</li>
            <li key="step-4">Click "Save" and wait a few seconds</li>
            <li key="step-5">Click "Check Configuration" above to verify</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}