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

export const AVATAR_OPTIONS: AvatarOption[] = [
  { id: DEFAULT_AVATAR_ID, emoji: null, label: 'Initial letter' },
  { id: 'nurse-w', emoji: '👩‍⚕️', label: 'Nurse' },
  { id: 'nurse-m', emoji: '👨‍⚕️', label: 'Nurse' },
  { id: 'nurse-n', emoji: '🧑‍⚕️', label: 'Nurse' },
  { id: 'stethoscope', emoji: '🩺', label: 'Stethoscope' },
  { id: 'heart', emoji: '🫀', label: 'Heart' },
  { id: 'brain', emoji: '🧠', label: 'Brain' },
  { id: 'lungs', emoji: '🫁', label: 'Lungs' },
  { id: 'flex', emoji: '💪', label: 'Strong' },
  { id: 'target', emoji: '🎯', label: 'Target' },
  { id: 'fire', emoji: '🔥', label: 'Fire' },
  { id: 'trophy', emoji: '🏆', label: 'Trophy' },
  { id: 'star', emoji: '⭐', label: 'Star' },
  { id: 'rocket', emoji: '🚀', label: 'Rocket' },
  { id: 'crown', emoji: '👑', label: 'Crown' },
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
