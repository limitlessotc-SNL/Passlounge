/**
 * Avatar Options
 *
 * Curated emoji-based avatars users can choose from in their profile.
 * Emojis render consistently across devices and look great on the dark
 * navy + gold theme without needing image hosting.
 *
 * The "letter" default falls back to the first character of the nickname.
 *
 * Owner: Junior Engineer 2
 */

export interface AvatarOption {
  /** Sentinel stored in user_metadata.avatar (empty string = default letter). */
  id: string;
  /** The emoji/glyph to render, or null for the default initial-letter avatar. */
  emoji: string | null;
  /** Human-readable label for accessibility and edit picker. */
  label: string;
}

export const DEFAULT_AVATAR_ID = ''

// All emoji are Unicode 12 or earlier to ensure consistent rendering
// on older Windows/browser fonts. (Unicode 13 glyphs like 🫀/🫁 and
// gender-neutral ZWJ sequences render as tofu boxes on many systems.)
export const AVATAR_OPTIONS: AvatarOption[] = [
  { id: DEFAULT_AVATAR_ID, emoji: null, label: 'Initial letter' },
  { id: 'nurse-w', emoji: '👩‍⚕️', label: 'Nurse (she)' },
  { id: 'nurse-m', emoji: '👨‍⚕️', label: 'Nurse (he)' },
  { id: 'stethoscope', emoji: '🩺', label: 'Stethoscope' },
  { id: 'pill', emoji: '💊', label: 'Pill' },
  { id: 'syringe', emoji: '💉', label: 'Syringe' },
  { id: 'dna', emoji: '🧬', label: 'DNA' },
  { id: 'test-tube', emoji: '🧪', label: 'Test tube' },
  { id: 'bandage', emoji: '🩹', label: 'Bandage' },
  { id: 'thermometer', emoji: '🌡️', label: 'Thermometer' },
  { id: 'hospital', emoji: '🏥', label: 'Hospital' },
  { id: 'brain', emoji: '🧠', label: 'Brain' },
  { id: 'heart', emoji: '❤️', label: 'Heart' },
  { id: 'bone', emoji: '🦴', label: 'Bone' },
  { id: 'tooth', emoji: '🦷', label: 'Tooth' },
  { id: 'flex', emoji: '💪', label: 'Strong' },
  { id: 'grad', emoji: '🎓', label: 'Graduate' },
  { id: 'trophy', emoji: '🏆', label: 'Champion' },
  { id: 'fire', emoji: '🔥', label: 'On fire' },
  { id: 'rocket', emoji: '🚀', label: 'Rocket' },
]

/**
 * Looks up an avatar option by id. Returns the default avatar if not found.
 */
export function getAvatarOption(id: string | undefined): AvatarOption {
  const found = AVATAR_OPTIONS.find((a) => a.id === (id ?? DEFAULT_AVATAR_ID))
  return found ?? AVATAR_OPTIONS[0]
}

/**
 * Returns the display glyph for a profile avatar, falling back to the
 * uppercase first letter of the nickname when avatar is the default.
 */
export function getAvatarDisplay(avatarId: string | undefined, nickname: string): string {
  const opt = getAvatarOption(avatarId)
  if (opt.emoji) return opt.emoji
  const letter = (nickname || 'N').charAt(0).toUpperCase()
  return letter
}

/**
 * Returns true if the given avatar id is the default letter avatar.
 */
export function isDefaultAvatar(avatarId: string | undefined): boolean {
  return (avatarId ?? DEFAULT_AVATAR_ID) === DEFAULT_AVATAR_ID
}
