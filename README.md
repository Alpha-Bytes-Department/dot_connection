# dot_connection_app

A modern API-based platform for reporting and managing infrastructure issues like potholes, manholes, road cracks, and water leakages in urban areas.

## 🌟 Project Overview

dot_connection_app is a comprehensive solution designed to empower citizens to report infrastructure issues they encounter in their daily lives. The platform facilitates efficient communication between citizens and municipal authorities, helping to address urban infrastructure problems more effectively.

### Key Features

- **Issue Reporting**: Users can report various infrastructure issues including potholes, manholes, road cracks, and water leakage
- **Severity Classification**: Issues can be marked by severity level (Mild, Moderate, Severe)
- **Location Tracking**: Precise GPS location tracking with address mapping
- **Media Attachments**: Support for uploading images and videos as evidence
- **Status Tracking**: Full lifecycle tracking from report submission to resolution
- **Nearby Reports**: Find nearby reported issues based on GPS coordinates
- **User Authentication**: Secure login and registration system
- **User Profiles**: Personal profile management
- **Admin Dashboard**: For authorities to manage and update issue status
- **Real-time Updates**: Socket.IO implementation for real-time notifications
- **Email Notifications**: Automated email updates on report status changes
- **Caching**: Redis-based caching for improved performance
- **File Storage**: AWS S3 integration for media file storage

## 🛠️ Technologies Used

### Backend

- Node.js with Express.js
- TypeScript
- MongoDB with Mongoose ODM
- Redis for caching
- AWS S3 for file storage
- Socket.IO for real-time communication
- JWT for authentication
- Zod for validation
- Nodemailer for email services
- Winston for logging

### DevOps

- Docker and Docker Compose
- Git version control

## 🚀 Installation

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (v4 or higher)
- Redis (v6 or higher)
- Docker and Docker Compose (optional, for containerized setup)

### Setup Instructions

1. **Clone the repository**

   ```bash
   git clone https://github.com/abdullahalkafi-dev/dot_connection_app.git
   cd dot_connection_app
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Environment Configuration**
   Create a `.env` file in the project root with the following variables:

   ```
   NODE_ENV=development
   PORT=5000
   DATABASE_URL_OLD=mongodb://localhost:27017/dot_connection_app
   JWT_SECRET=your_jwt_secret
   JWT_EXPIRES_IN=1d
   JWT_REFRESH_SECRET=your_refresh_secret
   JWT_REFRESH_EXPIRES_IN=30d

   # Redis Configuration
   REDIS_URL=redis://localhost:6379

   # Email Configuration
   EMAIL_HOST=smtp.example.com
   EMAIL_PORT=587
   EMAIL_USER=your_email@example.com
   EMAIL_PASS=your_email_password

   # AWS S3 Configuration
   AWS_ACCESS_KEY_ID=your_aws_access_key
   AWS_SECRET_ACCESS_KEY=your_aws_secret_key
   AWS_REGION=your_aws_region
   AWS_BUCKET_NAME=your_bucket_name
   ```

4. **Start development server**

   ```bash
   pnpm dev
   ```

5. **Docker Setup (Optional)**
   ```bash
   docker-compose up -d
   ```

## 🔧 Usage

### API Endpoints

#### Authentication

- `POST /api/v1/auth/register` - Register a new user
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh-token` - Refresh access token
- `POST /api/v1/auth/forgot-password` - Password reset request
- `POST /api/v1/auth/reset-password` - Reset password with token

#### User Management

- `GET /api/v1/users` - Get all users (admin only)
- `GET /api/v1/users/getme` - Get current user profile
- `GET /api/v1/users/:id` - Get specific user by ID
- `PATCH /api/v1/users` - Update current user profile
- `PATCH /api/v1/users/:id` - Update specific user (admin only)
- `PATCH /api/v1/users/:id/status` - Update user activation status
- `PATCH /api/v1/users/:id/role` - Update user role

#### Pothole Reports

- `POST /api/v1/pothole-reports` - Create new report
- `GET /api/v1/pothole-reports` - Get all reports
- `GET /api/v1/pothole-reports/:id` - Get report by ID
- `GET /api/v1/pothole-reports/my-reports` - Get current user's reports
- `GET /api/v1/pothole-reports/nearby` - Get reports near a location
- `PATCH /api/v1/pothole-reports/:id` - Update a report
- `PATCH /api/v1/pothole-reports/:id/status` - Update report status

### Making API Requests

#### Example: Creating a Pothole Report

```javascript
const reportData = {
  issue: 'Pothole',
  severityLevel: 'Severe',
  location: {
    address: '123 Main Street, Cityville',
    coordinates: [37.7749, -122.4194], // [latitude, longitude]
  },
  description: 'Large pothole causing traffic hazard',
};

// If using form data with images/videos
const formData = new FormData();
formData.append('data', JSON.stringify(reportData));
formData.append('image', imageFile);
formData.append('media', videoFile);

fetch('http://localhost:5000/api/v1/pothole-reports', {
  method: 'POST',
  headers: {
    Authorization: 'Bearer YOUR_JWT_TOKEN',
  },
  body: formData,
})
  .then((response) => response.json())
  .then((data) => console.log(data));
```

## 🧪 Testing

Currently, this project doesn't have automated tests. You can manually test the APIs using tools like Postman or curl.

## 📄 License

This project is licensed under the ISC License - see the LICENSE file for details.

## 👥 Contributors

- Abdullah Al Kafi - Lead Developer

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
