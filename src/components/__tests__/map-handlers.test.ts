import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { coordinates, FacilitySet, type Site, siteId } from '../../domain';
import { useSelectedSite } from '../../store/selected-site';
import {
  HIT_TOLERANCE_PX,
  makeHandleClick,
  makeHandlePointerMove,
} from '../map-handlers';

const fakeFeature = (id?: string): { getId: () => unknown } => ({
  getId: () => id,
});

interface FakeMap {
  forEachFeatureAtPixel: ReturnType<typeof vi.fn>;
  hasFeatureAtPixel: ReturnType<typeof vi.fn>;
  getTargetElement: ReturnType<typeof vi.fn>;
}

const fakeMap = (overrides: Partial<FakeMap> = {}): FakeMap => ({
  forEachFeatureAtPixel: vi.fn(),
  hasFeatureAtPixel: vi.fn().mockReturnValue(false),
  getTargetElement: vi.fn().mockReturnValue(null),
  ...overrides,
});

const baseSite: Site = {
  id: siteId('feat-1'),
  riverSegment: 'Lake Umatilla',
  riverName: 'Columbia',
  riverMile: 234,
  bank: 'OR',
  coordinates: coordinates(-120.37, 45.695),
  facilities: FacilitySet.empty(),
};

beforeEach(() => {
  useSelectedSite.getState().close();
});

afterEach(() => {
  vi.restoreAllMocks();
});

const clickEvent = (pixel: [number, number]) =>
  ({
    pixel,
    dragging: false,
  }) as unknown as Parameters<ReturnType<typeof makeHandleClick>>[0];

const pointerEvent = (
  pixel: [number, number],
  dragging = false
): Parameters<ReturnType<typeof makeHandlePointerMove>>[0] =>
  ({
    pixel,
    dragging,
  }) as unknown as Parameters<ReturnType<typeof makeHandlePointerMove>>[0];

describe('makeHandleClick', () => {
  it('selects the site whose feature was hit', async () => {
    const map = fakeMap();
    map.forEachFeatureAtPixel.mockImplementation(
      (_pixel, callback: (f: { getId: () => unknown }) => boolean) => {
        callback(fakeFeature('feat-1'));
      }
    );
    const getSite = vi.fn().mockResolvedValue(baseSite);

    const handle = makeHandleClick(map as never, getSite);
    handle(clickEvent([100, 100]));
    await vi.waitFor(() => {
      expect(useSelectedSite.getState().selectedSite).toBe(baseSite);
    });
    expect(getSite).toHaveBeenCalledWith('feat-1');
  });

  it('does nothing when no feature is hit', async () => {
    const map = fakeMap();
    map.forEachFeatureAtPixel.mockImplementation(() => undefined);
    const getSite = vi.fn();

    makeHandleClick(map as never, getSite)(clickEvent([0, 0]));
    await Promise.resolve();
    expect(getSite).not.toHaveBeenCalled();
    expect(useSelectedSite.getState().selectedSite).toBeNull();
  });

  it('ignores features whose id is not a string', () => {
    const map = fakeMap();
    map.forEachFeatureAtPixel.mockImplementation(
      (_pixel, callback: (f: { getId: () => unknown }) => boolean) => {
        callback(fakeFeature());
        callback(fakeFeature(42 as unknown as string));
      }
    );
    const getSite = vi.fn();
    makeHandleClick(map as never, getSite)(clickEvent([0, 0]));
    expect(getSite).not.toHaveBeenCalled();
  });

  it('logs and swallows getSite rejections', async () => {
    const map = fakeMap();
    map.forEachFeatureAtPixel.mockImplementation(
      (_pixel, callback: (f: { getId: () => unknown }) => boolean) => {
        callback(fakeFeature('feat-1'));
      }
    );
    const error = new Error('network down');
    const getSite = vi.fn().mockRejectedValue(error);
    const consoleSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    makeHandleClick(map as never, getSite)(clickEvent([0, 0]));
    await vi.waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to load site', error);
    });
    expect(useSelectedSite.getState().selectedSite).toBeNull();
  });
});

describe('makeHandlePointerMove', () => {
  it('sets pointer cursor when the pixel is over a feature', () => {
    const target = document.createElement('div');
    const map = fakeMap({
      hasFeatureAtPixel: vi.fn().mockReturnValue(true),
      getTargetElement: vi.fn().mockReturnValue(target),
    });
    makeHandlePointerMove(map as never)(pointerEvent([10, 10]));
    expect(target.style.cursor).toBe('pointer');
    expect(map.hasFeatureAtPixel).toHaveBeenCalledWith([10, 10], {
      hitTolerance: HIT_TOLERANCE_PX,
    });
  });

  it('clears the cursor when the pixel is empty', () => {
    const target = document.createElement('div');
    target.style.cursor = 'pointer';
    const map = fakeMap({
      hasFeatureAtPixel: vi.fn().mockReturnValue(false),
      getTargetElement: vi.fn().mockReturnValue(target),
    });
    makeHandlePointerMove(map as never)(pointerEvent([10, 10]));
    expect(target.style.cursor).toBe('');
  });

  it('skips while the user is dragging', () => {
    const map = fakeMap();
    makeHandlePointerMove(map as never)(pointerEvent([10, 10], true));
    expect(map.hasFeatureAtPixel).not.toHaveBeenCalled();
    expect(map.getTargetElement).not.toHaveBeenCalled();
  });

  it('returns silently when target element is null', () => {
    const map = fakeMap({
      getTargetElement: vi.fn().mockReturnValue(null),
    });
    makeHandlePointerMove(map as never)(pointerEvent([10, 10]));
    expect(map.hasFeatureAtPixel).not.toHaveBeenCalled();
  });
});
