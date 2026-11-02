import { TestBed } from '@angular/core/testing';
import { User } from '@angular/fire/auth';
import { ADMIN_EMAILS, isAdminIdentity } from './admin-access';
import { ADMIN_AUTH_API, AdminAuthApi, AdminAuthService } from './admin-auth.service';

describe('AdminAuthService', () => {
  let notify: (user: User | null) => void;
  let api: jasmine.SpyObj<AdminAuthApi>;
  let unsubscribe: jasmine.Spy;

  beforeEach(() => {
    unsubscribe = jasmine.createSpy('unsubscribe');
    api = jasmine.createSpyObj<AdminAuthApi>('AdminAuthApi', ['observe', 'signIn', 'signOut', 'checkAccess']);
    api.observe.and.callFake(callback => { notify = callback; return unsubscribe; });
    api.checkAccess.and.resolveTo(true);
    api.signIn.and.resolveTo(undefined);
    api.signOut.and.resolveTo();
    TestBed.configureTestingModule({ providers: [{ provide: ADMIN_AUTH_API, useValue: api }] });
  });

  function user(email: string, verified = true, provider = 'google.com'): User {
    return { email, emailVerified: verified,
      getIdTokenResult: async () => ({ signInProvider: provider }),
    } as User;
  }

  async function settle(): Promise<void> {
    // Allow the identity-token check and the subsequent server check to complete.
    for (let i = 0; i < 6; i++) await Promise.resolve();
  }

  for (const email of ADMIN_EMAILS) {
    it(`allows ${email} only after a successful server authorization check`, async () => {
      const service = TestBed.inject(AdminAuthService);
      notify(user(email));
      expect(service.state()).toBe('loading');
      await settle();
      expect(api.checkAccess).toHaveBeenCalledTimes(1);
      expect(service.state()).toBe('allowed');
      expect(service.email()).toBe(email);
    });
  }

  for (const identity of [
    user('outsider@gmail.com'),
    user(ADMIN_EMAILS[0], false),
    user(ADMIN_EMAILS[0], true, 'password'),
  ]) {
    it('denies an outsider, unverified email or non-Google login before requesting admin data', async () => {
      const service = TestBed.inject(AdminAuthService);
      notify(identity);
      await settle();
      expect(service.state()).toBe('denied');
      expect(api.checkAccess).not.toHaveBeenCalled();
    });
  }

  it('denies a listed identity when Firebase does not authorize it', async () => {
    api.checkAccess.and.rejectWith({ code: 'permission-denied' });
    const service = TestBed.inject(AdminAuthService);
    notify(user(ADMIN_EMAILS[0]));
    await settle();
    expect(service.state()).toBe('denied');
  });

  it('denies access when the server-side switch is missing or disabled', async () => {
    api.checkAccess.and.resolveTo(false);
    const service = TestBed.inject(AdminAuthService);
    notify(user(ADMIN_EMAILS[0]));
    await settle();
    expect(service.state()).toBe('denied');
  });

  it('keeps the admin screen locked when the authorization server is offline', async () => {
    api.checkAccess.and.rejectWith(new Error('offline'));
    const service = TestBed.inject(AdminAuthService);
    notify(user(ADMIN_EMAILS[0]));
    await settle();
    expect(service.state()).toBe('error');
    expect(service.error()).toBeTruthy();
  });

  it('does not restore an old authorization result after logout', async () => {
    let finish!: (value: boolean) => void;
    api.checkAccess.and.returnValue(new Promise(resolve => { finish = resolve; }));
    const service = TestBed.inject(AdminAuthService);
    notify(user(ADMIN_EMAILS[0]));
    await settle();
    await service.signOut();
    finish(true);
    await settle();
    expect(service.state()).toBe('signedOut');
    expect(service.email()).toBe('');
  });

  it('ignores an old authorization result after switching to an unauthorized account', async () => {
    let finish!: (value: boolean) => void;
    api.checkAccess.and.returnValue(new Promise(resolve => { finish = resolve; }));
    const service = TestBed.inject(AdminAuthService);
    notify(user(ADMIN_EMAILS[0]));
    await settle();
    notify(user('outsider@gmail.com'));
    finish(true);
    await settle();
    expect(service.state()).toBe('denied');
    expect(service.email()).toBe('outsider@gmail.com');
  });

  it('handles a cancelled Google popup without granting access', async () => {
    api.signIn.and.rejectWith({ code: 'auth/popup-closed-by-user' });
    const service = TestBed.inject(AdminAuthService);
    notify(null);
    await service.signIn();
    expect(service.state()).toBe('signedOut');
    expect(service.error()).toBe('');
    expect(service.busy()).toBeFalse();
  });

  it('reports blocked popups and stops observing when destroyed', async () => {
    api.signIn.and.rejectWith({ code: 'auth/popup-blocked' });
    const service = TestBed.inject(AdminAuthService);
    notify(null);
    await service.signIn();
    expect(service.error()).toContain('חלונות קופצים');
    TestBed.resetTestingModule();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('rejects empty identities and suffix lookalikes', () => {
    expect(isAdminIdentity(null, true, 'google.com')).toBeFalse();
    expect(isAdminIdentity('rubinshai@gmail.com.attacker.example', true, 'google.com')).toBeFalse();
    expect(ADMIN_EMAILS.length).toBe(6);
  });
});
