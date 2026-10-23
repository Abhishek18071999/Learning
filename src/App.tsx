import { lazy, Suspense } from "react";
import { Layout } from "./components/Layout";
import { Home } from "./pages/Home";
import { LessonPage } from "./pages/LessonPage";
import { News } from "./pages/News";
import { Onboarding } from "./pages/Onboarding";
import { Cheatsheets, Debug, Glossary, Help, Interview, ModulePage, Progress, Project, Quiz, Revise, Roadmap, Settings } from "./pages/Pages";
import { match, query, useRoute } from "./lib/router";

// The Resources page carries hundreds of links, so it is its own chunk.
const Resources = lazy(() => import("./pages/Resources").then((m) => ({ default: m.Resources })));

export function App() {
  const route = useRoute();
  const q = query(route);
  const path = route.split("?")[0];

  let page;
  const lesson = match(route, "/lesson/:id");
  const moduleMatch = match(route, "/module/:id");
  if (lesson) page = <LessonPage id={lesson.id} section={q.get("s")} />;
  else if (moduleMatch) page = <ModulePage id={moduleMatch.id} />;
  else if (path === "/start") page = <Onboarding />;
  else if (path === "/roadmap") page = <Roadmap />;
  else if (path === "/revise") page = <Revise />;
  else if (path === "/quiz") page = <Quiz topic={q.get("topic")} />;
  else if (path === "/interview") page = <Interview lessonId={q.get("lesson")} />;
  else if (path === "/project") page = <Project />;
  else if (path === "/news") page = <News />;
  else if (path === "/resources") page = <Resources section={q.get("s")} course={q.get("c")} q={q.get("q")} />;
  else if (path === "/cheatsheet") page = <Cheatsheets topic={q.get("topic")} />;
  else if (path === "/glossary") page = <Glossary key={q.get("q") ?? ""} q={q.get("q")} />;
  else if (path === "/progress") page = <Progress />;
  else if (path === "/debug") page = <Debug />;
  else if (path === "/help") page = <Help />;
  else if (path === "/settings") page = <Settings />;
  else page = <Home />;

  return (
    <Layout>
      <Suspense fallback={<div className="page muted">Loading…</div>}>{page}</Suspense>
    </Layout>
  );
}
