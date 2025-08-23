# Vercel Deployment Guide

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Vercel CLI**: Install with `npm i -g vercel`
3. **Git Repository**: Your code should be in a Git repository

## Step 1: Database Setup

### 1.1 Create Vercel Postgres Database

1. Go to your Vercel dashboard
2. Navigate to "Storage" → "Create Database"
3. Select "Prisma Postgres" (recommended for edge-ready, no cold starts)
4. Choose a plan (Hobby plan is free for development)
5. Select a region close to your users
6. Click "Create Database"

### 1.2 Get Database Connection Details

After creating the database:
1. Click on your database
2. Go to "Settings" → "Environment Variables"
3. Copy the `DATABASE_URL` value (this is the primary connection string)
4. Also note the `POSTGRES_URL` if available (for backward compatibility)

## Step 2: Environment Variables

### 2.1 Local Development

Create a `.env.local` file in your project root:

```env
# Database
DATABASE_URL=your_postgres_connection_string
POSTGRES_URL=your_postgres_connection_string

# JWT Secret (generate a secure random string)
JWT_SECRET=your-super-secret-jwt-key-here

# Zoho Analytics (existing)
REACT_APP_ZOHO_CLIENT_ID=your_zoho_client_id
REACT_APP_ZOHO_CLIENT_SECRET=your_zoho_client_secret
REACT_APP_ZOHO_REFRESH_TOKEN=your_zoho_refresh_token
```

### 2.2 Vercel Environment Variables

1. Go to your Vercel project dashboard
2. Navigate to "Settings" → "Environment Variables"
3. Add the following variables:

| Name | Value | Environment |
|------|-------|-------------|
| `DATABASE_URL` | Your Postgres connection string | Production, Preview, Development |
| `POSTGRES_URL` | Your Postgres connection string (backup) | Production, Preview, Development |
| `JWT_SECRET` | Your secure JWT secret | Production, Preview, Development |
| `REACT_APP_ZOHO_CLIENT_ID` | Your Zoho client ID | Production, Preview, Development |
| `REACT_APP_ZOHO_CLIENT_SECRET` | Your Zoho client secret | Production, Preview, Development |
| `REACT_APP_ZOHO_REFRESH_TOKEN` | Your Zoho refresh token | Production, Preview, Development |

## Step 3: Database Migration

### 3.1 Run Database Schema

**Option A: Using the setup script (Recommended)**
```bash
npm run db:setup
```

**Option B: Manual setup**
1. Connect to your Vercel Postgres database
2. Run the SQL schema from `api/db/schema.sql`

You can do this via:
- Vercel dashboard → Database → "Query" tab
- Or using a database client like pgAdmin, DBeaver, etc.

### 3.2 Default Admin User

The schema creates a default admin user:
- **Username**: `admin`
- **Password**: `admin123`
- **Role**: `admin`

**⚠️ IMPORTANT**: Change this password immediately after first login!

## Step 4: Deploy to Vercel

### 4.1 Install Dependencies

```bash
npm install
```

### 4.2 Deploy

```bash
# Login to Vercel (if not already logged in)
vercel login

# Deploy to Vercel
vercel --prod
```

### 4.3 Alternative: Deploy via GitHub

1. Push your code to GitHub
2. Connect your GitHub repository to Vercel
3. Vercel will automatically deploy on every push

## Step 5: Post-Deployment Setup

### 5.1 Verify Database Connection

1. Check your Vercel deployment logs
2. Ensure the database connection is working
3. Verify the API endpoints are accessible

### 5.2 Test Authentication

1. Visit your deployed application
2. You should be redirected to the login page
3. Login with the default admin credentials:
   - Username: `admin`
   - Password: `admin123`

### 5.3 Create Additional Users

1. Login as admin
2. Use the admin panel to create additional users
3. Deactivate the default admin account or change its password

## Step 6: Security Considerations

### 6.1 JWT Secret

Generate a secure JWT secret:

```bash
# Generate a random 32-character string
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 6.2 Environment Variables

- Never commit sensitive environment variables to Git
- Use Vercel's environment variable management
- Rotate secrets regularly

### 6.3 Database Security

- Use Vercel's managed Postgres for security
- Enable SSL connections
- Regularly backup your database

## Step 7: Monitoring and Maintenance

### 7.1 Vercel Analytics

1. Enable Vercel Analytics in your project
2. Monitor performance and errors
3. Set up alerts for critical issues

### 7.2 Database Monitoring

1. Monitor database usage in Vercel dashboard
2. Set up alerts for high usage
3. Regularly check audit logs

### 7.3 Application Monitoring

1. Monitor API response times
2. Check for authentication errors
3. Review audit logs regularly

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check `POSTGRES_URL` environment variable
   - Verify database is active in Vercel dashboard
   - Check SSL configuration

2. **Authentication Not Working**
   - Verify `JWT_SECRET` is set
   - Check API routes are accessible
   - Review browser console for errors

3. **CORS Errors**
   - Ensure API routes are properly configured
   - Check Vercel routing configuration
   - Verify frontend is making requests to correct URLs

4. **Build Failures**
   - Check all dependencies are installed
   - Verify TypeScript compilation
   - Review build logs in Vercel dashboard

### Getting Help

1. Check Vercel documentation: [vercel.com/docs](https://vercel.com/docs)
2. Review deployment logs in Vercel dashboard
3. Check browser developer tools for frontend errors
4. Monitor API responses in Network tab

## Next Steps

After successful deployment:

1. **User Management**: Create additional users and manage roles
2. **Audit Logging**: Monitor user activities and data changes
3. **Performance**: Optimize database queries and API responses
4. **Security**: Implement additional security measures as needed
5. **Backup**: Set up regular database backups
6. **Monitoring**: Configure alerts and monitoring tools
