import express, { Router } from 'express';
import { UserRoutes } from '../app/modules/user/user.route';

const router: Router = express.Router();

const apiRoutes: { path: string; route: Router }[] = [
  {
    path: '/user',
    route: UserRoutes,
  },
];

apiRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
