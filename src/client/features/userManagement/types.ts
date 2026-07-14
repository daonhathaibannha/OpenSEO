export const USERS_QUERY_KEY = ["managed-users"] as const;

export type ManagedUser = {
  id: string;
  email: string;
  name: string;
  role: string | null;
  banned: boolean | null;
  createdAt: Date;
};
