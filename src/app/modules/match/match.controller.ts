import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { MatchServices } from "./match.service";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";

const getPotentialMatches = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user._id;
  const matchesRes = await MatchServices.getPotentialMatches(userId, req.query);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Potential matches retrieved successfully",
    data: matchesRes.result,
    meta: matchesRes.meta,
  });
});

const performAction = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user._id;
  const { toUserId, action } = req.body;
  const result = await MatchServices.performAction(userId, toUserId, action);
  const { message, ...data } = result;
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message,
    data,
  });
});

const getConnectionRequests = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user._id;
  const requestsRes = await MatchServices.getConnectionRequests(userId, req.query);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Connection requests retrieved successfully",
    data: requestsRes.result,
    meta: requestsRes.meta,
  });
});

const respondToRequest = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user._id;
  const { requestId } = req.params;
  const { action } = req.body;
  const result = await MatchServices.respondToConnectionRequest(requestId, userId, action);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: result.message,
    data: result,
  });
});

const getConnections = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user._id;
  const connectionsRes = await MatchServices.getConnections(userId, req.query);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Connections retrieved successfully",
    data: connectionsRes.result,
    meta: connectionsRes.meta,
  });
});

const getSentRequests = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user._id;
  const requestsRes = await MatchServices.getSentRequests(userId, req.query);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Sent requests retrieved successfully",
    data: requestsRes.result,
    meta: requestsRes.meta,
  });
});

export const MatchController = {
  getPotentialMatches,
  performAction,
  getConnectionRequests,
  respondToRequest,
  getConnections,
  getSentRequests,
};
