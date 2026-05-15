import "@angular/compiler";

import assert from "node:assert/strict";
import test from "node:test";

import {
  createEnvironmentInjector,
  Injector,
  runInInjectionContext,
  type EnvironmentInjector,
  type Provider
} from "@angular/core";
import type { ProjectCollection, ProjectDetail } from "@tip/types";

import { ApiClientService } from "../src/app/core/http/api-client.service";
import { NoticeService } from "../src/app/core/ui/notice.service";
import { ProjectsWorkspaceService } from "../src/app/features/projects/projects-workspace.service";

function createHarness(payloads?: {
  collection?: ProjectCollection;
  details?: Record<string, ProjectDetail>;
}) {
  const collection =
    payloads?.collection ??
    ({
      items: [
        {
          id: "project_1",
          ownerId: "user_1",
          name: "Alpha",
          description: "Primary workspace",
          assetCount: 2,
          createdAt: "2026-05-15T18:00:00.000Z",
          updatedAt: "2026-05-15T18:00:00.000Z"
        },
        {
          id: "project_2",
          ownerId: "user_1",
          name: "Beta",
          description: "Secondary workspace",
          assetCount: 1,
          createdAt: "2026-05-15T18:30:00.000Z",
          updatedAt: "2026-05-15T18:30:00.000Z"
        }
      ],
      page: 1,
      pageSize: 6,
      totalItems: 2,
      totalPages: 1,
      query: ""
    } satisfies ProjectCollection);

  const details =
    payloads?.details ??
    Object.fromEntries(
      collection.items.map((project) => [project.id, { ...project }])
    );

  const notices: string[] = [];

  const providers: Provider[] = [
    {
      provide: ApiClientService,
      useValue: {
        projects: {
          list: async () => collection,
          get: async (projectId: string) => details[projectId],
          create: async () => {
            throw new Error("not implemented");
          },
          update: async () => {
            throw new Error("not implemented");
          },
          remove: async () => ({ ok: true })
        }
      }
    },
    {
      provide: NoticeService,
      useValue: {
        setDanger: (text: string) => {
          notices.push(text);
        },
        setSuccess: () => undefined
      }
    }
  ];

  const injector: EnvironmentInjector = createEnvironmentInjector(
    providers,
    Injector.NULL
  );
  const service = runInInjectionContext(
    injector,
    () => new ProjectsWorkspaceService()
  );

  return { injector, service, notices };
}

test("ProjectsWorkspaceService focuses the requested project and loads its detail", async () => {
  const harness = createHarness();

  try {
    await harness.service.loadProjects({
      focusProjectId: "project_2"
    });

    assert.equal(harness.service.selectedProjectId(), "project_2");
    assert.equal(harness.service.selectedProject()?.name, "Beta");
    assert.equal(harness.service.totalProjects(), 2);
    assert.deepEqual(harness.notices, []);
  } finally {
    harness.injector.destroy();
  }
});

test("ProjectsWorkspaceService clears the selection when the collection becomes empty", async () => {
  const harness = createHarness({
    collection: {
      items: [],
      page: 1,
      pageSize: 6,
      totalItems: 0,
      totalPages: 1,
      query: ""
    },
    details: {}
  });

  try {
    await harness.service.loadProjects();

    assert.equal(harness.service.selectedProjectId(), null);
    assert.equal(harness.service.selectedProject(), null);
    assert.equal(harness.service.totalProjects(), 0);
  } finally {
    harness.injector.destroy();
  }
});
