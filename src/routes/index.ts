import express, { Router } from 'express';

const router: Router = express.Router();

const apiRoutes: { path: string; route: Router }[] = [];

apiRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
