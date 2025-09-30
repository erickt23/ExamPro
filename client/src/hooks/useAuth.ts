import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: true, // Ensure fresh data on mount
    staleTime: 0, // Always consider data stale for immediate auth checks
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user && !error,
  };
}