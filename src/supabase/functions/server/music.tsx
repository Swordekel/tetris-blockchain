import { Hono } from "npm:hono@4";
import { cors } from "npm:hono/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

const music = new Hono();

// CORS middleware
music.use("/*", cors());

// Bucket name for music storage
const MUSIC_BUCKET = "make-7fcff8d3-music";

// Helper: Check if user is admin
async function isAdmin(accessToken: string): Promise<{ isAdmin: boolean; userId?: string }> {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !user) {
      return { isAdmin: false };
    }

    const adminData = await kv.get(`admin:${user.id}`);
    return { 
      isAdmin: adminData && adminData.role === 'admin',
      userId: user.id
    };
  } catch (error) {
    console.error('Admin check error:', error);
    return { isAdmin: false };
  }
}

// Helper: Ensure music bucket exists
async function ensureMusicBucket(supabase: any) {
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some((bucket: any) => bucket.name === MUSIC_BUCKET);

    if (!bucketExists) {
      console.log(`📦 Creating music bucket: ${MUSIC_BUCKET}`);
      const { error } = await supabase.storage.createBucket(MUSIC_BUCKET, {
        public: true, // Make it public so audio can be played directly
        fileSizeLimit: 52428800, // 50MB limit per file
        allowedMimeTypes: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm']
      });

      if (error) {
        console.error('❌ Failed to create bucket:', error);
        throw error;
      }
      
      console.log('✅ Music bucket created successfully');
    }
  } catch (error) {
    console.error('Bucket creation error:', error);
    throw error;
  }
}

// GET /admin/music - List all uploaded music
music.get("/admin/music", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { isAdmin: userIsAdmin } = await isAdmin(accessToken);
    
    if (!userIsAdmin) {
      return c.json({ error: 'Admin access required' }, 403);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Ensure bucket exists
    await ensureMusicBucket(supabase);

    // List all files in music bucket
    const { data: files, error } = await supabase.storage
      .from(MUSIC_BUCKET)
      .list('', {
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (error) {
      console.error('List music error:', error);
      return c.json({ error: error.message }, 500);
    }

    // Get public URLs for each file
    const musicList = (files || []).map((file: any) => {
      const { data: urlData } = supabase.storage
        .from(MUSIC_BUCKET)
        .getPublicUrl(file.name);

      return {
        id: file.id,
        name: file.name,
        displayName: file.name.replace(/\.(mp3|wav|ogg|webm)$/i, '').replace(/_/g, ' '),
        size: file.metadata?.size || 0,
        mimeType: file.metadata?.mimetype || 'audio/mpeg',
        url: urlData.publicUrl,
        createdAt: file.created_at,
        updatedAt: file.updated_at
      };
    });

    // Get music metadata from KV store
    const musicMetadata = await kv.get('music:metadata') || {};

    // Merge with metadata
    const enrichedMusicList = musicList.map((music: any) => ({
      ...music,
      metadata: musicMetadata[music.name] || {}
    }));

    return c.json({ 
      success: true,
      music: enrichedMusicList,
      total: enrichedMusicList.length
    });

  } catch (error: any) {
    console.error('Get music list error:', error);
    return c.json({ error: error.message || 'Failed to get music list' }, 500);
  }
});

// POST /admin/music/upload - Upload music file
music.post("/admin/music/upload", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { isAdmin: userIsAdmin } = await isAdmin(accessToken);
    
    if (!userIsAdmin) {
      return c.json({ error: 'Admin access required' }, 403);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Ensure bucket exists
    await ensureMusicBucket(supabase);

    // Parse form data
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    const displayName = formData.get('displayName') as string;
    const category = formData.get('category') as string || 'general';

    if (!file) {
      return c.json({ error: 'No file provided' }, 400);
    }

    // Validate file type
    const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm'];
    if (!allowedTypes.includes(file.type)) {
      return c.json({ error: 'Invalid file type. Only MP3, WAV, OGG, and WEBM are allowed.' }, 400);
    }

    // Validate file size (50MB max)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return c.json({ error: 'File too large. Maximum size is 50MB.' }, 400);
    }

    // Generate safe filename
    const timestamp = Date.now();
    const ext = file.name.split('.').pop();
    const safeName = file.name
      .replace(/\.[^/.]+$/, '') // Remove extension
      .replace(/[^a-zA-Z0-9]/g, '_') // Replace special chars with underscore
      .toLowerCase();
    const fileName = `${safeName}_${timestamp}.${ext}`;

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const fileData = new Uint8Array(arrayBuffer);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(MUSIC_BUCKET)
      .upload(fileName, fileData, {
        contentType: file.type,
        upsert: false
      });

    if (error) {
      console.error('Upload error:', error);
      return c.json({ error: error.message }, 500);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(MUSIC_BUCKET)
      .getPublicUrl(fileName);

    // Save metadata to KV store
    const musicMetadata = await kv.get('music:metadata') || {};
    musicMetadata[fileName] = {
      displayName: displayName || safeName.replace(/_/g, ' '),
      originalName: file.name,
      category: category,
      uploadedAt: timestamp,
      size: file.size,
      mimeType: file.type
    };
    await kv.set('music:metadata', musicMetadata);

    console.log('✅ Music uploaded:', fileName);

    return c.json({
      success: true,
      message: 'Music uploaded successfully',
      music: {
        name: fileName,
        displayName: displayName || safeName.replace(/_/g, ' '),
        url: urlData.publicUrl,
        size: file.size,
        mimeType: file.type,
        category: category
      }
    });

  } catch (error: any) {
    console.error('Upload music error:', error);
    return c.json({ error: error.message || 'Failed to upload music' }, 500);
  }
});

