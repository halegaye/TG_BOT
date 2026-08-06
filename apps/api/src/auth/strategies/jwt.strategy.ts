import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaClient } from '@tg-bot/database';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private prisma: PrismaClient;

  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req) => {
          let token = null;
          if (req && req.cookies) {
            token = req.cookies['access_token'];
          }
          if (!token) {
            token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
          }
          if (!token && req && req.query && req.query.token) {
            token = req.query.token as string;
          }
          return token;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'super-secret-key-change-in-production',
    });
    this.prisma = new PrismaClient();
  }

  async validate(payload: { sub: string; email: string }) {
    const user = await this.prisma.panelUser.findUnique({
      where: { id: payload.sub },
      include: {
        memberships: {
          include: {
            brand: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Geçersiz veya pasif kullanıcı oturumu.');
    }

    return user;
  }
}
