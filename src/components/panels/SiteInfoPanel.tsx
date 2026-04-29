'use client';

import { useSelectedSite } from '../../store/selected-site';
import { Drawer, DrawerBody, DrawerHeader } from '../ui/drawer';

import { SiteBody, SiteHeading } from './SiteDetails';

export default function SiteInfoPanel() {
  const selectedSite = useSelectedSite((state) => state.selectedSite);
  const close = useSelectedSite((state) => state.close);

  // Ark UI Dialog keeps the panel mounted with data-state="closed"
  // when not open (vs Chakra v2 which unmounted), so we don't need
  // a buffered displaySite for the close animation — content just
  // disappears with the dialog itself.
  return (
    <Drawer open={selectedSite !== null} onClose={close}>
      {selectedSite === null ? null : (
        <>
          <DrawerHeader>
            <SiteHeading site={selectedSite} headingLevel="h2" />
          </DrawerHeader>
          <DrawerBody>
            <SiteBody site={selectedSite} />
          </DrawerBody>
        </>
      )}
    </Drawer>
  );
}
