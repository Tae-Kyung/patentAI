export interface KiprisPatent {
  patentNumber: string
  title: string
  abstract: string
  applicant: string
  ipcCode: string
  applicationDate: string
}

function parseKiprisResponse(xml: string): KiprisPatent[] {
  const results: KiprisPatent[] = []

  // 특허 항목 추출 (item 태그)
  const itemRegex = /<item>([\s\S]*?)<\/item>/g
  let match: RegExpExecArray | null

  while ((match = itemRegex.exec(xml)) !== null) {
    const item = match[1]
    const get = (tag: string) => {
      const m = item.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`))
      return m ? m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, '$1').trim() : ''
    }

    results.push({
      patentNumber: get('applicationNumber') || get('registerNumber') || '',
      title: get('inventionTitle'),
      abstract: get('astrtCont'),
      applicant: get('applicantName'),
      ipcCode: get('ipcNumber'),
      applicationDate: get('applicationDate'),
    })
  }

  return results
}

export async function searchKipris(
  keywords: string[],
  ipcCodes: string[],
): Promise<KiprisPatent[]> {
  const apiKey = process.env.KIPRIS_API_KEY
  if (!apiKey) {
    console.warn('[KIPRIS] API key not set, skipping search')
    return []
  }

  try {
    const query = keywords.slice(0, 5).join(' ')
    const url = 'https://plus.kipris.or.kr/openapi/rest/patUtiModInfoSearchSevice/patentUtilityInfo'
    const params = new URLSearchParams({
      ServiceKey: apiKey,
      word: query,
      ipcCpc: ipcCodes[0] ?? '',
      numOfRows: '10',
      pageNo: '1',
      type: 'patent',
    })

    const res = await fetch(`${url}?${params}`, {
      headers: { Accept: 'application/xml' },
      signal: AbortSignal.timeout(10_000),
    })

    if (!res.ok) {
      console.warn('[KIPRIS] Request failed:', res.status)
      return []
    }

    return parseKiprisResponse(await res.text())
  } catch (err) {
    console.warn('[KIPRIS] Error:', err)
    return []
  }
}
