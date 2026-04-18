import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { ReportService } from './report.service';
import { toPublicUploadPath } from '../../../shared/uploadPath';

const sentReport = catchAsync(async (req: Request, res: Response) => {
  const files = [];

  if (req.files && 'media' in req.files) {
    for (const file of req.files.media) {
      files.push(toPublicUploadPath(file.path));
    }
  }

  const data = JSON.parse(req.body.data);

  const result = await ReportService.sentReport({
    reason: data.reason,
    targetId: data.targetId,
    files,
    reporterId: req.user._id,
  });


  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: 'Report submitted successfully',
    data: result,
  });
});

export const ReportController = {
  sentReport,
};
