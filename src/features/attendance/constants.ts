/**
 * 16 Beloved Dicebear Bottts avatar presets.
 */
export const AVATARS = [
    'https://api.dicebear.com/7.x/bottts/svg?seed=Tiger&backgroundColor=ff8c00',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Lion&backgroundColor=ffd700',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Cat&backgroundColor=b0c4de',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Dog&backgroundColor=ffa07a',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Rabbit&backgroundColor=ffc0cb',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Fox&backgroundColor=ff4500',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Bear&backgroundColor=8b4513',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Panda&backgroundColor=ffffff',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Wolf&backgroundColor=708090',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Owl&backgroundColor=9370db',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Elephant&backgroundColor=dda0dd',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Eagle&backgroundColor=f0e68c',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Koala&backgroundColor=a9a9a9',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Penguin&backgroundColor=00bfff',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Monkey&backgroundColor=cd853f',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Frog&backgroundColor=32cd32',
] as const;

export const getDicebearAvatar = (seed: string): string =>
    `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(seed || 'Student')}`;
