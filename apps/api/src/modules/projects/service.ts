import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  AssetStatusCounts,
  CreateProjectInput,
  ProjectCollection,
  ProjectDetail,
  ProjectSummary,
  UpdateProjectInput
} from "@tip/types";

import { HttpError } from "../../http/errors.js";
import type { ListProjectsQuery } from "./schemas.js";

export class ProjectsService {
  constructor(
    private readonly prisma: Pick<PrismaClient, "project" | "asset">
  ) {}

  async listProjects(
    ownerId: string,
    filters: ListProjectsQuery
  ): Promise<ProjectCollection> {
    const where: Prisma.ProjectWhereInput = {
      userId: ownerId
    };

    if (filters.query) {
      where.OR = [
        {
          name: {
            contains: filters.query,
            mode: "insensitive"
          }
        },
        {
          description: {
            contains: filters.query,
            mode: "insensitive"
          }
        }
      ];
    }

    const [totalItems, projects] = await Promise.all([
      this.prisma.project.count({ where }),
      this.prisma.project.findMany({
        where,
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize,
        include: {
          _count: {
            select: {
              assets: true
            }
          }
        }
      })
    ]);

    const statusCounts = await this.buildStatusCounts(
      ownerId,
      projects.map((project) => project.id)
    );

    return {
      items: projects.map((project) =>
        mapProjectSummary(
          project,
          statusCounts[project.id] ?? createEmptyCounts()
        )
      ),
      page: filters.page,
      pageSize: filters.pageSize,
      totalItems,
      totalPages: toTotalPages(totalItems, filters.pageSize),
      query: filters.query
    };
  }

  async createProject(
    ownerId: string,
    input: CreateProjectInput
  ): Promise<ProjectDetail> {
    const project = await this.prisma.project.create({
      data: {
        userId: ownerId,
        name: input.name,
        description: input.description ?? null
      },
      include: {
        _count: {
          select: {
            assets: true
          }
        }
      }
    });

    return mapProjectSummary(project, createEmptyCounts());
  }

  async getProject(ownerId: string, projectId: string): Promise<ProjectDetail> {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        userId: ownerId
      },
      include: {
        _count: {
          select: {
            assets: true
          }
        }
      }
    });

    if (!project) {
      throw new HttpError(404, "Project was not found.", "project_not_found");
    }

    const statusCounts = await this.buildStatusCounts(ownerId, [project.id]);

    return mapProjectSummary(
      project,
      statusCounts[project.id] ?? createEmptyCounts()
    );
  }

  async updateProject(
    ownerId: string,
    projectId: string,
    input: UpdateProjectInput
  ): Promise<ProjectDetail> {
    await this.ensureOwnedProject(ownerId, projectId);

    const project = await this.prisma.project.update({
      where: {
        id: projectId
      },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined
          ? {
              description: input.description
            }
          : {})
      },
      include: {
        _count: {
          select: {
            assets: true
          }
        }
      }
    });

    const statusCounts = await this.buildStatusCounts(ownerId, [project.id]);

    return mapProjectSummary(
      project,
      statusCounts[project.id] ?? createEmptyCounts()
    );
  }

  async deleteProject(
    ownerId: string,
    projectId: string
  ): Promise<{ deletedProjectId: string }> {
    await this.ensureOwnedProject(ownerId, projectId);

    await this.prisma.project.delete({
      where: {
        id: projectId
      }
    });

    return {
      deletedProjectId: projectId
    };
  }

  private async ensureOwnedProject(
    ownerId: string,
    projectId: string
  ): Promise<void> {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        userId: ownerId
      },
      select: {
        id: true
      }
    });

    if (!project) {
      throw new HttpError(404, "Project was not found.", "project_not_found");
    }
  }

  private async buildStatusCounts(
    ownerId: string,
    projectIds: string[]
  ): Promise<Record<string, AssetStatusCounts>> {
    if (projectIds.length === 0) {
      return {};
    }

    const groups = await this.prisma.asset.groupBy({
      by: ["projectId", "status"] as const,
      where: {
        userId: ownerId,
        projectId: {
          in: projectIds
        }
      },
      _count: {
        _all: true
      }
    });

    const countsByProject = projectIds.reduce<
      Record<string, AssetStatusCounts>
    >((accumulator, projectId) => {
      accumulator[projectId] = createEmptyCounts();
      return accumulator;
    }, {});

    for (const group of groups) {
      const projectCounts =
        countsByProject[group.projectId] ?? createEmptyCounts();
      countsByProject[group.projectId] = projectCounts;

      switch (group.status) {
        case "draft":
          projectCounts.draft = group._count._all;
          break;
        case "uploaded":
          projectCounts.uploaded = group._count._all;
          break;
        case "queued":
          projectCounts.queued = group._count._all;
          break;
        case "processing":
          projectCounts.processing = group._count._all;
          break;
        case "completed":
          projectCounts.completed = group._count._all;
          break;
        case "failed":
          projectCounts.failed = group._count._all;
          break;
      }
      projectCounts.total += group._count._all;
    }

    return countsByProject;
  }
}

function createEmptyCounts(): AssetStatusCounts {
  return {
    draft: 0,
    uploaded: 0,
    queued: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    total: 0
  };
}

function mapProjectSummary(
  project: {
    id: string;
    name: string;
    description: string | null;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
    _count: {
      assets: number;
    };
  },
  assetStatusCounts: AssetStatusCounts
): ProjectSummary {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    ownerId: project.userId,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    assetCount: project._count.assets,
    assetStatusCounts: {
      ...assetStatusCounts,
      total: project._count.assets
    }
  };
}

function toTotalPages(totalItems: number, pageSize: number): number {
  return totalItems === 0 ? 1 : Math.ceil(totalItems / pageSize);
}
