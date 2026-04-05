import express, { Router } from "express";
import { ProfileController } from "./profile.controller";

const router = express.Router();

router.get("/", ProfileController.getAllProfiles);
router.get("/search", ProfileController.searchProfiles);

export const ProfileRoutes: Router = router;
