export const defaultGrowth = { carrotSeconds: 180, treeSeconds: 180 };
export type GrowthSettings = typeof defaultGrowth;
export type CarrotPlant = {
  plantedAt: number;
  stage: 1 | 2 | 3;
  watered: boolean;
  wateredAt: number | null;
};

// One watering advances at most one stage, even after a long offline period.
export function carrotState(plant: CarrotPlant, stageSeconds: number, now = Date.now()) {
  if (plant.stage < 3 && plant.watered && plant.wateredAt !== null
    && now - plant.wateredAt >= Math.max(1, stageSeconds) * 1000) {
    return { ...plant, stage: (plant.stage + 1) as 2 | 3, watered: false, wateredAt: null };
  }
  return plant;
}

export function carrotRemaining(plant: CarrotPlant, stageSeconds: number, now = Date.now()) {
  return plant.wateredAt === null ? 0 : Math.max(0, Math.ceil((Math.max(1, stageSeconds) * 1000 - (now - plant.wateredAt)) / 1000));
}

// Stage 1 begins at planting/chopping; stage 3 remains mature until used.
export function growthState(startedAt: number, stageSeconds: number, now = Date.now()) {
  const duration = Math.max(1, stageSeconds) * 1000;
  const elapsed = Math.max(0, now - startedAt);
  const stage = Math.min(3, Math.floor(elapsed / duration) + 1);
  return { stage, remaining: stage === 3 ? 0 : Math.ceil((duration - elapsed % duration) / 1000) };
}

export function timeLabel(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
