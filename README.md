# 🎬 YouTube Clone (Backend)

A full-stack YouTube-like platform (currently backend only).  
This project provides REST APIs for user authentication, video uploads, playlists, subscriptions, comments, likes, and more.  
Frontend integration will be added later.

---

## 🚀 Features

- **User Authentication**: Register, login, logout, refresh tokens, change password, get current user
- **Video Management**: Upload, fetch, update, publish/unpublish, delete videos
- **Playlists**: Create, update, delete, add/remove videos, fetch playlists
- **Comments**: Post, update, delete, and fetch comments on videos
- **Likes**: Like/Unlike videos and comments
- **Subscriptions**: Subscribe/unsubscribe to channels, view subscribers
- **Dashboard**: Get channel stats and video list
- **Tweets (Mini feature)**: Post, update, delete, and fetch tweets
- **Cloudinary Integration** for video and thumbnail storage
- **Secure APIs** with JWT authentication

---

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB (Mongoose ODM)
- **Authentication**: JWT (Access & Refresh tokens)
- **File Uploads**: Multer + Cloudinary
- **Environment Management**: dotenv
- **Dev Tools**: Nodemon

---

## 📂 Project Structure

Youtube-Clone/
├── controllers/ # Business logic
├── models/ # Mongoose schemas
├── routes/ # API endpoints
├── middlewares/ # Auth, error handling
├── utils/ # Helper functions
├── config/ # DB & Cloudinary config
├── app.js # Express app entry
├── server.js # Server start
├── package.json
└── README.md



---

## ⚙️ Setup & Installation

### 1. Clone the repository
```bash
git clone https://github.com/ratanyadav3/Youtube-Clone.git
cd Youtube-Clone
```
### 2. install dependecies
```bash
cd backend
npm install
```
### Configure Environment Variables

Create a .env file inside the backend/ folder with the following:
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/youtube_clone

ACCESS_TOKEN_SECRET=your_access_secret
ACCESS_TOKEN_EXPIRY=1d

REFRESH_TOKEN_SECRET=your_refresh_secret
REFRESH_TOKEN_EXPIRY=7d

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Start the devlopment Server
```bash
npm run dev
```

The server will run on:
👉 http://localhost:3000



📌 API Usage (Overview)
👤 User Routes

POST /api/v1/users/register → Register

POST /api/v1/users/login → Login

POST /api/v1/users/logout → Logout

POST /api/v1/users/refresh-token → Refresh token

POST /api/v1/users/change-password → Change password

GET /api/v1/users/current-user → Get current user

📺 Video Routes

POST /api/v1/videos/ → Upload video

GET /api/v1/videos/ → Get all videos

GET /api/v1/videos/:videoId → Get video by ID

PATCH /api/v1/videos/:videoId → Update video

PATCH /api/v1/videos/toggle/publish/:videoId → Publish/Unpublish

DELETE /api/v1/videos/:videoId → Delete video

🎶 Playlist Routes

POST /api/v1/playlist/ → Create playlist

GET /api/v1/playlist/user/:userId → Get user playlists

GET /api/v1/playlist/:playlistId → Get playlist

PATCH /api/v1/playlist/:playlistId → Update playlist

PATCH /api/v1/playlist/add/:videoId/:playlistId → Add video

PATCH /api/v1/playlist/remove/:videoId/:playlistId → Remove video

DELETE /api/v1/playlist/:playlistId → Delete playlist

💬 Comment Routes

GET /api/v1/comments/:videoId → Get comments

POST /api/v1/comments/:videoId → Add comment

PATCH /api/v1/comments/c/:commentId → Update comment

DELETE /api/v1/comments/c/:commentId → Delete comment

👍 Like Routes

POST /api/v1/likes/toggle/v/:videoId → Like/Unlike video

POST /api/v1/likes/toggle/c/:commentId → Like/Unlike comment

GET /api/v1/likes/videos → Get liked videos

🔔 Subscription Routes

GET /api/v1/subscriptions/u/:channelId → Get subscribers

GET /api/v1/subscriptions/c/:subscriberId → Get subscriptions

POST /api/v1/subscriptions/u/:channelId → Subscribe/Unsubscribe

📊 Dashboard Routes

GET /api/v1/dashboard/stats → Channel stats

GET /api/v1/dashboard/videos → Channel videos

🐦 Tweet Routes

GET /api/v1/tweets/user/:userId → Get tweets

POST /api/v1/tweets/ → Post tweet

PATCH /api/v1/tweets/:tweetId → Update tweet

DELETE /api/v1/tweets/:tweetId → Delete tweet


📖 Future Work

Add frontend (React.js + Tailwind CSS)

Video recommendations & trending section

Search & filtering

Notification system

Deployment (Docker + Cloud hosting)


🤝 Contributing

Contributions are welcome!

Fork the repo

Create a branch (feature/xyz)

Commit your changes

Push to your fork

Open a Pull Request


📜 License

This project is licensed under the MIT License


👤 Author

Ratan Yadav (Jaggu)  
📧 Email: [ratanyadavvkr@gmail.com](mailto:ratanyadavvkr@gmail.com)  
🔗 GitHub: [ratanyadav3](https://github.com/ratanyadav3)