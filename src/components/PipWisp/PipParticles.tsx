/**
 * PIP Memory Wisp — Particles layer
 *
 * Renders the ambient light particles floating around PIP.
 * Per-state behaviors from designer spec section 2.5:
 * - Idle:       2-3 particles, slow drift upward, fading
 * - Listening:  5-8 particles, drifting inward
 * - Thinking:   8-12 particles, orbiting (elliptical ring)
 * - Searching:  10-15 particles, spiral pattern
 * - Remembered: 15-20 burst, then settle to 3-4
 * - Success:    6-8 burst, dissolve outward
 */

import React, { useMemo } from "react";
import { Circle } from "react-native-svg";
import type { PipState } from "./animations";

// ──────────────────────────────────────────────
//  Types
// ──────────────────────────────────────────────

interface ParticleDef {
  id: number;
  angle: number;
  distance: number;
  radius: number;
  opacity: number;
  color: string;
}

interface ParticleStateData {
  id: number;
  cx: number;
  cy: number;
  r: number;
  opacity: number;
  color: string;
}

// ──────────────────────────────────────────────
//  Per-state position calculator
// ──────────────────────────────────────────────

/**
 * Computes particle positions based on state.
 * All calculations are static (not animated values) for SVG rendering.
 * The parent SVG <G> handles opacity animation for fade-in/out.
 */
function computeParticlePositions(
  width: number,
  particles: ParticleDef[],
  state: PipState,
  frame: number = 0,   // animation frame offset (0-1)
): ParticleStateData[] {
  const cx = width / 2;
  const cy = width / 2;

  return particles.map((p) => {
    let dx = 0;
    let dy = 0;
    const baseAngle = (p.angle * Math.PI) / 180;

    switch (state) {
      case "idle": {
        // Slow drift upward with slight wobble
        const drift = Math.sin(frame * Math.PI * 2 + p.id) * 3;
        dx = Math.cos(baseAngle) * p.distance + drift * 0.5;
        dy = Math.sin(baseAngle) * p.distance - drift * 1.2;
        break;
      }
      case "listening": {
        // Inward drift — particles move toward center
        const pull = 0.6 + frame * 0.1;
        dx = Math.cos(baseAngle) * p.distance * pull;
        dy = Math.sin(baseAngle) * p.distance * pull;
        break;
      }
      case "thinking": {
        // Elliptical orbit — designer spec: not perfect circle
        const orbitAngle = baseAngle + frame * Math.PI * 1.2;
        const ellipseX = p.distance * 1.35;
        const ellipseY = p.distance * 0.9;
        dx = Math.cos(orbitAngle) * ellipseX;
        dy = Math.sin(orbitAngle) * ellipseY;
        break;
      }
      case "searching": {
        // Spiral — radius decreases over time
        const spiralR = p.distance * (0.45 + 0.55 * (1 - frame));
        const spiralAngle = baseAngle + frame * Math.PI * 4;
        dx = Math.cos(spiralAngle) * spiralR;
        dy = Math.sin(spiralAngle) * spiralR;
        break;
      }
      case "remembered":
      case "success": {
        // Burst outward then settle
        const burstFactor = state === "success" ? 1.3 : 1.5;
        const burstR = p.distance * (1 + frame * burstFactor);
        dx = Math.cos(baseAngle) * burstR;
        dy = Math.sin(baseAngle) * burstR;
        break;
      }
      default:
        dx = Math.cos(baseAngle) * p.distance;
        dy = Math.sin(baseAngle) * p.distance;
    }

    return {
      id: p.id,
      cx: cx + dx,
      cy: cy + dy,
      r: p.radius,
      opacity: p.opacity,
      color: p.color,
    };
  });
}

// ──────────────────────────────────────────────
//  Component
// ──────────────────────────────────────────────

interface PipParticlesLayerProps {
  width: number;
  particles: ParticleDef[];
  rotationDeg?: number;
  state?: PipState;
  frame?: number;
}

export const PipParticlesLayer: React.FC<PipParticlesLayerProps> = ({
  width,
  particles,
  rotationDeg = 0,
  state = "idle",
  frame = 0,
}) => {
  const computed = useMemo(
    () => computeParticlePositions(width, particles, state, frame),
    [width, particles, state, frame],
  );

  const rotationRad = (rotationDeg * Math.PI) / 180;

  return (
    <>
      {computed.map((p) => {
        // Apply rotation if specified
        const rx = p.cx;
        const ry = p.cy;
        const rotatedX = (rx - width / 2) * Math.cos(rotationRad) - (ry - width / 2) * Math.sin(rotationRad) + width / 2;
        const rotatedY = (rx - width / 2) * Math.sin(rotationRad) + (ry - width / 2) * Math.cos(rotationRad) + width / 2;

        return (
          <Circle
            key={p.id}
            cx={rotatedX}
            cy={rotatedY}
            r={p.r}
            fill={p.color}
            opacity={p.opacity}
          />
        );
      })}
    </>
  );
};
