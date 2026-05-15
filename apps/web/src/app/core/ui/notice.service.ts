import { Injectable, signal } from "@angular/core";

export type NoticeTone = "neutral" | "success" | "danger";

export interface NoticeState {
  text: string;
  tone: NoticeTone;
}

@Injectable({
  providedIn: "root"
})
export class NoticeService {
  readonly notice = signal<NoticeState | null>(null);

  setNeutral(text: string): void {
    this.notice.set({
      text,
      tone: "neutral"
    });
  }

  setSuccess(text: string): void {
    this.notice.set({
      text,
      tone: "success"
    });
  }

  setDanger(text: string): void {
    this.notice.set({
      text,
      tone: "danger"
    });
  }

  clear(): void {
    this.notice.set(null);
  }
}
