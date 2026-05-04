import { useState } from "react";
import { RouterProvider } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { ApolloProvider } from "@apollo/client/react";
import { router } from "@/router";
import { queryClient } from "@/lib/queryClient";
import { apolloClient } from "@/lib/apollo";
import { SplashScreen } from "@/components/shared/SplashScreen";

export default function App() {
  const [splashDone, setSplashDone] = useState(false);

  return (
    <ApolloProvider client={apolloClient}>
      <QueryClientProvider client={queryClient}>
        {!splashDone && <SplashScreen onComplete={() => setSplashDone(true)} />}
        {splashDone && <RouterProvider router={router} />}
      </QueryClientProvider>
    </ApolloProvider>
  );
}
