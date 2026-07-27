import type { GraphPreferenceSettings } from "@entral/contracts";
import { graphPerformancePolicy } from "./graph-diagnostics";

export type EffectiveGraphLevelOfDetail =
  | "FULL"
  | "BALANCED"
  | "AGGRESSIVE";

const qualityRank = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2
} as const;

function cappedQuality(
  requested: GraphPreferenceSettings["advanced_shared"]["rendering_quality"],
  maximum: GraphPreferenceSettings["advanced_shared"]["rendering_quality"]
) {
  return qualityRank[requested] <= qualityRank[maximum] ? requested : maximum;
}

export function resolveGraphLevelOfDetail(
  requested: GraphPreferenceSettings["advanced_shared"]["level_of_detail"],
  entityCount: number
): EffectiveGraphLevelOfDetail {
  if (requested !== "AUTO") return requested;
  const automatic = graphPerformancePolicy(entityCount).levelOfDetail;
  if (automatic === "full") return "FULL";
  if (automatic === "balanced") return "BALANCED";
  return "AGGRESSIVE";
}

/**
 * Applies renderer detail limits without changing the authorized projection.
 * LOD may reduce label count and pixel density, but it never removes canonical
 * nodes or edges from either renderer.
 */
export function effectiveGraphRendererSettings(
  settings: GraphPreferenceSettings,
  entityCount: number
): {
  readonly effectiveLevelOfDetail: EffectiveGraphLevelOfDetail;
  readonly settings: GraphPreferenceSettings;
} {
  const effectiveLevelOfDetail = resolveGraphLevelOfDetail(
    settings.advanced_shared.level_of_detail,
    entityCount
  );
  const policy = graphPerformancePolicy(entityCount);
  const canonicalEntityCount = Math.max(
    0,
    Math.floor(Number.isFinite(entityCount) ? entityCount : 0)
  );
  const maximumLiveLabels =
    effectiveLevelOfDetail === "FULL"
      ? settings.advanced_shared.maximum_live_labels
      : Math.min(
        settings.advanced_shared.maximum_live_labels,
        effectiveLevelOfDetail === "BALANCED"
          ? Math.min(300, canonicalEntityCount)
          : Math.min(policy.maximumLiveLabels, 240, canonicalEntityCount)
      );
  const renderingQuality =
    effectiveLevelOfDetail === "FULL"
      ? settings.advanced_shared.rendering_quality
      : cappedQuality(
        settings.advanced_shared.rendering_quality,
        effectiveLevelOfDetail === "BALANCED" ? "MEDIUM" : "LOW"
      );
  return {
    effectiveLevelOfDetail,
    settings: {
      ...settings,
      advanced_shared: {
        ...settings.advanced_shared,
        maximum_live_labels: maximumLiveLabels,
        rendering_quality: renderingQuality
      }
    }
  };
}
