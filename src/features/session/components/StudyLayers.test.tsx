/**
 * StudyLayers unit tests
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { StudyLayers } from './StudyLayers'

const LAYERS = [
  'Coronary artery is occluded — myocardial ischemia is active.',
  'Every minute without intervention = more irreversible damage.',
  'Morphine reduces preload and pain, decreasing cardiac workload.',
  'HR stabilizes, pain decreases, patient ready for cath lab.',
]

describe('StudyLayers', () => {
  it('renders SNL Method Breakdown title', () => {
    render(<StudyLayers layers={LAYERS} onAllUnlocked={vi.fn()} />)

    expect(screen.getByText('SNL Method Breakdown')).toBeInTheDocument()
  })

  it('renders all 4 layer names', () => {
    render(<StudyLayers layers={LAYERS} onAllUnlocked={vi.fn()} />)

    expect(screen.getByText('Core Problem')).toBeInTheDocument()
    expect(screen.getByText('Complication')).toBeInTheDocument()
    expect(screen.getByText('Connection')).toBeInTheDocument()
    expect(screen.getByText('Confirmation')).toBeInTheDocument()
  })

  it('layer 1 (Core Problem) is auto-revealed', () => {
    render(<StudyLayers layers={LAYERS} onAllUnlocked={vi.fn()} />)

    expect(screen.getByText(LAYERS[0])).toBeInTheDocument()
  })

  it('layer 2 shows "Tap to unlock" hint', () => {
    render(<StudyLayers layers={LAYERS} onAllUnlocked={vi.fn()} />)

    expect(screen.getByText('Tap to unlock →')).toBeInTheDocument()
  })

  it('layers 3 and 4 show locked text', () => {
    render(<StudyLayers layers={LAYERS} onAllUnlocked={vi.fn()} />)

    expect(screen.getByText('🔒 Unlock Complication first')).toBeInTheDocument()
    expect(screen.getByText('🔒 Unlock Connection first')).toBeInTheDocument()
  })

  it('tapping layer 2 reveals its content', async () => {
    const user = userEvent.setup()
    render(<StudyLayers layers={LAYERS} onAllUnlocked={vi.fn()} />)

    await user.click(screen.getByTestId('layer-1'))

    expect(screen.getByText(LAYERS[1])).toBeInTheDocument()
  })

  it('after unlocking layer 2, layer 3 shows tap hint', async () => {
    const user = userEvent.setup()
    render(<StudyLayers layers={LAYERS} onAllUnlocked={vi.fn()} />)

    await user.click(screen.getByTestId('layer-1'))

    expect(screen.getByText('Tap to unlock →')).toBeInTheDocument()
  })

  it('tapping locked layer 3 before 2 does nothing', async () => {
    const user = userEvent.setup()
    render(<StudyLayers layers={LAYERS} onAllUnlocked={vi.fn()} />)

    await user.click(screen.getByTestId('layer-2'))

    expect(screen.queryByText(LAYERS[2])).not.toBeInTheDocument()
  })

  it('unlocking all 4 layers sequentially reveals all content', async () => {
    const user = userEvent.setup()
    render(<StudyLayers layers={LAYERS} onAllUnlocked={vi.fn()} />)

    await user.click(screen.getByTestId('layer-1'))
    await user.click(screen.getByTestId('layer-2'))
    await user.click(screen.getByTestId('layer-3'))

    expect(screen.getByText(LAYERS[0])).toBeInTheDocument()
    expect(screen.getByText(LAYERS[1])).toBeInTheDocument()
    expect(screen.getByText(LAYERS[2])).toBeInTheDocument()
    expect(screen.getByText(LAYERS[3])).toBeInTheDocument()
  })

  it('calls onAllUnlocked after layer 4 is revealed', async () => {
    const onAllUnlocked = vi.fn()
    const user = userEvent.setup()
    render(<StudyLayers layers={LAYERS} onAllUnlocked={onAllUnlocked} />)

    await user.click(screen.getByTestId('layer-1'))
    await user.click(screen.getByTestId('layer-2'))
    await user.click(screen.getByTestId('layer-3'))

    // setTimeout(onAllUnlocked, 400) fires after all layers unlocked
    await vi.waitFor(() => {
      expect(onAllUnlocked).toHaveBeenCalledTimes(1)
    }, { timeout: 1000 })
  })

  it('layer 1 has unlocked class', () => {
    render(<StudyLayers layers={LAYERS} onAllUnlocked={vi.fn()} />)

    const layer0 = screen.getByTestId('layer-0')
    expect(layer0.className).toContain('unlocked')
  })

  it('layer 1 dot has lit class', () => {
    render(<StudyLayers layers={LAYERS} onAllUnlocked={vi.fn()} />)

    const layer0 = screen.getByTestId('layer-0')
    const dot = layer0.querySelector('.layer-dot')
    expect(dot?.className).toContain('lit')
  })

  it('layer 2 has next-up class', () => {
    render(<StudyLayers layers={LAYERS} onAllUnlocked={vi.fn()} />)

    const layer1 = screen.getByTestId('layer-1')
    expect(layer1.className).toContain('next-up')
  })

  it('layer 2 dot has next class', () => {
    render(<StudyLayers layers={LAYERS} onAllUnlocked={vi.fn()} />)

    const layer1 = screen.getByTestId('layer-1')
    const dot = layer1.querySelector('.layer-dot')
    expect(dot?.className).toContain('next')
  })

  it('layer 1 name has layer-name-open class', () => {
    render(<StudyLayers layers={LAYERS} onAllUnlocked={vi.fn()} />)

    const name = screen.getByText('Core Problem')
    expect(name.className).toContain('layer-name-open')
  })

  it('layer 2 name has layer-name-next class', () => {
    render(<StudyLayers layers={LAYERS} onAllUnlocked={vi.fn()} />)

    const name = screen.getByText('Complication')
    expect(name.className).toContain('layer-name-next')
  })

  it('layers 3-4 names have layer-name-locked class', () => {
    render(<StudyLayers layers={LAYERS} onAllUnlocked={vi.fn()} />)

    expect(screen.getByText('Connection').className).toContain('layer-name-locked')
    expect(screen.getByText('Confirmation').className).toContain('layer-name-locked')
  })

  it('handles empty layers array gracefully', () => {
    render(<StudyLayers layers={[]} onAllUnlocked={vi.fn()} />)

    expect(screen.getByText('Core Problem')).toBeInTheDocument()
  })
})
