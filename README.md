# CRM Backend - Quick Start Guide

## 🚀 Quick Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Create Admin User
```bash
npm run seed:admin
```

### 3. Start Server
```bash
npm run dev
```

## 🔑 Admin Credentials

```
Email: admin@gmail.com
Password: 123456
Role: Admin (All Permissions)
```

## 📡 Test Login

### Using cURL
```bash
curl -X POST http://localhost:5000/v1/api/staff/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gmail.com","password":"123456"}'
```

### Using Postman
```
POST http://localhost:5000/v1/api/staff/login

Body (JSON):
{
  "email": "admin@gmail.com",
  "password": "123456"
}
```

## 📋 Available Scripts

```bash
npm start          # Start production server
npm run dev        # Start development server with nodemon
npm run seed:admin # Create/Update admin user
node seedDatabase.js # Seed complete database with sample data
```

## 🌐 API Base URL

```
http://localhost:5000/v1/api
```

## 📚 Main Endpoints

### Authentication
- `POST /v1/api/staff/login` - Login
- `POST /v1/api/staff/refresh-token` - Refresh token
- `GET /v1/api/staff/me` - Get current user (requires auth)

### Staff Management (Protected)
- `GET /v1/api/staff` - Get all staff
- `POST /v1/api/staff` - Create staff
- `PUT /v1/api/staff/:id` - Update staff
- `DELETE /v1/api/staff/:id` - Delete staff

### Role Management (Protected)
- `GET /v1/api/role` - Get all roles
- `POST /v1/api/role` - Create role
- `PUT /v1/api/role/:id` - Update role
- `DELETE /v1/api/role/:id` - Delete role

### Account Master (Protected)
- `GET /v1/api/accountMaster` - Get all clients
- `POST /v1/api/accountMaster` - Create client
- `PUT /v1/api/accountMaster/:id` - Update client
- `DELETE /v1/api/accountMaster/:id` - Delete client

### Lead Management (Protected)
- `GET /v1/api/lead` - Get all leads
- `POST /v1/api/lead` - Create lead
- `PUT /v1/api/lead/:id` - Update lead
- `DELETE /v1/api/lead/:id` - Delete lead

## 🔐 Admin Permissions

The admin user has ALL permissions enabled:
- ✅ Dashboard Access
- ✅ Settings Access
- ✅ Account Master (View All)
- ✅ Production Access
- ✅ Leads Access
- ✅ Reports Access
- ✅ All Lead Statuses (10 statuses)

## 📊 Lead Statuses

1. New Lead
2. Quotation Given
3. Follow Up
4. Order Confirmation
5. PI
6. Order Execution
7. Final Payment
8. Dispatch
9. Completed
10. Lost

## 🛡️ Security Features

- ✅ AES Password Encryption
- ✅ JWT Authentication (1h expiry)
- ✅ Refresh Token (7d expiry)
- ✅ Input Validation
- ✅ NoSQL Injection Prevention
- ✅ CORS Protection
- ✅ Soft Delete

## 📝 Environment Variables

Check `.env` file for configuration:
- `PORT=5000`
- `MONGO_URI` - MongoDB connection string
- `JWT_SECRET_KEY` - JWT secret
- `CRYPTO_SECRET_KEY` - Encryption secret
- `FRONTEND_URL` - Frontend URL for CORS

## 🐛 Troubleshooting

### Cannot connect to MongoDB
- Check `MONGO_URI` in `.env` file
- Ensure MongoDB is running
- Check network connectivity

### Admin login fails
- Run `npm run seed:admin` again
- Check if email/password are correct
- Check server logs for errors

### Port already in use
- Change `PORT` in `.env` file
- Or kill the process using port 5000

## 📖 Full Documentation

See `BACKEND_REVIEW.md` for complete backend documentation.

---
**Server:** http://localhost:5000
**API Version:** v1
**Admin Email:** admin@gmail.com
**Admin Password:** 123456
