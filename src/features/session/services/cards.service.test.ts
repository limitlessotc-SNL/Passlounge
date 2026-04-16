/**
 * cards.service unit tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockFrom = vi.fn()

vi.mock('@/config/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

import { fetchDiagnosticCards, fetchStudyCards, mapSupabaseCard } from './cards.service'

function chainMock(finalResult: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {}
  const self = () => chain
  chain.select = vi.fn().mockImplementation(self)
  chain.eq = vi.fn().mockImplementation(self)
  chain.order = vi.fn().mockImplementation(self)
  chain.limit = vi.fn().mockResolvedValue(finalResult)
  // fetchDiagnosticCards ends at .order() (no .limit())
  chain.order.mockImplementation((..._args: unknown[]) => {
    // Return chain for further chaining, but also resolve as promise
    const c = { ...chain, then: (r: (v: unknown) => void) => Promise.resolve(finalResult).then(r) }
    return c
  })
  // fetchStudyCards ends at .limit()
  chain.limit.mockResolvedValue(finalResult)
  mockFrom.mockReturnValue(chain)
  return chain
}

describe('cards.service', () => {
  beforeEach(() => { vi.clearAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  // ── mapSupabaseCard ─────────────────────────────────────────────────

  describe('mapSupabaseCard', () => {
    it('maps a full row to StudyCard', () => {
      const row = {
        id: 'card-1',
        title: 'MI Priority',
        cat: 'Cardiac',
        bloom: 'Apply',
        xp: 20,
        type: 'Multiple Choice · Cardiac',
        scenario: 'A patient arrives...',
        question: 'What is the priority?',
        opts: ['A. Morphine', 'B. Consent', 'C. IV', 'D. Notify'],
        correct: 0,
        layers: ['Core', 'Comp', 'Conn', 'Conf'],
        lens: 'Assessment vs Intervention',
        pearl: 'Remember MONA',
        mnemonic: [['M', 'Morphine'], ['O', 'Oxygen']],
        why_wrong: { 'Consent': 'Not first' },
        difficulty_level: 2,
        difficulty_label: 'Application',
        nclex_category: 'Cardiac',
      }

      const card = mapSupabaseCard(row)

      expect(card.id).toBe('card-1')
      expect(card.title).toBe('MI Priority')
      expect(card.cat).toBe('Cardiac')
      expect(card.opts).toEqual(['A. Morphine', 'B. Consent', 'C. IV', 'D. Notify'])
      expect(card.correct).toBe(0)
      expect(card.layers).toEqual(['Core', 'Comp', 'Conn', 'Conf'])
      expect(card.pearl).toBe('Remember MONA')
    })

    it('parses JSON string fields', () => {
      const row = {
        opts: '["A. One","B. Two","C. Three","D. Four"]',
        layers: '["L1","L2","L3","L4"]',
        mnemonic: '[["A","Alpha"]]',
        why_wrong: '{"Two":"Because..."}',
      }

      const card = mapSupabaseCard(row)

      expect(card.opts).toEqual(['A. One', 'B. Two', 'C. Three', 'D. Four'])
      expect(card.layers).toEqual(['L1', 'L2', 'L3', 'L4'])
      expect(card.mnemonic).toEqual([['A', 'Alpha']])
      expect(card.why_wrong).toEqual({ Two: 'Because...' })
    })

    it('handles missing fields with defaults', () => {
      const card = mapSupabaseCard({})

      expect(card.title).toBe('')
      expect(card.cat).toBe('')
      expect(card.bloom).toBe('Apply')
      expect(card.xp).toBe(20)
      expect(card.correct).toBe(0)
      expect(card.difficulty_level).toBe(2)
    })

    it('parses string correct value to number', () => {
      const card = mapSupabaseCard({ correct: '2' })

      expect(card.correct).toBe(2)
    })

    it('handles null opts gracefully', () => {
      const card = mapSupabaseCard({ opts: null })

      expect(card.opts).toEqual([])
    })
  })

  // ── fetchStudyCards ─────────────────────────────────────────────────

  describe('fetchStudyCards', () => {
    it('returns mapped cards on success', async () => {
      const fakeRows = [
        { id: '1', title: 'Card 1', cat: 'Cardiac', opts: [], correct: 0, layers: [], mnemonic: [], why_wrong: {} },
        { id: '2', title: 'Card 2', cat: 'Pharma', opts: [], correct: 1, layers: [], mnemonic: [], why_wrong: {} },
      ]
      chainMock({ data: fakeRows, error: null })

      const result = await fetchStudyCards()

      expect(result.length).toBe(2)
      expect(result[0].title).toBe('Card 1')
      expect(result[1].cat).toBe('Pharma')
    })

    it('returns empty array when no cards', async () => {
      chainMock({ data: [], error: null })

      const result = await fetchStudyCards()

      expect(result).toEqual([])
    })

    it('returns empty array when data is null', async () => {
      chainMock({ data: null, error: null })

      const result = await fetchStudyCards()

      expect(result).toEqual([])
    })

    it('throws on error', async () => {
      chainMock({ data: null, error: new Error('DB error') })

      await expect(fetchStudyCards()).rejects.toThrow('DB error')
    })
  })

  // ── fetchDiagnosticCards ────────────────────────────────────────────

  describe('fetchDiagnosticCards', () => {
    it('returns mapped diagnostic cards', async () => {
      const fakeRows = [
        { id: 'd1', title: 'Diag 1', cat: 'Cardiac', opts: [], correct: 0, layers: [], mnemonic: [], why_wrong: {} },
      ]
      chainMock({ data: fakeRows, error: null })

      const result = await fetchDiagnosticCards()

      expect(result.length).toBe(1)
      expect(result[0].title).toBe('Diag 1')
    })

    it('throws on error', async () => {
      chainMock({ data: null, error: new Error('Fetch failed') })

      await expect(fetchDiagnosticCards()).rejects.toThrow('Fetch failed')
    })
  })
})
