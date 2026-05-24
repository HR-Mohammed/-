import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { google } from "googleapis";
import multer from "multer";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import os from "os";
import { Readable } from "stream";

dotenv.config();

const app = express();
const PORT = 3000;
const upload = multer({ dest: os.tmpdir() });

// Supabase Setup
const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || ""; 
const supabase = createClient(supabaseUrl, supabaseKey);

// Google OAuth Setup
const appUrl = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${appUrl}/auth/callback`
);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 1. Get Google Auth URL
app.get("/api/auth/google/url", (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/drive.file"],
    prompt: "consent",
  });
  res.json({ url });
});

// 2. OAuth Callback
app.get("/auth/callback", async (req, res) => {
  const { code, state } = req.query;
  try {
    const { tokens } = await oauth2Client.getToken(code as string);
    console.log("Tokens received:", { 
      access_token: tokens.access_token ? "yes" : "no", 
      refresh_token: tokens.refresh_token ? "yes" : "no",
      expiry_date: tokens.expiry_date 
    });
    
    // We need to know WHICH user this is. 
    // In a real app, we'd use a session cookie or state.
    // For this demo, we'll return the refresh token to the client 
    // so they can update their profile, or handle it here if we have user info.
    
    res.send(`
      <html>
        <body>
          <script>
            window.opener.postMessage({ 
              type: "GOOGLE_AUTH_SUCCESS", 
              tokens: ${JSON.stringify(tokens)} 
            }, "*");
          </script>
          <div style="font-family: sans-serif; text-align: center; padding: 20px;">
            <p>تم الربط بنجاح!</p>
            <p>يمكنك إغلاق هذه النافذة الآن والعودة إلى التطبيق.</p>
            ${!tokens.refresh_token ? '<p style="color: red;">تنبيه: لم يتم استلام "Refresh Token". إذا واجهت مشكلة، يرجى فك الارتباط من إعدادات جوجل وإعادة المحاولة.</p>' : ''}
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("OAuth Error:", error);
    res.status(500).send("Authentication failed");
  }
});

// 3. Upload to Google Drive Proxy
app.post("/api/drive/upload", async (req, res) => {
  const { refreshToken, fileName, mimeType, fileData } = req.body;

  if (!fileData || !refreshToken) {
    return res.status(400).json({ error: "Missing fileData or refresh token" });
  }

  try {
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    auth.setCredentials({ refresh_token: refreshToken });

    const drive = google.drive({ version: "v3", auth });
    
    const fileMetadata = {
      name: fileName,
    };

    const base64Data = fileData.replace(/^data:.*?;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    
    const media = {
      mimeType: mimeType,
      body: Readable.from(buffer),
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: "id, webViewLink, webContentLink",
    });

    const fileId = response.data.id;
    const embedLink = `https://drive.google.com/file/d/${fileId}/preview`;
    
    if (fileId) {
      try {
        await drive.permissions.create({
          fileId: fileId,
          requestBody: {
            role: 'reader',
            type: 'anyone',
          },
        });
        console.log(`Permissions updated for file: ${fileId}`);
      } catch (permError) {
        console.error("Error setting permissions:", permError);
      }
    }

    res.json({
      ...response.data,
      webViewLink: embedLink
    });
  } catch (error: any) {
    console.error("Drive Upload Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/admin/update-password", async (req, res) => {
  const { userId, newPassword } = req.body;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!serviceRoleKey) {
    return res.status(500).json({ error: "الرجاء إضافة SUPABASE_SERVICE_ROLE_KEY في المتغيرات البيئية للمشروع لتفعيل هذه الميزة (Settings -> Environment Variables)" });
  }

  try {
    const adminSupabase = createClient(process.env.VITE_SUPABASE_URL || "", serviceRoleKey);
    const { data, error } = await adminSupabase.auth.admin.updateUserById(userId, { password: newPassword });
    
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

async function startServer() {
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: err.message || "Internal Server Error" });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
