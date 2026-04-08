-- CASA MVP 트리거
-- 실행 순서: schema.sql → rls-policies.sql → triggers.sql

-- ============================================
-- Auth 사용자 생성 시 bi_users 자동 생성 트리거
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.bi_users (id, email, name, role, locale, theme)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    'user',
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'locale', '')::locale, 'ko'::locale),
    'system'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거 생성
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 프로젝트 생성 시 status 자동 설정
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_project_creation()
RETURNS TRIGGER AS $$
BEGIN
  -- 상태가 설정되지 않은 경우 기본값 설정
  IF NEW.status IS NULL THEN
    NEW.status := 'draft';
  END IF;

  IF NEW.current_stage IS NULL THEN
    NEW.current_stage := 'idea';
  END IF;

  IF NEW.current_gate IS NULL THEN
    NEW.current_gate := 'gate_1';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_project_create ON bi_projects;
CREATE TRIGGER on_project_create
  BEFORE INSERT ON bi_projects
  FOR EACH ROW EXECUTE FUNCTION public.handle_project_creation();

-- ============================================
-- 아이디어 확정 시 프로젝트 상태 자동 업데이트
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_idea_confirmation()
RETURNS TRIGGER AS $$
BEGIN
  -- is_confirmed가 false → true로 변경된 경우
  IF OLD.is_confirmed = false AND NEW.is_confirmed = true THEN
    -- 프로젝트 상태 업데이트
    UPDATE bi_projects
    SET
      current_stage = 'evaluation',
      current_gate = 'gate_2',
      gate_1_passed_at = NOW(),
      updated_at = NOW()
    WHERE id = NEW.project_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_idea_confirmed ON bi_idea_cards;
CREATE TRIGGER on_idea_confirmed
  AFTER UPDATE ON bi_idea_cards
  FOR EACH ROW EXECUTE FUNCTION public.handle_idea_confirmation();

-- ============================================
-- 평가 확정 시 프로젝트 상태 자동 업데이트
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_evaluation_confirmation()
RETURNS TRIGGER AS $$
BEGIN
  -- is_confirmed가 false → true로 변경된 경우
  IF OLD.is_confirmed = false AND NEW.is_confirmed = true THEN
    -- 프로젝트 상태 업데이트
    UPDATE bi_projects
    SET
      current_stage = 'document',
      current_gate = 'gate_3',
      gate_2_passed_at = NOW(),
      updated_at = NOW()
    WHERE id = NEW.project_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_evaluation_confirmed ON bi_evaluations;
CREATE TRIGGER on_evaluation_confirmed
  AFTER UPDATE ON bi_evaluations
  FOR EACH ROW EXECUTE FUNCTION public.handle_evaluation_confirmation();

-- ============================================
-- 프롬프트 수정 시 버전 자동 증가
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_prompt_version_increment()
RETURNS TRIGGER AS $$
BEGIN
  -- system_prompt 또는 user_prompt_template이 변경된 경우
  IF OLD.system_prompt IS DISTINCT FROM NEW.system_prompt
     OR OLD.user_prompt_template IS DISTINCT FROM NEW.user_prompt_template THEN
    NEW.version := OLD.version + 1;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_prompt_update ON bi_prompts;
CREATE TRIGGER on_prompt_update
  BEFORE UPDATE ON bi_prompts
  FOR EACH ROW EXECUTE FUNCTION public.handle_prompt_version_increment();
