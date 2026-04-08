export interface UsptoPatent {
  patentNumber: string
  title: string
  abstract: string
  assignee: string
  filingDate: string
}

interface UsptoApiPatent {
  patent_id: string
  patent_title: string
  patent_abstract: string
  assignees?: { assignee_organization: string }[]
  application_filing_date?: string
}

interface UsptoApiResponse {
  patents?: UsptoApiPatent[]
  error?: string
}

export async function searchUsptoPatents(keywords: string[]): Promise<UsptoPatent[]> {
  try {
    const url = 'https://search.patentsview.org/api/v1/patent/'
    const body = {
      q: {
        _text_any: {
          patent_abstract: keywords.slice(0, 5).join(' '),
        },
      },
      f: [
        'patent_id',
        'patent_title',
        'patent_abstract',
        'assignee_organization',
        'application_filing_date',
      ],
      o: { per_page: 10 },
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    })

    if (!res.ok) {
      console.warn('[USPTO] Request failed:', res.status)
      return []
    }

    const json = (await res.json()) as UsptoApiResponse
    if (!json.patents) return []

    return json.patents.map((p) => ({
      patentNumber: p.patent_id ?? '',
      title: p.patent_title ?? '',
      abstract: p.patent_abstract ?? '',
      assignee: p.assignees?.[0]?.assignee_organization ?? '',
      filingDate: p.application_filing_date ?? '',
    }))
  } catch (err) {
    console.warn('[USPTO] Error:', err)
    return []
  }
}
