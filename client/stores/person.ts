"use client";
import { create } from "zustand";
import { devtools } from "zustand/middleware";

export interface Person {
  id: string;
  name: string;
  colors: {
    hairColor: string;
    skinColor: string;
  };
  position: [number, number, number];
  rotation: [number, number, number, string];
}

interface PersonState {
  persons: Person[] | [];
  addPerson: (person: Person) => void;
  removePerson: (person: Person) => void;
  setPersons: (persons: Person[]) => void;
}

export const userPersonStore = create<PersonState>()(
  devtools((set) => ({
    persons: [],
    addPerson: (person) =>
      set((state) => ({ persons: [...state.persons, person] })),
    removePerson: (person) =>
      set((state) => {
        const newPersons = state.persons.filter((p) => p.id !== person.id);
        return { persons: newPersons };
      }),
    setPersons: (persons) => set((state) => ({ persons: [...persons] })),
  }))
);
