import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';

export const IS_PUBLIC = 'isPublic';
/** Marks a route that needs no login. Every other route requires one. */
export const Public = () => SetMetadata(IS_PUBLIC, true);

export const ROLES = 'roles';
/** Restricts a route to the given user types (ARRUSERTYPE values). */
export const Roles = (...userTypes: number[]) => SetMetadata(ROLES, userTypes);

/** The signed-in user, taken from the verified session token. */
export interface SessionUser {
  id: number;
  companyId: number;
  userType: number;
  fullName: string;
  username: string;
}

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): SessionUser => {
  return ctx.switchToHttp().getRequest().user;
});
