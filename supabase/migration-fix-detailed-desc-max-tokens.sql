-- patent_section_detailed_desc 프롬프트 max_tokens 증가
-- 문제: 6000 토큰으로 상세한 설명이 중간에 끊김
-- 해결: 16000 토큰으로 증가

UPDATE patentai_prompts
SET
  max_tokens = 16000,
  updated_at = NOW()
WHERE key = 'patent_section_detailed_desc';
