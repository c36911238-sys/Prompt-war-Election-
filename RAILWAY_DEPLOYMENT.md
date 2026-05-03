# 🚂 Railway Deployment Guide

This guide walks you through deploying **Prompt-war-Election-** to Railway.

## 🚀 Quick Deploy

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https%3A%2F%2Fgithub.com%2Fc36911238-sys%2FPrompt-war-Election-)

## 📋 Prerequisites

Before deploying, ensure you have:

1. **Google Cloud Project** with these APIs enabled:
   - Vertex AI API
   - Cloud Translation API  
   - Cloud Text-to-Speech API

2. **Firebase Project** configured with:
   - Authentication (Email/Password + Google)
   - Firestore Database
   - Analytics (optional)
   - Remote Config (optional)

3. **Service Account Key** with permissions for the Google Cloud APIs

## 🛠️ Step-by-Step Deployment

### 1. Create Railway Project

1. Go to [railway.app](https://railway.app) and sign in
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose `c36911238-sys/Prompt-war-Election-`

### 2. Configure Environment Variables

In Railway dashboard → **Settings** → **Environment**, add:

#### Google Cloud Configuration
```bash
GOOGLE_CLOUD_PROJECT=your-gcp-project-id
GOOGLE_CREDENTIALS_JSON={"type":"service_account","project_id":"..."}
```

#### Firebase Configuration
```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

### 3. Deploy

Railway automatically:
- Detects Next.js configuration
- Installs dependencies with `npm ci`
- Builds the application with `npm run build`
- Starts the server with `npm start`

## 🔧 Railway Configuration Files

The project includes Railway-optimized configuration:

### `railway.toml`
```toml
[build]
builder = "NIXPACKS"

[deploy]
numReplicas = 1
sleepApplication = false
restartPolicyType = "ON_FAILURE"
```

### `nixpacks.toml`
```toml
[phases.setup]
nixPkgs = ["nodejs-18_x", "npm-9_x"]

[phases.install]
cmds = ["npm ci"]

[phases.build]
cmds = ["npm run build"]

[start]
cmd = "npm start"
```

## 🌐 Custom Domain (Optional)

1. In Railway dashboard → **Settings** → **Domains**
2. Click **"Custom Domain"**
3. Enter your domain (e.g., `election.yourdomain.com`)
4. Update your DNS records as instructed

## 📊 Monitoring

Railway provides built-in monitoring:
- **Metrics**: CPU, Memory, Network usage
- **Logs**: Real-time application logs
- **Deployments**: Build and deployment history

## 🔒 Security Notes

- Environment variables are encrypted at rest
- HTTPS is enabled by default
- Railway handles SSL certificate management
- All Google Cloud credentials stay server-side

## 🐛 Troubleshooting

### Build Failures
- Check Node.js version in `package.json` engines
- Verify all dependencies are in `package.json`
- Review build logs in Railway dashboard

### Runtime Errors
- Check environment variables are set correctly
- Verify Google Cloud service account permissions
- Review application logs in Railway dashboard

### Firebase Connection Issues
- Ensure Firebase project settings match environment variables
- Check Firestore security rules
- Verify Firebase Authentication configuration

## 📞 Support

- **Railway Docs**: [docs.railway.app](https://docs.railway.app)
- **Railway Discord**: [discord.gg/railway](https://discord.gg/railway)
- **Project Issues**: [GitHub Issues](https://github.com/c36911238-sys/Prompt-war-Election-/issues)

---

*Happy deploying! 🚂*