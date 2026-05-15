import { Routes } from "@angular/router";

import { authGuard } from "./core/auth/auth.guard";
import { guestGuard } from "./core/auth/guest.guard";
import { AppShellComponent } from "./core/layout/app-shell.component";

export const routes: Routes = [
  {
    path: "auth",
    canActivate: [guestGuard],
    loadComponent: () =>
      import("./features/auth/pages/auth-page.component").then(
        (module) => module.AuthPageComponent
      )
  },
  {
    path: "",
    canActivate: [authGuard],
    component: AppShellComponent,
    children: [
      {
        path: "",
        pathMatch: "full",
        redirectTo: "dashboard"
      },
      {
        path: "dashboard",
        loadComponent: () =>
          import(
            "./features/app-shell/pages/dashboard-page.component"
          ).then((module) => module.DashboardPageComponent)
      },
      {
        path: "projects",
        loadComponent: () =>
          import("./features/projects/pages/projects-page.component").then(
            (module) => module.ProjectsPageComponent
          )
      },
      {
        path: "jobs",
        loadComponent: () =>
          import("./features/jobs/pages/jobs-page.component").then(
            (module) => module.JobsPageComponent
          )
      }
    ]
  },
  {
    path: "**",
    redirectTo: "dashboard"
  }
];
