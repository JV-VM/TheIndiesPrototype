import { Injectable } from "@angular/core";

const storageKey = "tip.frontend.access-token";

@Injectable({
  providedIn: "root"
})
export class TokenStorageService {
  read(): string | null {
    if (typeof window === "undefined") {
      return null;
    }

    return window.localStorage.getItem(storageKey);
  }

  write(token: string | null): void {
    if (typeof window === "undefined") {
      return;
    }

    if (token) {
      window.localStorage.setItem(storageKey, token);
      return;
    }

    window.localStorage.removeItem(storageKey);
  }
}
