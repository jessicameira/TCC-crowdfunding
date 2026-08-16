import { User } from './entities/user.entity';

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
};

export function toUserProfile(user: User): UserProfile {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
  };
}
