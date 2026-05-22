import 'server-only';
import { easGraphQL } from './client';
import { Build } from './schemas';
import { z } from 'zod';

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
