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
- **File Storage**: Local file storage for media uploads

## 🛠️ Technologies Used

### Backend

- Node.js with Express.js
- TypeScript
- PostgreSQL with Prisma ORM
- Redis for caching
- Socket.IO for real-time communication
- JWT for authentication
- Zod for validation
- Nodemailer for email services
- Winston for logging

### DevOps

- Docker and Docker Compose

## 🚀 Running the Server

```bash
docker compose up -d --remove-orphans
```

## 📄 License

This project is licensed under the ISC License.