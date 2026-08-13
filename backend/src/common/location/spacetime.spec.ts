import { BadRequestException } from '@nestjs/common';
import { prepareSpacetime } from './spacetime';

describe('prepareSpacetime', () => {
  const assertPlace = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => assertPlace.mockClear());

  it('keeps an omitted location private by default', async () => {
    await expect(
      prepareSpacetime({}, undefined, assertPlace),
    ).resolves.toMatchObject({
      placeId: null,
      occurredAt: null,
      locationVisibility: 'private',
      locationPrecision: 'place',
      locationSource: null,
    });
    expect(assertPlace).not.toHaveBeenCalled();
  });

  it('rejects exact coordinates under blurred visibility', async () => {
    await expect(
      prepareSpacetime(
        {
          placeId: '9ff36ed1-cf10-43e8-9c67-17967a676202',
          locationVisibility: 'blurred',
          locationPrecision: 'exact',
        },
        undefined,
        assertPlace,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requires and records explicit confirmation for exact public coordinates', async () => {
    const input = {
      placeId: '9ff36ed1-cf10-43e8-9c67-17967a676202',
      locationVisibility: 'public' as const,
      locationPrecision: 'exact' as const,
    };
    await expect(
      prepareSpacetime(input, undefined, assertPlace),
    ).rejects.toThrow('二次确认');
    await expect(
      prepareSpacetime(
        { ...input, confirmExactLocation: true },
        undefined,
        assertPlace,
      ),
    ).resolves.toMatchObject({
      locationVisibility: 'public',
      locationPrecision: 'exact',
    });
  });
});
