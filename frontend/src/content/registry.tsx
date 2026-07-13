import type { JSX } from 'react';
import { ActEikonalContext } from './actEikonal';
import { DeltaGeometryContext } from './deltaGeometry';

// case id -> the deep bilingual context block. New verticals register their content component here.
export const CONTEXT_REGISTRY: Record<string, () => JSX.Element> = {
  'act-eikonal-mapping': ActEikonalContext,
  'delta-pinn-geometry': DeltaGeometryContext,
};
