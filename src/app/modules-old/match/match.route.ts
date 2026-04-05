import express, { Router } from "express";
import { MatchController } from "./match.controller";
import validateRequest from "../../middlewares/validateRequest";
import { MatchValidation } from "./match.validation";
import auth from "../../middlewares/auth";
import { USER_ROLES } from "../user/user.constant";

const router = express.Router();

// Get potential matches for swiping
router.get(
  "/potential",
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  MatchController.getPotentialMatches
);

// Perform action (skip, love, map)
router.post(
  "/action",
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  validateRequest(MatchValidation.performAction),
  MatchController.performAction
);

// Get connection requests received
router.get(
  "/requests",
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  MatchController.getConnectionRequests
);

// Respond to connection request
router.patch(
  "/requests/:requestId",
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  validateRequest(MatchValidation.respondToRequest),
  MatchController.respondToRequest
);

// Get connections (matches)
router.get(
  "/connections",
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  MatchController.getConnections
);

// Get match history
// router.get(
//   "/history",
//   auth(USER_ROLES.USER, USER_ROLES.ADMIN),
//   MatchController.getMatchHistory
// );

// Get sent requests
router.get(
  "/sent-requests",
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  MatchController.getSentRequests
);

export const MatchRoutes: Router = router;
