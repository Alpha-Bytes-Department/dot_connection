import express, { Router } from 'express';
import { UserRoutes } from '../app/modules/user/user.route';
import { ProfileRoutes } from '../app/modules/profile/profile.route';
import { MatchRoutes } from '../app/modules/match/match.route';
import { ChatRoutes } from '../app/modules/chat/chat.route';
import { MessageRoutes } from '../app/modules/message/message.route';
import { BlockRoutes } from '../app/modules/block/block.route';
import { SettingRoutes } from '../app/modules/setting/setting.route';
import { NotificationRoutes } from '../app/modules/notification/notification.route';

const router: Router = express.Router();

const apiRoutes: { path: string; route: Router }[] = [
  {
    path: '/user',
    route: UserRoutes,
  },
  {
    path: '/profile',
    route: ProfileRoutes,
  },
  {
    path: '/match',
    route: MatchRoutes,
  },
  {
    path: '/chat',
    route: ChatRoutes,
  },
  {
    path: '/message',
    route: MessageRoutes,
  },
  {
    path: '/block',
    route: BlockRoutes,
  },
  {
    path: '/setting',
    route: SettingRoutes,
  },
  {
    path: '/notification',
    route: NotificationRoutes,
  },
];

apiRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
