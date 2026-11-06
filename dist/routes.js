export const ROUTES = [
  { name: '海盐公路', description: '海岸顺风 · 平缓起伏 · 冲刺收集', speed: 270, gravity: 1300, pearlChance: .4, spacing: 710, sections: ['海湾热身', '顺风海岸', '日光冲线'] },
  { name: '翡翠雨林', description: '林间丘陵 · 连续跳跃 · 原木跳板', speed: 252, gravity: 1340, pearlChance: .45, spacing: 690, sections: ['蕨叶小径', '林间丘陵', '树梢飞跃'] },
  { name: '星夜灯塔', description: '轻盈滑翔 · 高空珍珠 · 月光圆环', speed: 262, gravity: 1160, pearlChance: .78, spacing: 740, sections: ['星光港湾', '月下滑翔', '灯塔归航'] }
];
const wave = (x, biome) => biome === 1
  ? 650 + Math.sin(x / 420) * 64 + Math.sin(x / 170) * 15 + Math.sin(x / 1100) * 20
  : biome === 2
    ? 650 + Math.sin(x / 540) * 38 + Math.sin(x / 230) * 17 + Math.sin(x / 1300) * 20
    : 650 + Math.sin(x / 480) * 30 + Math.sin(x / 180) * 12 + Math.sin(x / 1100) * 25;
export function biomeAt(x, firstBiome, endless) { return endless ? (firstBiome + Math.max(0, Math.floor(x / 9000))) % 3 : firstBiome; }
export function sampleTerrain(x, firstBiome = 0, endless = false) {
  const biome = biomeAt(x, firstBiome, endless);
  if (!endless || x < 9000) return wave(x, biome);
  const progress = Math.min(1, (x % 9000) / 650), smooth = progress * progress * (3 - 2 * progress);
  return wave(x, (biome + 2) % 3) * (1 - smooth) + wave(x, biome) * smooth;
}
export function sectionAt(distance, biome, endless = false) {
  const progress = endless ? distance % 900 : distance;
  const index = Math.min(2, Math.floor(progress / (endless ? 300 : 400)));
  return { label: ROUTES[biome].sections[index], index, wind: biome === 0 ? [0, 34, 18][index] : 0 };
}
