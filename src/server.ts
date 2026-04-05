import colors from 'colors';
import http from 'http';
import { errorLogger, logger } from './shared/logger';
import redisClient from './redis/redisClient';

import app from './app';
import config from './config';
import { setupSocket } from './socket/socket';
import { FCMService } from './shared/fcm.service';
import { connectDB } from './DB/prisma';

//uncaught exception
process.on('uncaughtException', (error) => {
  errorLogger.error('UnhandledException Detected', error, error);
  process.exit(1);
});

export const server = http.createServer(app);

async function main() {
  try {
    const disconnectDB = await connectDB();

    process.on('SIGINT', () => {
      disconnectDB();
      process.exit(0);
    });

    const port =
      typeof config.port === 'number' ? config.port : Number(config.port);
    console.log(port, 'port');

    // Initialize Redis connection
    await redisClient.connect();
    logger.info(colors.cyan('📡 Redis connected successfully'));

    // Initialize Firebase Cloud Messaging (FCM)
    try {
      const serviceAccount = {
        type: config.firebase.type,
        project_id: config.firebase.project_id,
        private_key_id: config.firebase.private_key_id,
        private_key: config.firebase.private_key?.replace(/\\n/g, '\n'), // Replace escaped newlines
        client_email: config.firebase.client_email,
        client_id: config.firebase.client_id,
        auth_uri: config.firebase.auth_uri,
        token_uri: config.firebase.token_uri,
        auth_provider_x509_cert_url:
          config.firebase.auth_provider_x509_cert_url,
        client_x509_cert_url: config.firebase.client_x509_cert_url,
        universe_domain: config.firebase.universe_domain,
      };

      FCMService.initialize(serviceAccount);
      logger.info(
        colors.magenta('🔔 Firebase Cloud Messaging initialized successfully'),
      );
    } catch (error) {
      logger.error(colors.red('❌ Failed to initialize FCM:'), error);
    }

    // Initialize Socket.IO
    setupSocket(server);
    logger.info(colors.blue('🔌 Socket.IO initialized successfully'));

    // For local development: can bind to specific IP
    server.listen(port, '0.0.0.0' as string, () => {
      logger.info(
        colors.yellow(`♻️  Application listening on '0.0.0.0' port:'${port}'`),
      );
    });

    //socket
  } catch (error) {
    console.log(error);
    errorLogger.error(colors.red('🤢 Failed to connect Database'));
  }

  //handle unhandledRejection
  process.on('unhandledRejection', (error) => {
    if (server) {
      server.close(() => {
        errorLogger.error('UnhandledRejection Detected', error, error);
        process.exit(1);
      });
    } else {
      process.exit(1);
    }
  });
}

main();

//SIGTERM
process.on('SIGTERM', async () => {
  logger.info('SIGTERM IS RECEIVE');
  if (server) {
    server.close(() => {
      logger.info('HTTP server closed.');
      process.exit(0);
    });
  }
});
