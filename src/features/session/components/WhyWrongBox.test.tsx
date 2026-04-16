/**
 * WhyWrongBox unit tests
 */

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { WhyWrongBox } from './WhyWrongBox'

const WHY_WRONG = {
  'Obtain consent': 'Consent is a Complication step — not your Core Problem action.',
  'Establish IV access': 'IV access is actually correct here.',
  'Notify cardiologist': 'Notification is delegation — never your first action.',
}

describe('WhyWrongBox', () => {
  it('renders explanation when visible and text matches', () => {
    render(
      <WhyWrongBox
        chosenText="B. Obtain consent"
        whyWrong={WHY_WRONG}
        visible={true}
      />,
    )

    expect(screen.getByText(/consent is a complication step/i)).toBeInTheDocument()
  })

  it('renders the chosen option in the header', () => {
    render(
      <WhyWrongBox
        chosenText="B. Obtain consent"
        whyWrong={WHY_WRONG}
        visible={true}
      />,
    )

    expect(screen.getByText(/why "obtain consent" is wrong/i)).toBeInTheDocument()
  })

  it('strips A/B/C/D label before lookup', () => {
    render(
      <WhyWrongBox
        chosenText="D. Notify cardiologist"
        whyWrong={WHY_WRONG}
        visible={true}
      />,
    )

    expect(screen.getByText(/notification is delegation/i)).toBeInTheDocument()
  })

  it('renders nothing when visible is false', () => {
    const { container } = render(
      <WhyWrongBox
        chosenText="B. Obtain consent"
        whyWrong={WHY_WRONG}
        visible={false}
      />,
    )

    expect(container.innerHTML).toBe('')
  })

  it('renders nothing when no explanation exists for chosen text', () => {
    const { container } = render(
      <WhyWrongBox
        chosenText="A. Administer Morphine"
        whyWrong={WHY_WRONG}
        visible={true}
      />,
    )

    expect(container.innerHTML).toBe('')
  })

  it('renders nothing for empty whyWrong map', () => {
    const { container } = render(
      <WhyWrongBox
        chosenText="B. Obtain consent"
        whyWrong={{}}
        visible={true}
      />,
    )

    expect(container.innerHTML).toBe('')
  })

  it('has visible class when displayed', () => {
    const { container } = render(
      <WhyWrongBox
        chosenText="B. Obtain consent"
        whyWrong={WHY_WRONG}
        visible={true}
      />,
    )

    const box = container.querySelector('.why-wrong-box')
    expect(box?.className).toContain('visible')
  })

  it('handles option text without label prefix', () => {
    render(
      <WhyWrongBox
        chosenText="Obtain consent"
        whyWrong={WHY_WRONG}
        visible={true}
      />,
    )

    expect(screen.getByText(/consent is a complication step/i)).toBeInTheDocument()
  })

  it('renders why-wrong-lbl element', () => {
    const { container } = render(
      <WhyWrongBox
        chosenText="D. Notify cardiologist"
        whyWrong={WHY_WRONG}
        visible={true}
      />,
    )

    const lbl = container.querySelector('.why-wrong-lbl')
    expect(lbl).toBeTruthy()
  })

  it('renders why-wrong-text element', () => {
    const { container } = render(
      <WhyWrongBox
        chosenText="D. Notify cardiologist"
        whyWrong={WHY_WRONG}
        visible={true}
      />,
    )

    const text = container.querySelector('.why-wrong-text')
    expect(text).toBeTruthy()
    expect(text?.textContent).toContain('Notification is delegation')
  })
})
