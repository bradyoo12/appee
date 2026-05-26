import 'server-only';
import { z } from 'zod';
import { easGraphQL } from './client';
import { Build } from './schemas';

const GET_BUILD_QUERY = /* GraphQL */ `
  query GetBuild($id: ID!) {
    builds {
      byId(buildId: $id) {
        id
        status
        platform
        createdAt
        completedAt
        artifacts {
          buildUrl
        }
        project {
          ... on App {
            id
            name
            slug
          }
        }
      }
    }
  }
`;

const GetBuildResponse = z.object({
  builds: z.object({
    byId: Build,
  }),
});

export async function getBuild(buildId: string): Promise<Build> {
  const data = await easGraphQL<unknown>(GET_BUILD_QUERY, { id: buildId });
  return GetBuildResponse.parse(data).builds.byId;
}
