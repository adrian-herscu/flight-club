"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { apiClient } from "@/services/apiClient";

interface School {
  id: number;
  name: string;
}

interface SchoolContextType {
  currentSchool: School | null;
  schools: School[];
  setCurrentSchool: (school: School) => void;
  loading: boolean;
}

const SchoolContext = createContext<SchoolContextType | undefined>(undefined);

export function SchoolProvider({ children }: { children: ReactNode }) {
  const [currentSchool, setCurrentSchool] = useState<School | null>(null);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSchools = async () => {
      try {
        const data = await apiClient.get<School[]>("/api/v1/schools");
        setSchools(data);

        // Set first school as default
        if (data.length > 0) {
          setCurrentSchool(data[0]);
        }
      } catch (error) {
        console.error("Failed to load schools:", error);
      } finally {
        setLoading(false);
      }
    };

    loadSchools();
  }, []);

  return (
    <SchoolContext.Provider value={{ currentSchool, schools, setCurrentSchool, loading }}>
      {children}
    </SchoolContext.Provider>
  );
}

export function useSchool() {
  const context = useContext(SchoolContext);
  if (context === undefined) {
    throw new Error("useSchool must be used within a SchoolProvider");
  }
  return context;
}