// DELETE /admin/music/:fileName - Delete music file
music.delete("/admin/music/:fileName", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { isAdmin: userIsAdmin } = await isAdmin(accessToken);
    
    if (!userIsAdmin) {
      return c.json({ error: 'Admin access required' }, 403);
    }

    const fileName = c.req.param('fileName');

    if (!fileName) {
      return c.json({ error: 'File name is required' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Delete from storage
    const { error } = await supabase.storage
      .from(MUSIC_BUCKET)
      .remove([fileName]);

    if (error) {
      console.error('Delete music error:', error);
      return c.json({ error: error.message }, 500);
    }

    // Remove metadata from KV store
    const musicMetadata = await kv.get('music:metadata') || {};
    delete musicMetadata[fileName];
    await kv.set('music:metadata', musicMetadata);

    console.log('✅ Music deleted:', fileName);

    return c.json({
      success: true,
      message: 'Music deleted successfully'
    });

  } catch (error: any) {
    console.error('Delete music error:', error);
    return c.json({ error: error.message || 'Failed to delete music' }, 500);
  }
});

// PUT /admin/music/:fileName/metadata - Update music metadata
music.put("/admin/music/:fileName/metadata", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { isAdmin: userIsAdmin } = await isAdmin(accessToken);
    
    if (!userIsAdmin) {
      return c.json({ error: 'Admin access required' }, 403);
    }

    const fileName = c.req.param('fileName');
    const { displayName, category } = await c.req.json();

    if (!fileName) {
      return c.json({ error: 'File name is required' }, 400);
    }

    // Update metadata in KV store
    const musicMetadata = await kv.get('music:metadata') || {};
    
    if (!musicMetadata[fileName]) {
      musicMetadata[fileName] = {};
    }

    if (displayName) {
      musicMetadata[fileName].displayName = displayName;
    }

    if (category) {
      musicMetadata[fileName].category = category;
    }

    musicMetadata[fileName].updatedAt = Date.now();

    await kv.set('music:metadata', musicMetadata);

    console.log('✅ Music metadata updated:', fileName);

    return c.json({
      success: true,
      message: 'Music metadata updated successfully',
      metadata: musicMetadata[fileName]
    });

  } catch (error: any) {
    console.error('Update music metadata error:', error);
    return c.json({ error: error.message || 'Failed to update metadata' }, 500);
  }
});

export default music;
