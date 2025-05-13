import { createSupabase } from '@/lib/supabase';

type AnalysisType =
  | 'object_detection_basic'
  | 'duplicate_check'
  | 'quality_assessment'
  | 'basic_caption'
  | 'scene_classification'
  | 'safety_detection'
  | 'detailed_caption'
  | 'face_recognition'
  | 'relationship_analysis';

export async function getCurrentTier(mediaId: string): Promise<number> {
  const supabase = createSupabase();
  const { data } = await supabase
    .from('analysis_data')
    .select('type')
    .eq('media_id', mediaId);

  if (!data || data.length === 0) return 0;

  const tierMapping = {
    object_detection_basic: 1,
    duplicate_check: 1,
    quality_assessment: 1,
    basic_caption: 2,
    scene_classification: 2,
    safety_detection: 2,
    detailed_caption: 3,
    face_recognition: 3,
    relationship_analysis: 3,
  };

  return data.reduce((highest, analysis) => {
    return Math.max(highest, tierMapping[analysis.type as AnalysisType] || 0);
  }, 0);
}
