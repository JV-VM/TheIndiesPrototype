import { ChangeDetectionStrategy, Component, inject } from "@angular/core";

import { NoticeService } from "../../core/ui/notice.service";

@Component({
  selector: "tip-notice-banner",
  standalone: true,
  template: `
    @if (noticeService.notice(); as notice) {
      <p
        class="notice-banner"
        [attr.data-tone]="notice.tone"
        [attr.role]="notice.tone === 'danger' ? 'alert' : 'status'"
        [attr.aria-live]="notice.tone === 'danger' ? 'assertive' : 'polite'"
      >
        {{ notice.text }}
      </p>
    }
  `,
  styleUrl: "./notice-banner.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NoticeBannerComponent {
  protected readonly noticeService = inject(NoticeService);
}
