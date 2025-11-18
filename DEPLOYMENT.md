# Deployment Guide for Bulwark 1475

This guide provides detailed instructions for deploying the Bulwark 1475 game to various hosting platforms.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Static Hosting Platforms](#static-hosting-platforms)
  - [GitHub Pages](#github-pages)
  - [Netlify](#netlify)
  - [Vercel](#vercel)
  - [Cloudflare Pages](#cloudflare-pages)
- [Docker Deployment](#docker-deployment)
- [Traditional Web Hosting](#traditional-web-hosting)
- [Cloud Platforms](#cloud-platforms)
- [Performance Optimization](#performance-optimization)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Since Bulwark 1475 is a static web game, you only need:
- The game files (HTML, CSS, JavaScript, assets)
- A web server capable of serving static files
- HTTPS support (recommended for best performance)

## Static Hosting Platforms

### GitHub Pages

GitHub Pages is perfect for hosting static games and it's free!

#### Steps:

1. **Push your code to GitHub** (if not already done):
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

2. **Enable GitHub Pages**:
   - Go to your repository settings
   - Navigate to "Pages" section
   - Under "Source", select the branch (usually `main`)
   - Select the root folder `/`
   - Click "Save"

3. **Access your game**:
   - Your game will be available at: `https://modernrugged.github.io/bulwark-1475/`
   - It may take a few minutes for the first deployment

#### Custom Domain (Optional):
```bash
# Add a CNAME file with your domain
echo "yourdomain.com" > CNAME
git add CNAME
git commit -m "Add custom domain"
git push
```

Then configure your DNS settings to point to GitHub Pages.

### Netlify

Netlify offers continuous deployment and is very developer-friendly.

#### Method 1: Drag and Drop
1. Go to [netlify.com](https://netlify.com)
2. Drag your project folder onto the deployment area
3. Your site is live!

#### Method 2: Git Integration
1. Connect your GitHub repository to Netlify
2. Configure build settings:
   - **Build command**: Leave empty (static site)
   - **Publish directory**: `.` or `/`
3. Click "Deploy site"

#### Using Netlify CLI:
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy
netlify deploy --prod
```

Your site will be available at a URL like: `https://bulwark-1475.netlify.app`

### Vercel

Vercel provides excellent performance with global CDN.

#### Steps:

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Deploy:
```bash
vercel
```

3. Follow the prompts:
   - Link to existing project or create new
   - Set root directory: `./`
   - Build command: Leave empty
   - Output directory: `./`

4. For production deployment:
```bash
vercel --prod
```

Your game will be available at: `https://bulwark-1475.vercel.app`

### Cloudflare Pages

Cloudflare Pages offers fast global delivery.

#### Steps:

1. Go to [Cloudflare Pages](https://pages.cloudflare.com/)
2. Connect your GitHub repository
3. Configure the project:
   - **Build command**: Leave empty
   - **Build output directory**: `/`
4. Click "Save and Deploy"

Alternatively, use Wrangler CLI:
```bash
npm install -g wrangler
wrangler pages publish . --project-name=bulwark-1475
```

## Docker Deployment

For containerized deployment, use the included Dockerfile.

### Using Docker

1. **Build the image**:
```bash
docker build -t bulwark-1475 .
```

2. **Run the container**:
```bash
docker run -d -p 8080:80 --name bulwark-game bulwark-1475
```

3. **Access the game**:
   - Open `http://localhost:8080` in your browser

### Using Docker Compose

```bash
docker-compose up -d
```

### Deploy to Cloud with Docker

#### Docker Hub + Cloud VM:
```bash
# Tag and push to Docker Hub
docker tag bulwark-1475 yourusername/bulwark-1475:latest
docker push yourusername/bulwark-1475:latest

# On your cloud VM (AWS EC2, DigitalOcean, etc.)
docker pull yourusername/bulwark-1475:latest
docker run -d -p 80:80 --name bulwark yourusername/bulwark-1475:latest
```

## Traditional Web Hosting

### cPanel / Shared Hosting

1. **Package your files**:
```bash
zip -r bulwark-1475.zip . -x "*.git*" -x "node_modules/*"
```

2. **Upload via FTP/SFTP or File Manager**:
   - Upload all files to `public_html` or your web root
   - Ensure `index.html` is in the root directory

3. **Set permissions** (if needed):
```bash
chmod 755 /path/to/game/directory
chmod 644 /path/to/game/files/*
```

### Apache Configuration

If you need to configure `.htaccess`:

```apache
# .htaccess
<IfModule mod_mime.c>
    # Set proper MIME types
    AddType audio/ogg .ogg
    AddType audio/mp3 .mp3
    AddType image/webp .webp
</IfModule>

# Enable compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/css text/javascript application/javascript
</IfModule>

# Enable caching
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/jpeg "access plus 1 year"
    ExpiresByType text/css "access plus 1 month"
    ExpiresByType application/javascript "access plus 1 month"
</IfModule>
```

### Nginx Configuration

Example nginx configuration:

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    root /var/www/bulwark-1475;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|webp|ogg|mp3)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;
}
```

## Cloud Platforms

### AWS S3 + CloudFront

1. **Create S3 bucket**:
```bash
aws s3 mb s3://bulwark-1475-game
```

2. **Upload files**:
```bash
aws s3 sync . s3://bulwark-1475-game --exclude ".git/*"
```

3. **Configure bucket for static hosting**:
```bash
aws s3 website s3://bulwark-1475-game --index-document index.html
```

4. **Set up CloudFront** for CDN distribution (optional but recommended)

### Google Cloud Storage

```bash
# Create bucket
gsutil mb gs://bulwark-1475

# Upload files
gsutil -m cp -r . gs://bulwark-1475

# Make bucket public
gsutil iam ch allUsers:objectViewer gs://bulwark-1475

# Configure for web hosting
gsutil web set -m index.html gs://bulwark-1475
```

### Azure Static Web Apps

```bash
# Install Azure CLI
az login

# Create static web app
az staticwebapp create \
    --name bulwark-1475 \
    --resource-group myResourceGroup \
    --location "East US 2"

# Deploy
az staticwebapp deploy \
    --name bulwark-1475 \
    --app-location ./ \
    --resource-group myResourceGroup
```

## Performance Optimization

### Pre-deployment Checklist

1. **Minify JavaScript and CSS**:
```bash
# If using build tools
npm run build
```

2. **Optimize images**:
   - Use appropriate formats (WebP for graphics, PNG for pixel art)
   - Compress images without quality loss
   - Consider lazy loading for large assets

3. **Enable compression**:
   - Ensure gzip/brotli is enabled on your server
   - Most modern hosting platforms enable this by default

4. **Set cache headers**:
   - Configure long cache times for static assets
   - Use versioning or cache busting for updates

5. **Use a CDN**:
   - Most free hosting platforms include CDN
   - For traditional hosting, consider Cloudflare

### Service Worker (Optional)

For offline play capability, implement a service worker:

```javascript
// sw.js
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open('bulwark-v1').then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/styles.css',
        '/game.js',
        // Add other assets
      ]);
    })
  );
});
```

## Troubleshooting

### Common Issues

#### Game doesn't load
- Check browser console for errors
- Ensure all file paths are correct and relative
- Verify MIME types are set correctly
- Check CORS settings if loading external resources

#### Assets not loading
- Verify file paths are relative (not absolute)
- Check file permissions on server
- Ensure files were uploaded correctly
- Check browser network tab for 404 errors

#### Slow performance
- Enable compression on server
- Implement caching headers
- Use a CDN
- Optimize asset sizes

#### HTTPS issues
- Most modern platforms provide free SSL
- For custom domains, use Let's Encrypt
- Ensure all resources load via HTTPS (no mixed content)

### Testing Your Deployment

Before going live:

1. Test on multiple browsers
2. Test on mobile devices
3. Check loading times
4. Verify all assets load correctly
5. Test game functionality end-to-end

## Environment-Specific Configuration

If your game needs different settings for production:

```javascript
// config.js
const config = {
  apiEndpoint: window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : 'https://api.yourdomain.com',
  debug: window.location.hostname === 'localhost'
};
```

## Monitoring and Analytics

Consider adding:

- Google Analytics for user tracking
- Sentry for error monitoring
- Performance monitoring tools

```html
<!-- Example: Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

## Support

For issues or questions:
- Check the [README.md](./README.md)
- Open an issue on GitHub
- Review browser console for errors

---

**Happy Deploying! 🚀**
