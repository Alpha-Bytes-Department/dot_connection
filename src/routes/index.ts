import express, { Router } from 'express';
import { UserRoutes } from '../app/modules-old/user/user.route';
import { ProfileRoutes } from '../app/modules-old/profile/profile.route';
import { MatchRoutes } from '../app/modules-old/match/match.route';
import { ChatRoutes } from '../app/modules-old/chat/chat.route';
import { MessageRoutes } from '../app/modules-old/message/message.route';
import { BlockRoutes } from '../app/modules-old/block/block.route';
import { SettingRoutes } from '../app/modules-old/setting/setting.route';
import { NotificationRoutes } from '../app/modules-old/notification/notification.route';

const router: Router = express.Router();

const apiRoutes = [
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
