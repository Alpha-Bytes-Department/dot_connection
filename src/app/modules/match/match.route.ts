import express, { Router } from "express";
import { MatchController } from "./match.controller";
import validateRequest from "../../middlewares/validateRequest";
import { MatchValidation } from "./match.validation";
import auth from "../../middlewares/auth";
import { USER_ROLES } from "../user/user.constant";

const router = express.Router();

router.get(
  "/potential",
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  MatchController.getPotentialMatches,
);

router.post(
  "/action",
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  validateRequest(MatchValidation.performAction),
  MatchController.performAction,
);

router.get(
  "/requests",
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  MatchController.getConnectionRequests,
);

router.patch(
  "/requests/:requestId",
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  validateRequest(MatchValidation.respondToRequest),
  MatchController.respondToRequest,
);

router.get(
  "/connections",
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  MatchController.getConnections,
);

router.get(
  "/sent-requests",
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  MatchController.getSentRequests,
);

export const MatchRoutes: Router = router;
