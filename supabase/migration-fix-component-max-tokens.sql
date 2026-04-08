-- patent_component_structuring 프롬프트 max_tokens 증가
-- 문제: 3000 토큰으로 JSON이 잘려 파싱 오류 발생
-- 해결: 8000 토큰으로 증가

UPDATE patentai_prompts
SET
  max_tokens = 8000,
  updated_at = NOW()
WHERE key = 'patent_component_structuring';
