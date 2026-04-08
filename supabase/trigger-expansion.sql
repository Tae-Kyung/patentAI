-- ============================================
-- CASA 확장판 트리거 업데이트 (모두의 창업)
--
-- 전략 변경: 트리거는 기본 유저만 생성하고,
-- 역할 설정은 POST /api/auth/post-signup API에서 처리.
-- 이렇게 하면 ENUM/컬럼 문제로 가입이 실패하지 않음.
-- ============================================

-- 안전한 트리거: 항상 role='user'로 생성
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
