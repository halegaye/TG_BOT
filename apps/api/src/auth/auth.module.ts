import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { HashService } from './hash.service';
import { TwoFactorService } from './two-factor.service';
import { MailService } from '../mail/mail.service';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RbacGuard } from './guards/rbac.guard';

import { PrismaService } from '../prisma.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'super-secret-key-change-in-production',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  providers: [
    PrismaService,
    HashService,
    TwoFactorService,
    MailService,
    AuthService,
    JwtStrategy,
    JwtAuthGuard,
    RbacGuard,
  ],
  controllers: [AuthController],
  exports: [HashService, TwoFactorService, MailService, AuthService, JwtAuthGuard, RbacGuard],
})
export class AuthModule {}
