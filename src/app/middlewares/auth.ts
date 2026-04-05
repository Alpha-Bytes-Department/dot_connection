import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { Secret } from 'jsonwebtoken';
import config from '../../config';

import { jwtHelper } from '../../helpers/jwtHelper';
import AppError from '../errors/AppError';
import { prisma } from '../../DB/prisma';

const auth =
  (...roles: string[]) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tokenWithBearer = req.headers.authorization;
      if (!tokenWithBearer) {
        throw new AppError(StatusCodes.UNAUTHORIZED, 'You are not authorized');
      }
      if (tokenWithBearer && tokenWithBearer.startsWith('Bearer')) {
        const token = tokenWithBearer.split(' ')[1];
        //verify token
        const verifyUser = jwtHelper.verifyToken(
          token,
          config.jwt.jwt_secret as Secret,
        );
        //set user to header
        req.user = verifyUser;
        console.log(verifyUser);
        const user = await prisma.user.findUnique({
          where: { id: verifyUser._id },
        });

        if (!user) {
          throw new AppError(
            StatusCodes.UNAUTHORIZED,
            'You are not authorized',
          );
        }
        //check if user is active
        if (user.status !== 'active') {
          throw new AppError(
            StatusCodes.UNAUTHORIZED,
            'You account does not exist or is not active',
          );
        }
        //guard user
        if (roles.length && !roles.includes(verifyUser.role)) {
          throw new AppError(
            StatusCodes.FORBIDDEN,
            "You don't have permission to access this api",
          );
        }

        next();
      }
    } catch (error) {
      next(error);
    }
  };

export default auth;
