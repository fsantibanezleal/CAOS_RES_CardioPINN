import type { JSX } from 'react';
import { ActEikonalContext } from './actEikonal';
import { DeltaGeometryContext } from './deltaGeometry';
import { FiberInverseContext } from './fiberInverse';
import { JointCvScarContext } from './jointCvScar';
import { ActiveSensingContext } from './activeSensing';
import { AfRotorContext } from './afRotor';

// case id -> the deep bilingual context block. New verticals register their content component here.
export const CONTEXT_REGISTRY: Record<string, () => JSX.Element> = {
  'act-eikonal-mapping': ActEikonalContext,
  'delta-pinn-geometry': DeltaGeometryContext,
  'fiber-conductivity-inverse': FiberInverseContext,
  'joint-cv-scar-uq': JointCvScarContext,
  'active-sensing': ActiveSensingContext,
  'af-phase-rotor': AfRotorContext,
};
