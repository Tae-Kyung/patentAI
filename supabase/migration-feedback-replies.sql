-- 멘토 피드백에 대한 답글(1단 깊이) 지원
-- parent_id 컬럼 추가

ALTER TABLE bi_feedbacks
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES bi_feedbacks(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_bi_feedbacks_parent_id ON bi_feedbacks(parent_id);

-- 답글 작성 RLS 정책: 프로젝트 소유자(멘티)도 답글 작성 가능
CREATE POLICY "Project owners can reply to feedbacks"
  ON bi_feedbacks FOR INSERT
  WITH CHECK (
    parent_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM bi_projects WHERE id = project_id AND user_id = auth.uid()
    )
  );
