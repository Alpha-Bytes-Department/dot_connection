import express, { Router } from "express";
import { ProfileController } from "./profile.controller";


const router = express.Router();
//!admin route
router.get("/", ProfileController.getAllProfiles);

//!admin route
router.get("/search", ProfileController.searchProfiles);


export const ProfileRoutes: Router = router;
