import type { Map, MapBrowserEvent } from 'ol';

import type { GetSite } from '../application/use-cases/get-site';
import { siteId } from '../domain';
import { useSelectedSite } from '../store/selected-site';

export const HIT_TOLERANCE_PX = 6;

export const makeHandleClick =
  (map: Map, getSite: GetSite) =>
  (event: MapBrowserEvent<PointerEvent | KeyboardEvent | WheelEvent>): void => {
    let pickedId: string | null = null;
    map.forEachFeatureAtPixel(
      event.pixel,
      (feature) => {
        const id = feature.getId();
        if (typeof id === 'string') {
          pickedId = id;
          return true;
        }
        return false;
      },
      { hitTolerance: HIT_TOLERANCE_PX }
    );
    if (pickedId === null) return;

    getSite(siteId(pickedId))
      .then((site) => {
        if (site) useSelectedSite.getState().select(site);
      })
      .catch((err: unknown) => {
        // eslint-disable-next-line no-console
        console.error('Failed to load site', err);
      });
  };

export const makeHandlePointerMove =
  (map: Map) =>
  (event: MapBrowserEvent<PointerEvent | KeyboardEvent | WheelEvent>): void => {
    if (event.dragging) return;
    const target = map.getTargetElement();
    if (target === null) return;
    const hit = map.hasFeatureAtPixel(event.pixel, {
      hitTolerance: HIT_TOLERANCE_PX,
    });
    target.style.cursor = hit ? 'pointer' : '';
  };
