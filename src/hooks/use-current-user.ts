import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function useCurrentUser() {
  const user = useQuery(api.users.getCurrentUser);
  return user;
}
