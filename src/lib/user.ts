import { CurrentUserResponse, User } from '@/types/api';

// Backend has no display-name concept yet, so fullName is always null here.
export function toStoreUser(current: CurrentUserResponse): User {
  return {
    id: current.id,
    email: current.email,
    fullName: null,
    role: current.role,
    emailVerified: current.status !== 'PENDING_VERIFICATION',
    avatarUrl: current.avatar?.publicUrl ?? null,
    shopId: current.shop?.id ?? null,
    shopName: current.shop?.name ?? null,
  };
}
