import { ApolloClient, from } from "@apollo/client/core";
import { InMemoryCache } from "@apollo/client/cache";
import { createHttpLink } from "@apollo/client/link/http";
import { setContext } from "@apollo/client/link/context";
import { getAccessToken } from "./axios";

const graphqlUri = (import.meta.env.VITE_API_URL ?? "https://localhost:7001/api/v1")
  .replace(/\/api\/v\d+.*$/, "") + "/graphql";

const httpLink = createHttpLink({
  uri: graphqlUri,
  credentials: "include",
});

const authLink = setContext((_, { headers }) => {
  const token = getAccessToken();
  return {
    headers: {
      ...headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
});

export const apolloClient = new ApolloClient({
  link: from([authLink, httpLink]),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: { fetchPolicy: "cache-and-network" },
  },
});
