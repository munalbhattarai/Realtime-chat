# Realtime Chat & Video Calling Web App

A full-stack, production-ready real-time chat and video calling application with a modern Spidey-themed UI.

## Features

- **Real-time Messaging**: Instant message delivery using WebSockets (Django Channels).
- **Video & Audio Calling**: Peer-to-peer WebRTC video and audio calls with custom UI controls (mute, camera off, end call).
- **Google OAuth Authentication**: Secure, JWT-based Google Sign-In with dynamic client ID resolution, fully integrated with Django's User model.
- **Email & Password Authentication**: Standard registration and login flows.
- **Online Presence**: Real-time tracking of active users.
- **Read Receipts**: Know when your messages have been seen.
- **Media Uploads**: Image sharing via Cloudinary integration.
- **Responsive Design**: Fully optimized for mobile, tablet, and desktop viewports, preventing scrolling glitches and layout collapsing on iOS/Android.
- **Progressive Web App (PWA)**: Installable on supported devices.

## Tech Stack

### Frontend
- **Framework**: React 18 with Vite
- **Styling**: Tailwind CSS (custom "Spidey" theme)
- **State Management**: Redux Toolkit (RTK)
- **WebRTC**: Simple-peer (or native WebRTC API)
- **Hosting**: Cloudflare Pages (`https://chat.munal.me`)

### Backend
- **Framework**: Django & Django REST Framework (DRF)
- **WebSockets**: Django Channels with Redis channel layer
- **Database**: PostgreSQL (hosted on Supabase)
- **Authentication**: SimpleJWT & Google Identity Services (GIS)
- **Storage**: Cloudinary for media assets
- **Hosting**: Render (`https://realtime-chat-rrwp.onrender.com`)

## Environment Variables

### Frontend (`frontend/.env`)
Create a `.env` file in the `frontend` directory:
```env
VITE_API_URL=http://127.0.0.1:8000/api
VITE_WS_HOST=127.0.0.1:8000
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```
*Note: Make sure there are NO leading or trailing spaces around the Google Client ID.*

### Backend (`backend/.env`)
Create a `.env` file in the `backend` directory:
```env
SECRET_KEY=your_django_secret_key
DEBUG=True
ALLOWED_HOSTS=127.0.0.1,localhost,realtime-chat-rrwp.onrender.com

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,https://chat.munal.me

# Database (Supabase)
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your_db_password
DB_HOST=db.your-supabase-host.supabase.co
DB_PORT=5432

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Redis (Upstash)
REDIS_URL=rediss://default:your-redis-password@your-redis-host.upstash.io:6379

# Google OAuth 2.0 Credentials
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## Running Locally

### Backend Setup
1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Activate the virtual environment (Windows):
   ```bash
   .\env\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Apply database migrations:
   ```bash
   python manage.py migrate
   ```
5. Start the Django development server:
   ```bash
   python manage.py runserver
   ```

### Frontend Setup
1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install Node dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```

## Testing

To run the backend test suite (includes tests for accounts, auth, and calls):
```bash
cd backend
python manage.py test apps.accounts apps.calls
```

## License
MIT License
