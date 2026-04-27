import { create } from 'zustand';

import type { Site } from '../domain';

interface SelectedSiteState {
  selectedSite: Site | null;
  select: (site: Site) => void;
  close: () => void;
}

export const useSelectedSite = create<SelectedSiteState>((set) => ({
  selectedSite: null,
  select: (site) => set({ selectedSite: site }),
  close: () => set({ selectedSite: null }),
}));
