// https://tanstack.com/start/latest/docs/framework/react/guide/client-entry-point
import { StartClient } from "@tanstack/react-start/client";
import { StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { enableMocking } from "./mocks";

enableMocking().then(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <StartClient />
    </StrictMode>,
  );
});
