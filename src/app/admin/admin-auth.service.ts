import { DestroyRef, inject, Injectable, InjectionToken, Injector, NgZone, runInInjectionContext, signal } from '@angular/core';
import { Auth, GoogleAuthProvider, onIdTokenChanged, signInWithPopup, signOut, User } from '@angular/fire/auth';
import { doc, Firestore, getDocFromServer } from '@angular/fire/firestore';
import { isAdminIdentity } from './admin-access';

export interface AdminAuthApi {
  observe(callback: (user: User | null) => void): () => void;
  signIn(): Promise<unknown>;
  signOut(): Promise<void>;
  checkAccess(): Promise<boolean>;
}

export const ADMIN_AUTH_API = new InjectionToken<AdminAuthApi>('AdminAuthApi', {
  providedIn: 'root', factory: () => {
    const injector = inject(Injector);
    const auth = inject(Auth);
    return {
      observe: callback => runInInjectionContext(injector, () => onIdTokenChanged(auth, callback)),
      signIn: () => runInInjectionContext(injector, () => {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        return signInWithPopup(auth, provider);
      }),
      signOut: () => runInInjectionContext(injector, () => signOut(auth)),
      checkAccess: () => runInInjectionContext(injector, async () => {
        const snapshot = await getDocFromServer(doc(inject(Firestore), 'appAdmin/access'));
        return snapshot.exists() && snapshot.data()['enabled'] === true;
      }),
    };
  },
});

@Injectable({ providedIn: 'root' })
export class AdminAuthService {
  private readonly api = inject(ADMIN_AUTH_API);
  private readonly zone = inject(NgZone);
  private generation = 0;
  readonly state = signal<'loading' | 'signedOut' | 'allowed' | 'denied' | 'error'>('loading');
  readonly email = signal('');
  readonly error = signal('');
  readonly busy = signal(false);

  constructor() {
    const unsubscribe = this.api.observe(user => {
      void this.check(user);
    });
    inject(DestroyRef).onDestroy(() => { ++this.generation; unsubscribe(); });
  }

  private async check(user: User | null): Promise<void> {
    const generation = ++this.generation;
    this.zone.run(() => {
      this.email.set(user?.email ?? '');
      this.error.set('');
      this.state.set(user ? 'loading' : 'signedOut');
    });
    if (!user) return;
    try {
      const token = await user.getIdTokenResult();
      if (generation !== this.generation) return;
      const allowedIdentity = isAdminIdentity(user.email, user.emailVerified, token.signInProvider);
      const allowed = allowedIdentity && await this.api.checkAccess();
      if (generation !== this.generation) return;
      this.zone.run(() => this.state.set(allowed ? 'allowed' : 'denied'));
    } catch (error) {
      if (generation !== this.generation) return;
      this.zone.run(() => {
        const denied = (error as { code?: string })?.code === 'permission-denied';
        this.state.set(denied ? 'denied' : 'error');
        if (!denied) this.error.set('לא ניתן לאמת הרשאות כרגע. בדקו את החיבור ונסו שוב.');
      });
    }
  }

  async signIn(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      await this.api.signIn();
    } catch (error) {
      const code = (error as { code?: string })?.code;
      if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
        this.error.set(code === 'auth/popup-blocked'
          ? 'הדפדפן חסם את חלון הכניסה. אפשרו חלונות קופצים ונסו שוב.'
          : 'הכניסה לא הצליחה. נסו שוב.');
      }
    } finally {
      this.busy.set(false);
    }
  }

  async signOut(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      await this.api.signOut();
      ++this.generation;
      this.email.set('');
      this.state.set('signedOut');
      this.error.set('');
    } catch {
      this.error.set('ההתנתקות לא הצליחה. נסו שוב.');
    } finally {
      this.busy.set(false);
    }
  }
}
