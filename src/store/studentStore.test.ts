/**
 * studentStore unit tests
 */

import { afterEach, describe, expect, it } from 'vitest'

import { useStudentStore } from './studentStore'

describe('studentStore', () => {
  afterEach(() => {
    useStudentStore.getState().reset()
  })

  it('has correct initial state', () => {
    const state = useStudentStore.getState()

    expect(state.nickname).toBe('')
    expect(state.testerType).toBeNull()
    expect(state.confidence).toBeNull()
    expect(state.testDays).toBe(0)
    expect(state.dailyCards).toBe(35)
    expect(state.onboarded).toBe(false)
    expect(state.avatar).toBe('')
  })

  it('setNickname updates nickname', () => {
    useStudentStore.getState().setNickname('Nurse Keisha')

    expect(useStudentStore.getState().nickname).toBe('Nurse Keisha')
  })

  it('setTesterType updates testerType', () => {
    useStudentStore.getState().setTesterType('repeat')

    expect(useStudentStore.getState().testerType).toBe('repeat')
  })

  it('setConfidence updates confidence', () => {
    useStudentStore.getState().setConfidence('confident')

    expect(useStudentStore.getState().confidence).toBe('confident')
  })

  it('setTestDate updates testDate and testDays', () => {
    useStudentStore.getState().setTestDate('2026-06-01', 45)

    expect(useStudentStore.getState().testDate).toBe('2026-06-01')
    expect(useStudentStore.getState().testDays).toBe(45)
  })

  it('setDailyCards updates dailyCards', () => {
    useStudentStore.getState().setDailyCards(50)

    expect(useStudentStore.getState().dailyCards).toBe(50)
  })

  it('setOnboarded updates onboarded', () => {
    useStudentStore.getState().setOnboarded(true)

    expect(useStudentStore.getState().onboarded).toBe(true)
  })

  it('setAvatar updates avatar', () => {
    useStudentStore.getState().setAvatar('fire')

    expect(useStudentStore.getState().avatar).toBe('fire')
  })

  it('loadFromStudent populates all fields', () => {
    useStudentStore.getState().loadFromStudent({
      id: 'abc-123',
      nickname: 'Nurse Dev',
      tester_type: 'first_time',
      confidence: 'nervous',
      test_date: '2026-07-01',
      daily_cards: 25,
      onboarded: true,
    })

    const state = useStudentStore.getState()
    expect(state.nickname).toBe('Nurse Dev')
    expect(state.testerType).toBe('first_time')
    expect(state.confidence).toBe('nervous')
    expect(state.testDate).toBe('2026-07-01')
    expect(state.dailyCards).toBe(25)
    expect(state.onboarded).toBe(true)
  })

  it('reset clears all fields', () => {
    useStudentStore.getState().setNickname('Test')
    useStudentStore.getState().setOnboarded(true)
    useStudentStore.getState().setAvatar('fire')

    useStudentStore.getState().reset()

    const state = useStudentStore.getState()
    expect(state.nickname).toBe('')
    expect(state.onboarded).toBe(false)
    expect(state.avatar).toBe('')
  })
})
