export const ADMIN_EMAILS: readonly string[] = [
  'rubinshai@gmail.com',
  'shai.rubin@xorcom.com',
  '770ganani@gmail.com',
  'tsanhan@gmail.com',
  'adraha.hatanim@gmail.com',
  'hassidut.gilo@gmail.com',
];

export function isAdminIdentity(email: string | null, verified: boolean, provider: string | null): boolean {
  return verified && provider === 'google.com' && email !== null && ADMIN_EMAILS.includes(email);
}
