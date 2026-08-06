import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@tg-bot/database';

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();
    const user = request.user; // JWT ile doğrulanan kullanıcı

    if (!user) {
      throw new ForbiddenException('Kimlik doğrulaması gereklidir.');
    }

    // 1. Super Admin Kontrolü (Global Sistem Yetkisi)
    const isSuperAdmin = user.memberships?.some(
      (m: any) => m.role === Role.SUPER_ADMIN || m.role === 'SUPER_ADMIN',
    );

    const targetBrandId =
      request.headers['x-brand-id'] ||
      request.query?.brandId ||
      request.body?.brandId ||
      (request.params?.id && /^[0-9a-fA-F-]{36}$/.test(request.params.id) ? request.params.id : null);

    if (isSuperAdmin) {
      request.validatedBrandId = targetBrandId || user.memberships?.[0]?.brandId || '';
      return true;
    }

    // 2. Tenant İzolasyonu & Üyelik Kontrolü
    let membership = targetBrandId
      ? user.memberships?.find((m: any) => m.brandId === targetBrandId)
      : null;

    // Hedef marka ID spesifik olarak bulunamadıysa kullanıcının varsayılan ilk markasını kontrol et
    if (!membership && user.memberships?.length > 0) {
      membership = user.memberships[0];
    }

    if (!membership) {
      throw new ForbiddenException('Bu markanın verilerine veya işlemlerine erişim yetkiniz yok.');
    }

    // 3. Rol Yetki Matrisi Kontrolü
    if (requiredRoles && requiredRoles.length > 0) {
      const hasRole = requiredRoles.includes(membership.role);
      if (!hasRole) {
        throw new ForbiddenException(
          `Bu işlem için yetkiniz bulunmamaktadır (Mevcut rolünüz: ${membership.role}).`,
        );
      }
    }

    request.validatedBrandId = membership.brandId;
    return true;
  }
}
