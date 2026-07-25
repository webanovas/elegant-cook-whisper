import { createFileRoute, redirect } from "@tanstack/react-router";

// The books/shelf concept was replaced by a single library on "/".
// Redirect any old links there so bookmarks keep working.
export const Route = createFileRoute("/books/$id")({
  ssr: false,
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
  component: () => null,
});
