import { Player, HitRecord, Team } from '../../lib/types';

export const HIT_RADIUS = 0.035; // Normalized radius for player marker

export function calculateHits(
  players: Player[],
  teamMode: boolean
): { hits: HitRecord[]; eliminatedIds: string[] } {
  const activePlayers = players.filter((p) => !p.eliminated);
  const eliminatedSet = new Set<string>();
  const hits: HitRecord[] = [];

  for (const shooter of activePlayers) {
    const ox = shooter.x;
    const oy = shooter.y;
    const dx = Math.cos(shooter.laserAngle);
    const dy = Math.sin(shooter.laserAngle);

    for (const target of activePlayers) {
      // Rule 16: Self-hit is ignored
      if (shooter.id === target.id) continue;

      // Rule 19: Friendly fire check
      if (teamMode && shooter.team && target.team && shooter.team === target.team) {
        continue;
      }

      const vx = target.x - ox;
      const vy = target.y - oy;

      // Projection along laser ray
      const t = vx * dx + vy * dy;

      // Must be in front of shooter (t > 0)
      if (t > 0) {
        // Distance perpendicular to ray
        const perpendicularDist = Math.abs(vx * -dy + vy * dx);

        if (perpendicularDist <= HIT_RADIUS) {
          eliminatedSet.add(target.id);
          hits.push({
            shooterId: shooter.id,
            targetId: target.id,
            shooterName: shooter.name,
            targetName: target.name,
          });
        }
      }
    }
  }

  return {
    hits,
    eliminatedIds: Array.from(eliminatedSet),
  };
}

export function calculateArenaScale(activePlayerCount: number, currentRound: number = 1): number {
  // Reduces scale by 0.12 per round starting from Round 1 (1.0 -> 0.88 -> 0.76 -> 0.64 -> 0.52 -> 0.45)
  const roundOffset = Math.max(0, currentRound - 1);
  const scale = 1.0 - roundOffset * 0.12;
  return Math.max(0.45, scale);
}



export function remapPlayerPosition(
  x: number,
  y: number,
  oldScale: number,
  newScale: number
): { x: number; y: number } {
  // Center is 0.5, 0.5
  // Bound at scale S is [0.5 - S/2, 0.5 + S/2]
  const half = newScale / 2;
  const minX = 0.5 - half;
  const maxX = 0.5 + half;
  const minY = 0.5 - half;
  const maxY = 0.5 + half;

  const clampedX = Math.max(minX + 0.03, Math.min(maxX - 0.03, x));
  const clampedY = Math.max(minY + 0.03, Math.min(maxY - 0.03, y));

  return { x: clampedX, y: clampedY };
}
