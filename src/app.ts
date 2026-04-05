import cors from 'cors';
import express, { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import globalErrorHandler from './app/middlewares/globalErrorHandler';
import router from './routes';
import cookieParser from 'cookie-parser';
import { Morgan } from './shared/morgen';
import os from 'os';
import {
  helmetConfig,
  generalLimiter,
  compressionConfig,
  additionalSanitization,
} from './app/middlewares/security';
import {
  performanceMonitor,
  healthCheck,
  performanceDashboard,
  apiUsageTracker,
} from './app/middlewares/performanceMonitor';
// import admin from 'firebase-admin';
const app: express.Application = express();

// Trust proxy settings for nginx reverse proxy
app.set('trust proxy', 1); // Trust first proxy (nginx)

// Security middleware - MUST be first
app.use(helmetConfig);
app.use(compressionConfig);

// Performance monitoring
app.use(performanceMonitor.requestMonitor());
app.use(apiUsageTracker);

// Rate limiting
app.use(generalLimiter);

// admin.initializeApp({
//   credential: admin.credential.cert(ServiceAccount as admin.ServiceAccount),
// });

//body parser with size limits
// Capture raw body for webhook signature verification
app.use(
  express.json({
    limit: '10mb',
    verify: (req: any, res, buf, encoding) => {
      // Save raw body for webhook endpoints that need signature verification
      if (req.originalUrl?.includes('/webhook')) {
        req.rawBody = buf.toString((encoding as BufferEncoding) || 'utf8');
      }
    },
  }),
);
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Input sanitization
// app.use(sanitizeInput); // Temporarily disabled due to Express 5 compatibility
app.use(additionalSanitization);

// CORS configuration
app.use(
  cors({
    origin: [
      'https://joura.info',
      'http://localhost:3000',
      'http://10.10.12.125:3000',
      'http://localhost:3001',
      'https://j5dmj0c5-5009.inc1.devtunnels.ms', // Dev Tunnels URL
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
    maxAge: 86400, // 24 hours
  }),
);

//file retrieve
app.use(express.static('uploads'));

// Health check and monitoring endpoints
app.get('/health', healthCheck);
app.get('/api/v1/performance', performanceDashboard);

//morgan
app.use(Morgan.successHandler);
//router
app.use('/api/v1', router);
app.use(Morgan.errorHandler);
//live response
app.get('/', (req: Request, res: Response) => {
  console.log(`Hello from container: ${os.hostname()}`);

  res.send(
    `Hello from container: ${os.hostname()}`,
  );
});

//global error handle
app.use(globalErrorHandler);

//handle not found route;
app.use((req, res) => {
  res.status(StatusCodes.NOT_FOUND).json({
    success: false,
    message: 'Not found',
    errorMessages: [
      {
        path: req.originalUrl,
        message: "API DOESN'T EXIST",
      },
    ],
  });
});

export default app;
