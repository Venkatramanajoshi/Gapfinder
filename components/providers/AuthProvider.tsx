"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  signup: (email: string, password: string) => Promise<{ error?: string }>;
  loginAsDemo: () => Promise<{ error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok || data.error || !data.user) {
        return { error: data.error || "Invalid email or password." };
      }
      setUser(data.user);
      return {};
    } catch (err: any) {
      return { error: err.message || "Failed to sign in." };
    } finally {
      setLoading(false);
    }
  };

  const signup = async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok || data.error || !data.user) {
        return { error: data.error || "Failed to create account." };
      }
      setUser(data.user);
      return {};
    } catch (err: any) {
      return { error: err.message || "Failed to create account." };
    } finally {
      setLoading(false);
    }
  };

  const loginAsDemo = async () => {
    return await login("demo@gapfinder.app", "Demo@1234");
  };

  const logout = async () => {
    await fetch("/api/auth/signout", { method: "POST" });
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        signup,
        loginAsDemo,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
