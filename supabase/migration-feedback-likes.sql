-- bi_feedback_likes: 피드백 좋아요 테이블
CREATE TABLE IF NOT EXISTS bi_feedback_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id UUID NOT NULL REFERENCES bi_feedbacks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES bi_users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(feedback_id, user_id)
);

CREATE INDEX idx_bi_feedback_likes_feedback_id ON bi_feedback_likes(feedback_id);
CREATE INDEX idx_bi_feedback_likes_user_id ON bi_feedback_likes(user_id);

-- RLS
ALTER TABLE bi_feedback_likes ENABLE ROW LEVEL SECURITY;

-- 누구나 좋아요 조회 가능 (프로젝트 접근 권한은 API에서 체크)
CREATE POLICY "feedback_likes_select" ON bi_feedback_likes
  FOR SELECT USING (true);

-- 본인의 좋아요만 추가/삭제 가능
CREATE POLICY "feedback_likes_insert" ON bi_feedback_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "feedback_likes_delete" ON bi_feedback_likes
  FOR DELETE USING (auth.uid() = user_id);
