import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  // Check localStorage for admin user instead of API call
  const getStoredUser = () => {
    try {
      const stored = localStorage.getItem('ksyk_admin_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  };

  const { data: user, isLoading } = useQuery({
    queryKey: ["auth-user"],
    queryFn: getStoredUser,
    retry: false,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });

  return {
    user,
    isLoading: false,
    isAuthenticated: !!user,
  };
}
