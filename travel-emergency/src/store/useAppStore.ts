import { create } from "zustand";
import { EmergencyContact } from "../types";

interface AppState {
  selectedCountryCode: string | null;
  emergencyContacts: EmergencyContact[];
  userName: string;
  callCenterPhone: string;

  setSelectedCountry: (code: string | null) => void;
  setEmergencyContacts: (contacts: EmergencyContact[]) => void;
  addEmergencyContact: (contact: Omit<EmergencyContact, "id" | "created_at">) => void;
  removeEmergencyContact: (id: number) => void;
  setUserName: (name: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  selectedCountryCode: null,
  emergencyContacts: [],
  userName: "",
  callCenterPhone: "15880404",

  setSelectedCountry: (code) => set({ selectedCountryCode: code }),

  setEmergencyContacts: (contacts) => set({ emergencyContacts: contacts }),

  addEmergencyContact: (contact) => {
    const current = get().emergencyContacts;
    if (current.length >= 5) return;
    const newContact: EmergencyContact = {
      ...contact,
      id: Date.now(),
      created_at: new Date().toISOString(),
    };
    set({ emergencyContacts: [...current, newContact] });
  },

  removeEmergencyContact: (id) => {
    set({
      emergencyContacts: get().emergencyContacts.filter((c) => c.id !== id),
    });
  },

  setUserName: (name) => set({ userName: name }),
}));
