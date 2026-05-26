import 'server-only';

const ENDPOINT = 'https://api.expo.dev/graphql';

export async function easGraphQL<T>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  const token = process.env.EXPO_TOKEN;
  if (!token) throw new Error('EXPO_TOKEN not set in server env');

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`EAS GraphQL HTTP ${res.status}: ${await res.text()}`);
  }
  const json = (await res.json()) as { data?: T; errors?: Array<{ message: string }> };
  if (json.errors?.length) {
    throw new Error(`EAS GraphQL errors: ${json.errors.map((e) => e.message).join('; ')}`);
  }
  if (!json.data) throw new Error('EAS GraphQL returned no data');
  return json.data;
}
