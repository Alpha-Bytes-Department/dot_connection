import { Router } from 'express';
import { ReportController } from './report.controller';
import auth from '../../middlewares/auth';
import fileUploadHandler from '../../middlewares/fileUploadHandler';

const router = Router();

router.post('/', auth(), fileUploadHandler, ReportController.sentReport);

export const ReportRoute = router;
